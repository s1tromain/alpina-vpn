import { buildApp } from "./app.js";
import { env } from "./config/env.js";

/**
 * Process entrypoint. Boots Fastify and installs graceful-shutdown hooks
 * for SIGTERM/SIGINT so containers can drain in-flight requests.
 *
 * Shutdown sequence:
 *   1. signal received  → set isShuttingDown so health/db reports 503
 *      (orchestrator stops routing new traffic before draining starts).
 *   2. app.close()      → stops accepting new connections, waits for
 *      in-flight handlers + onClose hooks (Prisma disconnect) to finish.
 *   3. force-exit timer (10s) — if app.close() hangs, log + exit hard
 *      so the orchestrator can replace the pod.
 *
 *   uncaughtException / unhandledRejection are routed through the same
 *   path but exit with code 1.
 */
const FORCE_EXIT_TIMEOUT_MS = 10_000;

/**
 * Boot-time checkout invariant. `OrdersService.create` requires BOTH an
 * active payment requisite AND an active country; without them every
 * purchase silently dead-ends (the Mini App blocks before the POST is even
 * sent). We refuse to boot in that state so a misconfigured deploy is
 * impossible to miss instead of looking healthy while no one can pay.
 */
async function assertCheckoutReady(
  app: Awaited<ReturnType<typeof buildApp>>,
): Promise<void> {
  const [activeRequisites, activeCountries] = await Promise.all([
    app.prisma.paymentRequisite.count({
      where: { active: true, deletedAt: null },
    }),
    app.prisma.country.count({ where: { active: true } }),
  ]);

  const problems: string[] = [];
  if (activeRequisites === 0) {
    problems.push(
      "no active PaymentRequisite — checkout cannot create orders (add one via /admin/requisites or run `npm run db:seed`)",
    );
  }
  if (activeCountries === 0) {
    problems.push(
      "no active Country — order creation fails with 'No active region is configured'",
    );
  }

  if (problems.length > 0) {
    app.log.fatal(
      { activeRequisites, activeCountries },
      `checkout_misconfigured: ${problems.join("; ")}`,
    );
    throw new Error(`Checkout misconfigured: ${problems.join("; ")}`);
  }

  app.log.info({ activeRequisites, activeCountries }, "checkout_ready");
}

async function main() {
  const app = await buildApp();

  // Fail loudly before accepting traffic if the catalogue can't support a
  // purchase. Keeps a half-provisioned deploy from looking healthy.
  try {
    await assertCheckoutReady(app);
  } catch (err) {
    app.log.fatal({ err }, "startup_aborted_checkout_misconfigured");
    await app.close().catch(() => {});
    process.exit(1);
  }

  let isShuttingDown = false;

  const shutdown = async (reason: string, exitCode: 0 | 1) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    app.log.info({ reason }, "shutdown_started");

    const forceExit = setTimeout(() => {
      app.log.fatal({ reason }, "shutdown_force_exit_timeout");
      process.exit(exitCode === 0 ? 124 : 1);
    }, FORCE_EXIT_TIMEOUT_MS);
    forceExit.unref();

    try {
      await app.close();
      app.log.info({ reason }, "shutdown_complete");
      process.exit(exitCode);
    } catch (err) {
      app.log.error({ err, reason }, "shutdown_error");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM", 0));
  process.on("SIGINT", () => void shutdown("SIGINT", 0));

  process.on("uncaughtException", (err) => {
    app.log.fatal({ err }, "uncaught_exception");
    void shutdown("uncaughtException", 1);
  });
  process.on("unhandledRejection", (reason) => {
    // Don't crash on a single unhandled rejection — log it and keep
    // serving. Node will eventually escalate to uncaughtException if the
    // process is genuinely broken.
    app.log.error({ reason }, "unhandled_rejection");
  });

  try {
    const address = await app.listen({ host: env.HOST, port: env.PORT });
    app.log.info({ address, env: env.NODE_ENV }, "server_listening");
  } catch (err) {
    app.log.error({ err }, "listen_failed");
    process.exit(1);
  }
}

void main();
