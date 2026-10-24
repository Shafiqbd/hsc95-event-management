# Deploying to the VPS

| Part | Where it runs |
|---|---|
| Frontend (static files) | `https://www.hsc95society.com` — served by Nginx from `/var/www/hsc95/frontend` |
| Backend (NestJS) | `http://localhost:4000` on the VPS — never opened to the internet |
| Link between them | Nginx forwards `https://www.hsc95society.com/api/…` → `http://127.0.0.1:4000` |

The frontend is built with `frontend/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://www.hsc95society.com/api
SITE_URL=https://www.hsc95society.com
```

## Frontend

1. Build on your PC: `cd frontend && npm run build` → `frontend/out/`
   (packed as `release/hsc95-frontend.tar.gz` / `.zip`; both git-ignored).
2. Upload and unpack on the VPS so `index.html` is directly inside the folder:
   ```bash
   scp release/hsc95-frontend.tar.gz user@your-vps:/tmp/
   ssh user@your-vps
   sudo mkdir -p /var/www/hsc95/frontend
   sudo rm -rf /var/www/hsc95/frontend/*
   sudo tar -xzf /tmp/hsc95-frontend.tar.gz -C /var/www/hsc95/frontend
   ```
3. Nginx (first time, or after changing the config):
   ```bash
   sudo cp nginx-hsc95-static.conf /etc/nginx/sites-available/hsc95
   sudo ln -sf /etc/nginx/sites-available/hsc95 /etc/nginx/sites-enabled/hsc95
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot --nginx -d hsc95society.com -d www.hsc95society.com   # HTTPS (login needs it)
   ```
   The bare `hsc95society.com` redirects to `https://www.hsc95society.com`.

## Backend `.env` on the VPS (production values)

```env
NODE_ENV=production
PORT=4000
FRONTEND_URL=https://www.hsc95society.com
```

`NODE_ENV=production` makes the login cookie HTTPS-only. Keep the database and SMS settings
as they are. Restart the backend after changing `.env`.

## Check after deploying

- `https://www.hsc95society.com` opens the website.
- `https://www.hsc95society.com/api/event` shows `{"data":{"registrationFee":…}}` (backend reachable).
- Log in at `https://www.hsc95society.com/backend/login/`.
