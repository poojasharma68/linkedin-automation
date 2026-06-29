# LinkedIn Post Automation

Simple flow: **Select category → Paste LinkedIn URLs → Process → Posts appear via API**

The app is stateless — screenshots are stored in the Masters Union links API
(CDN), not in a local database.

## User Flow

```
Admin Panel
    ↓
Select Category + Programme (sidebar)
    ↓
Paste LinkedIn URLs (one per line)
    ↓
Click Process
    ↓
Screenshot Generation (Puppeteer, high quality PNG)
    ↓
POST /links/from-image  → CDN stores the image + metadata
                          (category, programName, linkedinUrl, source)
    ↓
CDN URL Generated
    ↓
GET /api/process/posts serves the stored screenshots back to the frontend
```

## APIs

### Process posts (Admin)

```http
POST /api/process
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "category": "tech",
  "programme": "pg",
  "urls": "https://www.linkedin.com/posts/...\nhttps://www.linkedin.com/posts/..."
}
```

### Show posts on your website

Public, read-only — no token. Open it in Postman or bind it directly on the
website. This is the GET view of everything `POST /links/from-image` stored.

```http
GET /api/links?category=tech&programme=pg
```

(The admin UI uses the auth-gated `GET /api/process/posts`, which returns the
same shape.)

Response:

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "...",
      "fileId": "...",
      "linkedinUrl": "https://www.linkedin.com/posts/...",
      "category": "tech",
      "programme": "pg",
      "imageUrl": "https://files.unionstack.link/f/...",
      "status": "Completed",
      "createdAt": "2026-06-18T..."
    }
  ]
}
```

## Run

```bash
npm install
npm run dev          # API on :3000

cd client && npm install && npm run dev   # Admin UI on :5173
```

## Environment

| Variable | Description |
|---|---|
| `LINKS_API_BASE_URL` | Masters Union links API base (CDN upload + listing) |
| `PUPPETEER_HEADLESS` | `true` / `false` |
| `PUPPETEER_TIMEOUT_MS` | Screenshot timeout in ms |
| `LINKEDIN_BROWSER_PROFILE_PATH` | Chrome profile holding the LinkedIn session |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Admin login |
| `ADMIN_JWT_SECRET` | Admin token signing secret |

## Categories

`tech` · `marketing` · `business` · `design` · `career`
