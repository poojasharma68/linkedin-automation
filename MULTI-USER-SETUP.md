# Multi-user LinkedIn sessions — setup & how it works

Each user connects **their own** LinkedIn account through a browser extension.
The server stores each user's session (encrypted) and screenshots posts under
that user's account. No shared login, no cookie pasting, no server-side login.

## How the pieces fit

1. **Login** — every person signs into the web app with their own username/password
   (from `APP_USERS`). Their JWT carries their user id.
2. **Connect** — they install the extension once, paste their **Server URL** and
   personal **key** (shown in the app), and click Connect. The extension reads
   their LinkedIn cookie and POSTs it to `/api/linkedin-session/connect`.
3. **Store** — the server encrypts the cookies (AES-256-GCM) and writes one file
   per user under `/app/browser-profile/sessions/`.
4. **Capture** — when a user submits post URLs, the server injects **their** stored
   cookies into an isolated browser context and screenshots the posts.

## Server env vars

Set these on Railway (see `.env.example`):

| Var | Purpose |
| --- | --- |
| `APP_USERS` | JSON array of `{username, password}` — one per person. |
| `ADMIN_JWT_SECRET` | Signs login tokens **and** derives each user's extension key. Keep stable & secret. |
| `SESSION_ENCRYPTION_KEY` | Encrypts stored cookies at rest. Defaults to `ADMIN_JWT_SECRET`. |
| `LINKEDIN_BROWSER_PROFILE_PATH` | Leave as default; sessions are stored under its parent folder. |

> Changing `ADMIN_JWT_SECRET` logs everyone out **and** invalidates every
> extension key (users must re-copy the new key). Set it once and leave it.

## Persistent volume (required)

Stored sessions live under `/app/browser-profile/sessions`. On Railway, attach a
**named persistent volume** mounted at `/app/browser-profile`, or every redeploy
wipes everyone's connection. (The `VOLUME` line in the Dockerfile alone is not
enough — it must be a named Railway volume.)

## Adding / removing a user

Edit `APP_USERS` and redeploy. Removing a user stops their login; their stored
session file can be dropped via the app's **Disconnect** button beforehand.

## When a session expires

LinkedIn eventually expires `li_at` (roughly yearly, sooner on a password change).
The user just clicks **Connect LinkedIn** in the extension again — self-service,
about ten seconds. Captures fail with a clear "reconnect" message until they do.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | — | Web login, returns JWT. |
| `GET` | `/api/auth/me` | JWT | Current user + their extension key. |
| `GET` | `/api/linkedin-session/status` | JWT | Is this user connected? |
| `POST` | `/api/linkedin-session/connect` | extension key | Store this user's cookies. |
| `POST` | `/api/linkedin-session/disconnect` | JWT | Delete this user's session. |
| `POST` | `/api/process` | JWT | Screenshot posts as this user. |
