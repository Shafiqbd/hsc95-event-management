# Deploying to the VPS

The ready-to-run production build is in **`release/hsc95/`** (and packed as
`release/hsc95.tar.gz`). Both are git-ignored because they contain the backend `.env`
(secrets) and member photos.

Full instructions: [`release/hsc95/DEPLOY.md`](hsc95/DEPLOY.md).

To rebuild after code changes, ask for a new production build (frontend uses Next.js
`output: "standalone"`; backend ships `dist/` with production `node_modules`).
