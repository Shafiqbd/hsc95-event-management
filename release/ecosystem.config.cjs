// PM2 config for the VPS. Copy to /var/www/hsc95/ and run:
//   pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
// Adjust BASE if the apps live somewhere else.
const BASE = "/var/www/hsc95";

module.exports = {
  apps: [
    {
      // NestJS API: entry file dist/main.js; reads .env from its own folder.
      name: "hsc95-api",
      cwd: `${BASE}/backend`,
      script: "dist/main.js",
      env: { NODE_ENV: "production" },
      max_memory_restart: "400M",
    },
    {
      // Next.js site: no entry file, it is started with `next start` (port 3000).
      name: "hsc95-web",
      cwd: `${BASE}/frontend`,
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      env: { NODE_ENV: "production" },
      max_memory_restart: "600M",
    },
  ],
};
