# DEPLOY.md — MERN Courier: Vercel (client) + Render + Atlas (server)

> Status: **build-ready, NOT live.** The client builds cleanly locally
> (`CI=true npm run build`, exit 0, Node v24.22.1 / npm 10.9.4).
> Nothing here has been committed, pushed, or deployed — Vercel is not
> connected and no Vercel project exists yet. The old URL
> `mcpc-tan.vercel.app` returns 404 and is not this deployment.
>
> No Next.js anywhere. The frontend is Create React App
> (react-scripts 5.0.1, React 19). The server is plain Express and is
> **not** deployed on Vercel.

## 1. What this repo is (from the actual code)

- `client/` — React SPA (CRA), Tailwind v3, react-router-dom v7,
  Socket.IO client, Google Maps (`@react-google-maps/api`).
  Routes: `/login`, `/register`, `/customer/*`, `/agent/*`, `/admin/*`
  (role-guarded, JWT in `Authorization: Bearer <token>`).
- `server/` — Express 5 + Socket.IO + Mongoose. API mounted at:
  `/api/auth` (register/login), `/api/parcels` (book/history/track),
  `/api/admin` (parcels, assign, dashboard, users, CSV/PDF reports),
  `/api/agent` (assigned parcels, status updates).
- Live tracking is Socket.IO events `new_booking` (admin) and
  `status_update` (customer).

## 2. Vercel project settings (client only)

Import this repo in Vercel
(`https://github.com/smabdulmueid97/MERN-Stack-Courier-and-Parcel-Management-System`)
**after** the changes in §5 are committed and pushed.

| Setting | Value |
|---|---|
| Framework Preset | **Create React App** |
| Root Directory | `.` (repo root — `vercel.json` lives here) |
| Install Command | `npm install --prefix client` |
| Build Command | `npm run build --prefix client` |
| Output Directory | `client/build` |
| Node.js Version | Default (verified locally on Node v24.22.1, npm 10.9.4) |

`vercel.json` (repo root) already pins the install/build/output values
above and adds an SPA rewrite (`/(.*)` → `/index.html`) so
react-router deep links (`/admin`, `/customer`, …) don't 404 on
refresh. The `client/public/_redirects` file is Netlify-only and is
ignored by Vercel — the rewrite in `vercel.json` is what matters.

Expected live URL: `https://<project>.vercel.app`
(e.g. `https://mern-stack-courier-and-parcel-management-system.vercel.app`,
or whatever project name is chosen at import).

## 3. Environment variables

### Vercel (client) — set in Project Settings → Environment Variables

| Variable | Required? | Value |
|---|---|---|
| `REACT_APP_API_URL` | **Yes — app is useless without it** | Deployed server origin, e.g. `https://<server>.onrender.com` — no trailing slash, no `/api` suffix. Falls back to `http://localhost:5001` if unset, which fails from any real browser. |
| `REACT_APP_Maps_API_KEY` | Optional | Google Maps API key (same key the dashboards already read). Without it the maps don't load, but login/booking still work. |

CRA embeds `REACT_APP_*` vars **at build time**: after changing one,
redeploy (or trigger a rebuild) for it to take effect.

### Server host, e.g. Render (NOT Vercel) — every var the server code reads

Verified by grepping the server code. `Maps_API_KEY` is listed in the
README's `server/.env` example but **is never read by any server file** —
do not set it for the server.

| Variable | Required? | Notes |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB Atlas connection string (`server/config/db.js`). The server exits on connect failure. |
| `JWT_SECRET` | Yes | Long random secret for signing/verifying JWTs (`server/controllers/authController.js`, `server/middleware/authMiddleware.js`). Tokens last 30 days. |
| `PORT` | No | Defaults to `5001` (`server/server.js`). Render sets its own `PORT` — the server already honours `process.env.PORT`. |
| `CLIENT_URL` | Yes, once the Vercel site exists | Deployed Vercel origin, e.g. `https://<project>.vercel.app`. Used as the Socket.IO CORS origin (`server/server.js`). Falls back to `http://localhost:3000`. Without it, live tracking from the Vercel site is rejected. |

Render service settings: **Web Service**, Root Directory `server`,
Build Command `npm install`, Start Command `npm start`
(`server/package.json` now has a `start` script — it previously had
none, so `npm start` failed despite the README telling users to run it).
Runtime Node 20+.

### MongoDB Atlas

Create a free (M0) cluster, a database user, and allow network access
from `0.0.0.0/0` (Render has no fixed outbound IP on the free tier).
Put the connection string in `MONGO_URI`.

## 4. Order of operations (what is still missing)

1. **Commit + push the changes in §5** to `main` on GitHub. Until
   then Vercel has nothing new to import. (Not done by this task.)
