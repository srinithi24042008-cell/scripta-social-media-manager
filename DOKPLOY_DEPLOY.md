# Deploying Scripta to Dokploy

Setup: single domain (frontend serves the app, nginx internally proxies
`/api`, `/uploads`, `/socket.io` to the backend), Dokploy-managed MongoDB,
one Dokploy "Compose" application for backend + frontend.

Files involved:
- `docker-compose.dokploy.yml` — the stack Dokploy deploys (backend + frontend only, no Mongo)
- `backend/Dockerfile`, `frontend/Dockerfile` — how each image is built
- `frontend/nginx.conf` — serves the built frontend and proxies API/uploads/websocket calls

---

## 0. Prerequisites

- Dokploy already installed and running on a VPS (see dokploy.com/docs for that part — this guide starts from "Dokploy is up").
- A domain (or subdomain) with its DNS **A record pointed at your server's IP**. Example used throughout: `app.yourdomain.com`.
- This repo pushed to a GitHub repo Dokploy can access.

---

## 1. Push this code to GitHub

```bash
git add -A
git commit -m "Add Dokploy deployment files"
git push
```

Nothing secret is in these new files — all real values are supplied later through Dokploy's environment variable UI, never committed.

---

## 2. Create a Project in Dokploy

Dokploy dashboard → **Projects** → **Create Project** → name it `scripta` (or anything).

---

## 3. Create the MongoDB database

Inside the project → **Create Service** → **Database** → **MongoDB**.

- Name: `scripta-mongo`
- Set a database user/password (Dokploy generates or lets you set these)
- Deploy it

Once running, open the database → **General**/**Connection** tab and copy the **Internal Connection URL** (looks like `mongodb://user:pass@scripta-mongo-xxxx:27017/scripta?authSource=admin`). You'll paste this as `MONGODB_URI` in step 5. Use the **internal** URL, not the external one — the backend talks to Mongo over Dokploy's private Docker network, not the public internet.

---

## 4. Create the Compose application

Inside the project → **Create Service** → **Application** → choose **Docker Compose** as the source type (not "Application"/Dockerfile — that single-Dockerfile mode is for one service, we need two).

- Connect your GitHub repo, branch `main`
- **Compose Path**: `docker-compose.dokploy.yml` (not the default `docker-compose.yml` — that one's for local dev and includes its own throwaway Mongo container)
- Save

---

## 5. Set environment variables

In the Compose application → **Environment** tab, paste in (fill in the real values):

```
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
ENCRYPTION_KEY=<generate the same way, a different value>
MONGODB_URI=<the Internal Connection URL from step 3>
FRONTEND_URL=https://app.yourdomain.com

GEMINI_API_KEY=<your Gemini key>

CLOUDINARY_CLOUD_NAME=<optional but recommended, see note below>
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

META_APP_ID=<if using Facebook/Instagram/Threads>
META_APP_SECRET=

LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_REDIRECT_URI=

YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<your sending address>
EMAIL_PASS=<app password, not your real password>

VITE_GOOGLE_CLIENT_ID=<optional, for "Sign in with Google">
```

Notes:
- `JWT_SECRET` and `ENCRYPTION_KEY` **must** be set — the backend refuses to boot without `JWT_SECRET`, and reusing dev secrets in prod is what caused the last round of security findings. Generate fresh ones.
- `FRONTEND_URL` must be the exact public URL (with `https://`) — it drives both CORS allow-listing and the Socket.IO CORS check, and gets baked into the frontend build as the websocket target.
- **Cloudinary**: without it, uploaded/generated media sits on local disk inside a Docker volume (`backend_uploads`), which survives redeploys but won't work if you ever scale the backend to more than one replica. Recommended for anything beyond a single-instance launch.
- Leave any integration you're not using blank — the app degrades gracefully per-platform (see `credentialService.js`), it won't crash.

---

## 6. Attach the domain

Compose application → **Domains** tab → **Add Domain**:

- Service: `frontend`
- Container Port: `80`
- Domain: `app.yourdomain.com`
- HTTPS: enable (Dokploy provisions a Let's Encrypt cert automatically)

Do **not** add a domain for the `backend` service — it's only reachable internally, through the frontend's nginx proxy (`/api`, `/uploads`, `/socket.io`).

---

## 7. Deploy

Compose application → **Deploy**. Watch the build logs for both `backend` and `frontend` images. First build will take a few minutes (native deps: sharp, ffmpeg).

Once it's up:
- Visit `https://app.yourdomain.com` — should load the Scripta home page
- Check `https://app.yourdomain.com/api/health` — should return `{"status":"ok","healthy":true}` (or `503` if Mongo isn't reachable yet — check the `MONGODB_URI` value if so)
- Register an account, confirm login works (validates `JWT_SECRET` + Mongo connectivity end-to-end)
- Open browser devtools → Network/WS tab → confirm a `socket.io` websocket connection succeeds (validates the nginx `/socket.io/` proxy block and `VITE_SOCKET_URL`)

---

## 8. Social platform OAuth redirect URLs

For each platform you configure (Facebook/Instagram/Threads, LinkedIn, YouTube), the OAuth app's registered redirect URI must point at:

```
https://app.yourdomain.com/api/accounts/oauth/callback/<platform>
```

e.g. `https://app.yourdomain.com/api/accounts/oauth/callback/youtube`. The backend computes this dynamically from request headers (works correctly behind Dokploy's Traefik + the nginx proxy, both of which forward `X-Forwarded-Proto`/`Host`), so you don't need to hardcode it anywhere except in each platform's own developer console.

---

## 9. Auto-deploy on push (optional)

Compose application → **General**/**Git** tab → enable the deploy webhook, or configure GitHub Actions to hit Dokploy's deploy webhook URL on push to `main`. Without this, redeploying means clicking **Deploy** in the Dokploy UI after each push.

---

## 10. Updating environment variables later

Environment tab → edit values → **Redeploy** (env var changes require a redeploy to take effect; they aren't hot-reloaded).

---

## Scaling notes — read before adding replicas

This app is safe to run as a **single backend instance** as deployed above (the scheduler's distributed-lock fix means even a redeploy overlap won't double-publish posts). Before running **more than one backend replica**, two things still need addressing — they weren't part of this deployment setup:

- **Socket.IO** has no Redis adapter — realtime notifications will only reach clients connected to the same replica.
- **Rate limiting** is in-memory per-instance — limits effectively multiply with replica count.

Both need a shared Redis instance wired in before horizontal scaling; ask me if/when you're ready to do that.

---

## Backups

Once the Dokploy-managed MongoDB is running, check its **Backups** tab and set up a schedule — that's the actual durability story for your data, independent of anything in this repo.
