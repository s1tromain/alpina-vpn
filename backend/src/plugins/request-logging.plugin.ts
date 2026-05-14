import fp from "fastify-plugin";

/**
 * Per-request audit line on response. Fastify already logs the incoming
 * request via its built-in request logger; this plugin adds the matching
 * completion line with response time, status, and the resolved route URL
 * (not the raw path) so /orders/:id collapses into one log group.
 *
 * Also echoes the request id back to the client as `x-request-id`, which
 * lets users include it when reporting bugs.
 */
export const requestLoggingPlugin = fp(async (app) => {
  app.addHook("onResponse", async (req, reply) => {
    // reply.elapsedTime is ms since Fastify started processing the request.
    const elapsed = Math.round(reply.elapsedTime);
    req.log.info(
      {
        reqId: req.id,
        method: req.method,
        url: req.url,
        route: req.routeOptions?.url ?? req.url,
        statusCode: reply.statusCode,
        durationMs: elapsed,
        ip: req.ip,
        userId: req.user?.id,
      },
      "request_completed",
    );
  });

  app.addHook("onSend", async (req, reply, payload) => {
    reply.header("x-request-id", req.id);
    return payload;
  });
});
