# Deploying to the VPS

Two archives, built and tested on 2026-10-19, plus `ecosystem.config.cjs` for PM2:

| File | Contains | Runs on |
|---|---|---|
| `hsc95-backend.tar.gz` | NestJS build (`dist/`), `package.json`, `package-lock.json` | port 4000 |
| `hsc95-frontend.tar.gz` | Next.js build (`.next/`), `public/`, `next.config.ts`, `package.json`, `package-lock.json` | port 3000 |

Neither archive contains secrets (`.env`) or member photos.

## Server requirements

- Node.js 20.19+ (built and tested on Node 24)
- Nginx (or similar) in front, with **HTTPS**. In production the login cookie is `Secure`,
  so logins only work over https.
- Outbound access to the PostgreSQL server (72.60.208.13:80) and to bulksmsbd.net.
- **Whitelist the VPS public IP in bulksmsbd** (Phonebook → IP whitelist), or SMS will fail
  with code 1032.

## 1. Upload and unpack

```bash
scp release/hsc95-backend.tar.gz release/hsc95-frontend.tar.gz user@your-vps:/tmp/
ssh user@your-vps
sudo mkdir -p /var/www/hsc95/backend /var/www/hsc95/frontend && sudo chown -R $USER /var/www/hsc95
tar -xzf /tmp/hsc95-backend.tar.gz  -C /var/www/hsc95/backend
tar -xzf /tmp/hsc95-frontend.tar.gz -C /var/www/hsc95/frontend
cd /var/www/hsc95/backend  && npm ci --omit=dev
cd /var/www/hsc95/frontend && npm ci --omit=dev
```

## 2. Backend `.env`

Copy your local `backend/.env` to `/var/www/hsc95/backend/.env`, then change:

```env
NODE_ENV=production
FRONTEND_URL=https://your-domain.com
UPLOAD_DIR=/var/www/hsc95/storage        # member photos live here — back it up
# Recommended: a new secret for production
# node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
AUTH_SECRET=<new 64-char secret>
```

Keep the `DB_*` and `SMS_*` values. If you have photos from local testing, copy
`backend/storage/photos/` to `/var/www/hsc95/storage/photos/`.

## 3. Start with PM2

```bash
sudo npm i -g pm2
cp ecosystem.config.cjs /var/www/hsc95/      # from this release folder
cd /var/www/hsc95 && pm2 start ecosystem.config.cjs
pm2 save && pm2 startup          # restart both after a reboot
```

`ecosystem.config.cjs` starts the backend from `backend/dist/main.js` and the frontend with
`next start -p 3000` (Next.js has no single index file).

The backend must be started from its own folder (it reads `.env` from there).
The frontend forwards `/api/*` to `http://localhost:4000` (fixed at build time).

## 4. Nginx (only the frontend is public)

```nginx
server {
    server_name your-domain.com;
    client_max_body_size 3m;            # photo uploads (2 MB limit)

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Then add HTTPS, e.g. `sudo certbot --nginx -d your-domain.com`.
Do not expose port 4000 to the internet.

## 5. Check

```bash
curl -s http://localhost:4000/api/event      # {"data":{"registrationFee":1500,"driverFee":500}}
curl -sI http://localhost:3000/backend/login # 200
pm2 logs hsc95-api --lines 20
```

## Updating later

Build again locally, upload the new archives, unpack over the old folders (the backend
`.env` and `UPLOAD_DIR` are not in the archives, so they are kept), run `npm ci --omit=dev`,
then `pm2 restart hsc95-api hsc95-web`.
