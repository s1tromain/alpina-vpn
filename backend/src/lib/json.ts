/**
 * Prisma returns BigInt for some columns (telegramId, traffic). JSON.stringify
 * can't serialize BigInt without help — Fastify uses fast-json-stringify, but
 * for ad-hoc serialization we patch the prototype once.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export {};
