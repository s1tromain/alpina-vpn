# Alpina VPN — VPS deployment (Ubuntu 24.04 LTS)

End-to-end guide to running the full stack on a single Ubuntu 24 VPS:
**nginx + frontend + backend + Postgres**, with TLS from Let's Encrypt.

Assumptions:

- A clean Ubuntu 24.04 VPS with a public IPv4.
- A domain you control. The Mini App URL will be `https://<domain>` and
  the API is served from `https://<domain>/api/*`.
- You have a Telegram bot token from [@BotFather](https://t.me/BotFather)
  and have set the Web App URL to `https://<domain>` via `/setdomain`.

---

## 0. DNS

Point `A` (and `AAAA` if you have IPv6) records for your domain at the
VPS IP. Wait for propagation (`dig +short <domain>`) before continuing —
TLS issuance will fail otherwise.

---

## 1. Initial server hardening

```bash
ssh root@<server-ip>

# Create a non-root user
adduser ghost
usermod -aG sudo ghost
rsync -a ~/.ssh /home/ghost/ && chown -R ghost:ghost /home/ghost/.ssh

# Disable root SSH + password auth
sed -i 's/^#\?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/^#\?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl reload ssh

# System patches
apt-get update && apt-get -y upgrade
```

Re-login as `ghost` (`ssh ghost@<server-ip>`).

### Firewall (UFW)

```bash
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status verbose
```

### Fail2ban (optional but recommended)

```bash
sudo apt-get install -y fail2ban
sudo systemctl enable --now fail2ban
```

---

## 2. Install Docker

Use Docker's official repo (`apt`'s `docker.io` is older).

```bash
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker $USER
newgrp docker     # picks up the group without logging out
docker compose version
```

---

## 3. Clone + configure

```bash
sudo mkdir -p /srv && sudo chown $USER:$USER /srv
cd /srv
git clone <your-repo-url> alpinavpn
cd alpinavpn

# Frontend env
cp .env.example .env

# Backend env
cp backend/.env.example backend/.env
```

Edit `/srv/alpinavpn/.env` and `/srv/alpinavpn/backend/.env`. The minimum
required values:

### `.env` (frontend + compose-level)

```dotenv
PUBLIC_FRONTEND_ORIGIN=https://<domain>
POSTGRES_USER=alpinavpn
POSTGRES_PASSWORD=<long-random-string>
POSTGRES_DB=alpinavpn

TELEGRAM_BOT_TOKEN=<from BotFather>
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=<bot-username-without-@>
NEXT_PUBLIC_SUPPORT_HANDLE=alpinavpn_support

JWT_SECRET=<openssl rand -hex 32>
JWT_ACCESS_TTL=7d
BOOTSTRAP_ADMIN_TELEGRAM_IDS=<your-telegram-numeric-id>

VPN_PROVIDER=mock     # switch to "marzban" once nodes are live

ADMIN_ALLOWED_TELEGRAM_IDS=<your-telegram-numeric-id>
```

### `backend/.env`

This file is **not loaded by Compose** — backend reads it directly when
running outside Docker. The Compose stack supplies the same values via
the top-level `.env`. Keeping `backend/.env` populated is still useful
for local non-Docker dev (`npm run dev`).

Generate a strong secret:

```bash
openssl rand -hex 32
```

---

## 4. First TLS issuance (Let's Encrypt)

The shipped `nginx/conf.d/alpinavpn.conf` starts with **only the HTTP
server** enabled so that certbot's http-01 challenge can succeed before
any HTTPS server tries to bind to certs that don't exist yet.

```bash
# Replace the placeholder domain in the nginx config
sed -i 's/_yourdomain.example_/<your-domain>/g' nginx/conf.d/alpinavpn.conf

# Bring up nginx (HTTP only) so certbot can answer the challenge
docker compose up -d nginx postgres backend frontend

# Issue the cert. --staging first to validate, then real.
docker compose run --rm certbot certonly --webroot -w /var/www/certbot \
  -d <your-domain> --email <you@example.com> --agree-tos --no-eff-email --staging

# If staging succeeded, repeat WITHOUT --staging
docker compose run --rm certbot certonly --webroot -w /var/www/certbot \
  -d <your-domain> --email <you@example.com> --agree-tos --no-eff-email --force-renewal
```

Then **uncomment the HTTPS `server { … }` block** in
`nginx/conf.d/alpinavpn.conf` and reload:

```bash
docker compose exec nginx nginx -t       # validate config
docker compose exec nginx nginx -s reload
```

Renewal: the `certbot` service loops `certbot renew` every 12 h and
reloads nginx when a cert changes. No cron entry required.

---