2. **Deploy the server first** (Atlas + Render) and note its public URL.
3. **Create the Vercel project**, set `REACT_APP_API_URL` to the
   server URL (+ `REACT_APP_Maps_API_KEY` if maps are wanted), deploy.
4. **Set `CLIENT_URL` on Render** to the Vercel URL, restart the
   server (Socket.IO CORS).
5. **Create the first Admin**: there is no seed script. Register via
   the UI with `role: "Admin"` in the register request body
   (`POST /api/auth/register` accepts a `role` field; the User model
   defaults to `Customer`). ⚠️ Anyone can currently self-register as
   Admin — restrict this before the site is public.
6. Verify end-to-end: register → login → book a parcel → admin
   assigns an agent → agent updates status → customer sees the live
   update.

## 5. Changes made in this work dir (local only, uncommitted)

| File | Change | Why |
|---|---|---|
| `client/package.json` | Added `"typescript": "^4.9.5"` to `devDependencies` | **Build fix.** With no lockfile, fresh `npm install` resolved TypeScript **7.0.2**, which react-scripts 5.0.1 rejects (`^3.2.1 \|\| ^4`). TS 7 broke `eslint-plugin-jest` loading, so the build died with `Failed to compile — [eslint] Environment key "jest/globals" is unknown`. Pinning TS 4.9.5 fixes it under `CI=true` (Vercel's default). |
| `client/package-lock.json` | **New** (generated by `npm install`) | Locks the exact tree that was verified to build, so Vercel installs the same thing. |
| `client/src/services/api.js` | Axios `baseURL` now reads `REACT_APP_API_URL` (fallback `http://localhost:5001/api`) | Was hardcoded to `http://localhost:5001/api` — the deployed site could never reach a backend. Local behaviour unchanged. |
| `client/src/pages/admin/AdminDashboard.js` | Socket.IO URL now reads `REACT_APP_API_URL` (fallback `http://localhost:5001`) | Same hardcoding as above, for the `new_booking` live feed. |
| `client/src/pages/customer/CustomerDashboard.js` | Socket.IO URL now reads `REACT_APP_API_URL` (fallback `http://localhost:5001`) | Same, for the `status_update` live feed. |
| `server/package.json` | Added `"start": "node server.js"`; fixed `"main": "index.js"` → `"server.js"` (`index.js` does not exist) | README says `npm start`, but no start script existed. Needed by any Node host. |
| `server/server.js` | Socket.IO CORS `origin` now reads `CLIENT_URL` (fallback `http://localhost:3000`) | Was hardcoded to localhost, so the Vercel origin's socket connection would be rejected in production. |
| `vercel.json` | **New** (repo root) | Pins install/build/output for the CRA client and adds the SPA rewrite. No Next.js. |
| `DEPLOY.md` | **New** (this file) | This document. |

Nothing else was changed. No features added, no routes changed, no
dependency versions bumped except the TypeScript pin.

## 6. Local build verification (exact results)

```text
$ cd client && npm install
added 1355 packages in 3m        # exit 0; deprecation warnings only

$ CI=true npm run build           # BEFORE the fix:
Failed to compile.
[eslint] package.json » eslint-config-react-app/jest#overrides[0]:
        Environment key "jest/globals" is unknown
BUILD_EXIT: 1

$ CI=true npm run build           # AFTER the TypeScript pin (+ the edits above):
Compiled successfully.
File sizes after gzip:
  154.4 kB  build/static/js/main.adea9be6.js
  3.52 kB   build/static/css/main.1ea14bf7.css
The build folder is ready to be deployed.
BUILD_EXIT: 0
```

`CI=true` is used deliberately — Vercel sets `CI=true`, which makes
CRA treat lint problems as build failures. The build was verified
with `CI=true` so it matches Vercel behaviour.

## 7. Known limitations / blockers

- **Not live.** Nothing is deployed; `mcpc-tan.vercel.app` (old link)
  returns 404 and is unrelated to this work.
- **Server is not on Vercel** and cannot be: it needs a persistent
  Node process (Socket.IO) + MongoDB. It must live on Render (or
  similar) with Atlas — see §3–§4.
- **No admin seed / open Admin registration** — see step 5 in §4.
- **Express `cors()` is wide open** (`app.use(cors())` in
  `server/server.js`); only the Socket.IO origin is restricted.
- **No tests in the repo** (`server/package.json` test script just
  errors; `client` has no test files). Nothing was run beyond the
  production build and a `node --check` of `server/server.js`.
- **Mixed Tailwind versions in `client/package.json`**
  (Tailwind v3 config + `@tailwindcss/cli`/`@tailwindcss/postcss`
  v4 packages). The build passes as-is, so this was left alone —
  don't touch it unless the styling breaks.
