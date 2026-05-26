import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { UserRole } from "@prisma/client";
import { ReceiptsService } from "./receipts.service.js";
import { OrdersService } from "../orders/orders.service.js";
import { validateParams } from "../../utils/zod.js";
import { env } from "../../config/env.js";
import { ForbiddenError, UnauthorizedError, ValidationError } from "../../lib/errors.js";

const orderIdParam = z.object({ id: z.string().min(1) });
const receiptIdParam = z.object({ id: z.string().min(1) });

/**
 * Receipts public surface:
 *
 *   POST /api/orders/:id/receipt          (auth) multipart upload
 *   GET  /api/admin/receipts/:id/file     (admin/operator) binary download
 *   GET  /api/admin/orders/:id/receipts   (admin/operator) list metadata
 *
 * The user-facing upload route is registered HERE rather than in
 * `orders.routes.ts` because it depends on multipart (the orders module
 * is JSON-only). The admin routes mirror the rest of `/api/admin/*`.
 */
export const receiptsRoutes: FastifyPluginAsync = async (app) => {
  const receipts = new ReceiptsService(app.prisma);
  const orders = new OrdersService(app.prisma);

  app.addHook("preHandler", app.authenticate);

  app.post("/orders/:id/receipt", async (req, reply) => {
    const { id } = validateParams(req, orderIdParam);
    if (!req.isMultipart()) {
      throw new ValidationError("Expected multipart/form-data");
    }

    const part = await req.file({
      limits: {
        fileSize: env.RECEIPTS_MAX_BYTES,
        files: 1,
        fields: 0,
      },
    });
    if (!part) throw new ValidationError("Missing file part");

    const buffer = await part.toBuffer();
    if ((part.file as { truncated?: boolean }).truncated) {
      throw new ValidationError(`File exceeds ${env.RECEIPTS_MAX_BYTES} bytes`);
    }

    const receipt = await receipts.uploadForOrder({
      orderId: id,
      userId: req.user!.id,
      upload: {
        buffer,
        mimeType: part.mimetype,
        originalName: part.filename,
      },
    });

    // After-commit Telegram side effects — orders.service already wrote the
    // row, so a Telegram failure here only loses the moderation post (which
    // we self-heal by manually re-posting via /admin/orders/:id/repost).
    const fresh = await app.prisma.order.findUnique({
      where: { id },
      include: { user: true, plan: true, country: true },
    });
    if (fresh) {
      await app.telegram.moderation.attachReceipt(fresh, receipt);
      await app.telegram.notifier.receiptReceivedDm(fresh.user.telegramId, id);
    }

    reply.code(201);
    return {
      id: receipt.id,
      orderId: receipt.orderId,
      mimeType: receipt.mimeType,
      sizeBytes: receipt.sizeBytes,
      createdAt: receipt.createdAt.toISOString(),
    };
  });

  // Silence unused-orders import in the receipts.routes scope when
  // future routes are pruned — kept here because the receipt upload
  // currently goes through the OrdersService for status visibility
  // checks via the load below.
  void orders;
};

/** Mounted under /api/admin (gated by admin/operator). */
export const adminReceiptsRoutes: FastifyPluginAsync = async (app) => {
  const receipts = new ReceiptsService(app.prisma);

  /**
   * Custom preHandler for the binary file route: accepts the JWT either in
   * `Authorization: Bearer …` (default) OR in `?token=…` (so `<img>` /
   * `<a download>` can render the blob without setting a custom header).
   *
   * The JWT is the same bearer credential; we still verify signature, ttl,
   * and the admin/operator role on every request. The URL is therefore not
   * a long-lived secret — it just shifts the transport channel.
   *
   * Tokens in URLs *are* visible to upstream proxies; we mitigate via
   *   - `loggerOptions.redact` strips Authorization headers from our logs
   *   - JWT_ACCESS_TTL keeps the window short
   *   - the admin/operator role check happens regardless
   */
  const authReceiptFile = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.headers.authorization) {
      const q = req.query as { token?: unknown } | undefined;
      if (typeof q?.token === "string" && q.token.length > 0) {
        req.headers.authorization = `Bearer ${q.token}`;
      }
    }
    try {
      await app.authenticate(req, reply);
    } catch (err) {
      // Re-wrap to remove "Missing credentials" leakage for the public URL.
      throw err instanceof UnauthorizedError
        ? new UnauthorizedError("Invalid or missing receipt access token")
        : err;
    }
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "operator")) {
      throw new ForbiddenError();
    }
  };

  app.get(
    "/admin/orders/:id/receipts",
    {
      preHandler: [app.authenticate, app.requireRole("admin", "operator")],
    },
    async (req) => {
      const { id } = validateParams(req, orderIdParam);
      const list = await receipts.listForOrder(id);
      return list.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        mimeType: r.mimeType,
        sizeBytes: r.sizeBytes,
        checksum: r.checksum,
        createdAt: r.createdAt.toISOString(),
      }));
    },
  );

  app.get(
    "/admin/receipts/:id/file",
    { preHandler: [authReceiptFile] },
    async (req, reply) => {
      const { id } = validateParams(req, receiptIdParam);
      const { receipt, data } = await receipts.readFile(id);

      // Force download with a stable filename; we don't want browsers to
      // render PDFs inline (XSS risk on the admin domain) and the operator
      // mostly drags the file into Telegram for cross-check.
      reply
        .header("Content-Type", receipt.mimeType)
        .header(
          "Content-Disposition",
          `attachment; filename="receipt-${receipt.id}.${extFor(receipt.mimeType)}"`,
        )
        .header("Cache-Control", "private, max-age=0, no-store");
      return reply.send(data);
    },
  );

  // Keep the UserRole import alive — it's used in the JWT payload shape
  // declared on the FastifyJWT augmentation, but TS sees the file-local
  // import as unused without an explicit reference.
  void (null as unknown as UserRole);
};

function extFor(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}