## 5. Bring up the stack

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend         # watch boot logs
```

The backend container runs `prisma migrate deploy` on start. Seed the
catalogue (plans, countries, sample servers):

```bash
docker compose exec backend npx tsx prisma/seed.ts
```

Hit the health endpoints:

```bash
curl -fsS https://<domain>/health
curl -fsS https://<domain>/health/db
```

Both should return `{"status":"ok",...}`. The Mini App is live at
`https://<domain>` — open it via your bot in Telegram.

---

## 6. Telegram bot configuration

In BotFather:

```
/setdomain      → <domain>            (required for Web App login URL)
/setmenubutton  → Open Alpina VPN | https://<domain>
/setcommands    → start - Open the Mini App
```

If you use a separate API origin (e.g. `api.<domain>`), instead leave
`NEXT_PUBLIC_API_URL=https://api.<domain>` and set `CORS_ORIGINS` on the
backend to include `https://<domain>`.

---

## 7. Backups

### Database

A daily `pg_dump` to `/srv/alpinavpn/backups/`:

```bash
sudo mkdir -p /srv/alpinavpn/backups
sudo tee /usr/local/bin/alpinavpn-backup.sh > /dev/null <<'SH'
#!/usr/bin/env bash
set -euo pipefail
ts=$(date -u +%Y%m%dT%H%M%SZ)
out=/srv/alpinavpn/backups/alpinavpn-${ts}.sql.gz
docker compose -f /srv/alpinavpn/docker-compose.yml exec -T postgres \
  pg_dump -U alpinavpn alpinavpn | gzip -9 > "$out"
# Keep last 30 days
find /srv/alpinavpn/backups -name 'alpinavpn-*.sql.gz' -mtime +30 -delete
SH
sudo chmod +x /usr/local/bin/alpinavpn-backup.sh

# Cron at 03:30 UTC daily
echo "30 3 * * * root /usr/local/bin/alpinavpn-backup.sh" | sudo tee /etc/cron.d/alpinavpn-backup
```

Off-site the backups (rsync, S3, restic) — a backup that lives only on
the same VPS is not a backup.

### Restore

```bash
gunzip -c alpinavpn-<ts>.sql.gz | \
  docker compose exec -T postgres psql -U alpinavpn -d alpinavpn
```

---

## 8. Updating

```bash
cd /srv/alpinavpn
git pull
docker compose build --pull
docker compose up -d
docker compose logs -f backend | head -50
```

The backend re-runs `prisma migrate deploy` on every boot — schema
changes apply automatically. If a migration is destructive, take a
manual `pg_dump` first.

To roll back: `git checkout <previous-sha>` then re-run the same three
commands.

---

## 9. Logs

```bash
docker compose logs -f --tail=200 backend
docker compose logs -f --tail=200 frontend
docker compose logs -f --tail=200 nginx
```

Backend logs are line-delimited JSON with `reqId`, `method`, `route`,
`statusCode`, `durationMs`. Pipe through `jq` to dig:

```bash
docker compose logs --no-color backend | jq -r 'select(.statusCode>=500)'
```

Rotate Docker logs (default driver is `json-file`, unbounded):

```bash
sudo tee /etc/docker/daemon.json > /dev/null <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "5" }
}
JSON
sudo systemctl restart docker
```

---

## 10. Restart / recovery commands

```bash
# Restart a single service
docker compose restart backend

# Stop everything (preserves the DB volume)
docker compose down

# Stop AND wipe the database (DESTRUCTIVE — local dev only)
docker compose down -v

# Force-pull base images + rebuild
docker compose build --pull --no-cache

# Open a psql shell
docker compose exec postgres psql -U alpinavpn -d alpinavpn

# Open a Node REPL inside the backend container
docker compose exec backend node
```

---

## 11. Monitoring (recommended next step)

The stack ships health endpoints (`/health`, `/health/db`) and
structured logs. Hook them up to your monitoring of choice:

- Uptime: UptimeRobot / BetterStack pinging `/health/db` every minute.
- Logs: Loki + Promtail, or ship JSON logs to a hosted aggregator.
- Metrics: prometheus-fastify-metrics is a 5-line addition if needed.

---

## 12. Switching to Marzban (when ready)

1. Stand up Marzban on the same or a different host.
2. In `.env`:

   ```dotenv
   VPN_PROVIDER=marzban
   MARZBAN_API_URL=https://marzban.internal
   MARZBAN_API_USERNAME=admin
   MARZBAN_API_PASSWORD=<token>
   ```

3. Implement the four methods in
   `backend/src/modules/vpn/marzban-vpn-provider.ts`.
4. `docker compose up -d --build backend`.

No service-layer code changes are required; the provider seam is
designed for this swap.
