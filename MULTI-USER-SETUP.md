# Multi-user LinkedIn sessions — setup & how it works

Each user connects **their own** LinkedIn account through a browser extension.
The server stores each user's session (encrypted) and screenshots posts under
that user's account. No shared login, no cookie pasting, no server-side login.

## How the pieces fit

1. **Sign up / log in** — each person creates their own account (username + password
   they choose) using the shared invite code, then logs in. Their JWT carries their
   user id. There is no admin-maintained user list.
2. **Connect** — they install the extension once, paste their **Server URL** and
   personal **key** (shown in the app), and click Connect. The extension reads
   their LinkedIn cookie and POSTs it to `/api/linkedin-session/connect`.
3. **Store** — the server encrypts the cookies (AES-256-GCM) and writes one file
   per user under `/app/browser-profile/sessions/`. Accounts live in
   `/app/browser-profile/users.json` (passwords are scrypt-hashed, never plain).
4. **Capture** — when a user submits post URLs, the server injects **their** stored
   cookies into an isolated browser context and screenshots the posts.

## Server env vars

Set these on Railway (see `.env.example`):

| Var | Purpose |
| --- | --- |
| `SIGNUP_INVITE_CODE` | Shared code teammates use to self-register. Treat like a password. Sign-up is disabled if unset. |
| `ADMIN_JWT_SECRET` | Signs login tokens **and** derives each user's extension key. Keep stable & secret. |
| `SESSION_ENCRYPTION_KEY` | Encrypts stored cookies at rest. Defaults to `ADMIN_JWT_SECRET`. |
| `LINKEDIN_BROWSER_PROFILE_PATH` | Leave as default; sessions + accounts are stored under its parent folder. |

> Changing `ADMIN_JWT_SECRET` logs everyone out **and** invalidates every
> extension key (users must re-copy the new key). Set it once and leave it.

## Persistent volume (required)

Stored sessions live under `/app/browser-profile/sessions`. On Railway, attach a
**named persistent volume** mounted at `/app/browser-profile`, or every redeploy
wipes everyone's connection. (The `VOLUME` line in the Dockerfile alone is not
enough — it must be a named Railway volume.)

## Adding / removing a user

Adding is self-service: share the invite code and the person signs up. To revoke
access, rotate `SIGNUP_INVITE_CODE` (stops new sign-ups) and remove their entry
from `/app/browser-profile/users.json` on the volume.

## When a session expires

LinkedIn eventually expires `li_at` (roughly yearly, sooner on a password change).
The user just clicks **Connect LinkedIn** in the extension again — self-service,
about ten seconds. Captures fail with a clear "reconnect" message until they do.

## Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | invite code | Create an account, returns JWT. |
| `POST` | `/api/auth/login` | — | Web login, returns JWT. |
| `GET` | `/api/auth/me` | JWT | Current user + their extension key. |
| `GET` | `/api/linkedin-session/status` | JWT | Is this user connected? |
| `POST` | `/api/linkedin-session/connect` | extension key | Store this user's cookies. |
| `POST` | `/api/linkedin-session/disconnect` | JWT | Delete this user's session. |
| `POST` | `/api/process` | JWT | Screenshot posts as this user. |
