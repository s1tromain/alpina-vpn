import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { PrismaClient, Receipt } from "@prisma/client";
import { env } from "../../config/env.js";
import {
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
  ValidationError,
} from "../../lib/errors.js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export interface ReceiptUpload {
  buffer: Buffer;
  mimeType: string;
  /** Original filename from the multipart part (informational only). */
  originalName?: string;
}

/**
 * Receipts live on the local filesystem under RECEIPTS_STORAGE_DIR, sharded
 * by orderId. We deliberately keep them off any public CDN — admins fetch
 * them through an authenticated route, never via a guessable URL.
 *
 * Storage layout:
 *   <RECEIPTS_STORAGE_DIR>/<orderId>/<sha256-prefix>.<ext>
 *
 * Idempotency: the filename is derived from the SHA-256, so re-uploading
 * the same image yields the same row (we look it up by checksum + orderId).
 */
export class ReceiptsService {
  constructor(private readonly prisma: PrismaClient) {}

  async uploadForOrder(args: {
    orderId: string;
    userId: string;
    upload: ReceiptUpload;
  }): Promise<Receipt> {
    const order = await this.prisma.order.findUnique({
      where: { id: args.orderId },
      include: { user: true, plan: true, country: true },
    });
    if (!order) throw new NotFoundError("Order", args.orderId);
    if (order.userId !== args.userId) throw new ForbiddenError();
    if (order.status !== "pending" && order.status !== "processing") {
      throw new UnprocessableError(
        `Cannot attach a receipt to an order in status "${order.status}"`,
      );
    }

    if (!ALLOWED_MIME_TYPES.has(args.upload.mimeType)) {
      throw new ValidationError(
        `Unsupported file type "${args.upload.mimeType}". Allowed: ${Array.from(
          ALLOWED_MIME_TYPES,
        ).join(", ")}`,
      );
    }
    if (args.upload.buffer.length === 0) {
      throw new ValidationError("Empty file");
    }
    if (args.upload.buffer.length > env.RECEIPTS_MAX_BYTES) {
      throw new ValidationError(
        `File exceeds ${env.RECEIPTS_MAX_BYTES} byte limit`,
      );
    }

    const checksum = crypto
      .createHash("sha256")
      .update(args.upload.buffer)
      .digest("hex");

    // Dedupe: if this exact byte-blob is already attached to the order,
    // return the existing row instead of writing a second copy. Saves disk
    // and lets the bot's moderation channel show one clean card.
    const existing = await this.prisma.receipt.findFirst({
      where: { orderId: args.orderId, checksum },
    });
    if (existing) return existing;

    const ext = EXT_BY_MIME[args.upload.mimeType];
    if (!ext) {
      throw new ValidationError(`Unsupported mime type: ${args.upload.mimeType}`);
    }
    const relPath = path.join(args.orderId, `${checksum.slice(0, 16)}.${ext}`);
    const absDir = path.resolve(env.RECEIPTS_STORAGE_DIR, args.orderId);
    const absPath = path.resolve(env.RECEIPTS_STORAGE_DIR, relPath);

    await fs.mkdir(absDir, { recursive: true });
    // `wx` ensures we don't silently overwrite a concurrent upload of the
    // same checksum. EEXIST is a safe race — the file is already there.
    try {
      await fs.writeFile(absPath, args.upload.buffer, { flag: "wx" });
    } catch (err: unknown) {
      if (!(err instanceof Error) || (err as NodeJS.ErrnoException).code !== "EEXIST") {
        throw err;
      }
    }

    // ── DB writes: transition order → processing, create receipt row,
    // notify user, audit. Each subsequent piece commits only if the prior
    // one did; the file on disk is fine if we crash midway — orphan
    // cleanup can be a future cron job.
    return this.prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          orderId: args.orderId,
          storagePath: relPath.split(path.sep).join("/"),
          mimeType: args.upload.mimeType,
          sizeBytes: args.upload.buffer.length,
          checksum,
        },
      });

      // Bump the order into 'processing' (the user has now provided proof).
      if (order.status === "pending") {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "processing" },
        });
      }

      await tx.notification.create({
        data: {
          userId: order.userId,
          kind: "order_processing",
          titleKey: "notifications.orderProcessing.title",
          bodyKey: "notifications.orderProcessing.body",
          payload: { orderId: order.id, receiptId: receipt.id },
        },
      });

      await tx.adminAction.create({
        data: {
          actorId: order.userId,
          kind: "receipt_upload",
          targetType: "order",
          targetId: order.id,
          metadata: {
            receiptId: receipt.id,
            sizeBytes: args.upload.buffer.length,
            mimeType: args.upload.mimeType,
            checksum,
          },
        },
      });

      return receipt;
    });
  }

  async listForOrder(orderId: string): Promise<Receipt[]> {
    return this.prisma.receipt.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Resolve a receipt + verified file blob for the admin file-fetch route. */
  async readFile(receiptId: string): Promise<{ receipt: Receipt; data: Buffer }> {
    const receipt = await this.prisma.receipt.findUnique({ where: { id: receiptId } });
    if (!receipt) throw new NotFoundError("Receipt", receiptId);

    // Path-traversal guard. Reject any storagePath that, when resolved
    // against the configured base dir, escapes it. The upload code only
    // ever writes `<orderId>/<hash>.<ext>` so a tampered DB row is the
    // realistic threat — we still defend against it.
    const baseDir = path.resolve(env.RECEIPTS_STORAGE_DIR);
    const absPath = path.resolve(baseDir, receipt.storagePath);
    const relativeFromBase = path.relative(baseDir, absPath);
    if (
      relativeFromBase.startsWith("..") ||
      path.isAbsolute(relativeFromBase) ||
      relativeFromBase.split(path.sep).some((seg) => seg === "..")
    ) {
      throw new ValidationError("Receipt storage path is outside the receipts root");
    }

    const data = await fs.readFile(absPath);

    // Re-verify checksum on read — protects against silent disk corruption
    // and any post-upload tampering. Mismatch = 5xx, not a 4xx, because
    // the row itself is fine and the issue is operational.
    const verifyHash = crypto
      .createHash("sha256")
      .update(data)
      .digest("hex");
    if (verifyHash !== receipt.checksum) {
      throw new Error(
        `Receipt ${receipt.id} checksum mismatch — file may be corrupted`,
      );
    }

    return { receipt, data };
  }
}
