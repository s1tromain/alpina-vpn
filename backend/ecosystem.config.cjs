/**
 * PM2 process definition for the Fastify backend.
 *
 * Usage (on the VPS, in /opt/alpinavpn/backend):
 *
 *   npm ci --omit=dev
 *   npx prisma generate
 *   npx prisma migrate deploy
 *   npm run build
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save && pm2 startup            # persist across reboot
 *
 *  - `instances: 1` is deliberate: the in-process subscription expiry +
 *    reminder sweeps would run N times per cycle under cluster mode, and
 *    the Telegram polling client must not be opened twice against the
 *    same bot token. Promote to a dedicated worker process before
 *    scaling horizontally.
 *  - `wait_ready: true` + `listen_timeout` lets PM2 honour Fastify's
 *    graceful start; combined with `kill_timeout` the rollouts are
 *    truly zero-downtime under SIGTERM.
 *  - Logs are rotated by `pm2 install pm2-logrotate` — see DEPLOYMENT.md.
 */
module.exports = {
  apps: [
    {
      name: "alpinavpn-backend",
      script: "dist/server.js",
      cwd: __dirname,
      exec_mode: "fork",
      instances: 1,
      // Pino logs JSON to stdout — let PM2 own the file sink.
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      merge_logs: true,
      time: true,
      // SIGTERM → graceful shutdown via server.ts; give it the full
      // FORCE_EXIT_TIMEOUT_MS window before PM2 kills the process.
      kill_timeout: 12000,
      wait_ready: false,
      listen_timeout: 10000,
      max_memory_restart: "512M",
      restart_delay: 3000,
      max_restarts: 20,
      autorestart: true,
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
