# LinkedIn Post Automation

Simple flow: **Select category → Paste LinkedIn URLs → Process → Posts appear via API**

## User Flow

```
Admin Panel
    ↓
Select Category (sidebar tabs)
    ↓
Paste LinkedIn URLs (up to 20, one per line)
    ↓
Click Process
    ↓
Queue Created (status: Pending)
    ↓
Screenshot Generation (Puppeteer, high quality PNG)
    ↓
Upload to Cloudflare R2
    ↓
CDN URL Generated
    ↓
Save in MongoDB (status: Completed)
    ↓
GET /api/posts automatically serves posts to your website
```

## APIs

### Process posts (Admin)

```http
POST /api/process
Content-Type: application/json

{
  "category": "tech",
  "urls": "https://www.linkedin.com/posts/...\nhttps://www.linkedin.com/posts/..."
}
```

### Show posts on your website

```http
GET /api/posts?category=tech
```

Response:

```json
{
  "success": true,
  "count": 5,
  "category": "tech",
  "data": [
    {
      "id": "...",
      "linkedinUrl": "https://www.linkedin.com/posts/...",
      "category": "tech",
      "imageUrl": "https://cdn.yoursite.com/linkedin-posts/tech/....png",
      "status": "Completed",
      "createdAt": "2026-06-18T..."
    }
  ]
}
```

Bind `GET /api/posts?category=tech` on your website to display posts.

## Run

```bash
npm install
npm run dev          # API on :3000

cd client && npm install && npm run dev   # Admin UI on :5173
```

## Environment

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection |
| `LINKS_API_BASE_URL` | Masters Union links API base (CDN upload) |
| `LINKEDIN_COOKIES_PATH` | LinkedIn session cookies for private posts |
| `PUPPETEER_HEADLESS` | `true` / `false` |

## Categories

`tech` · `marketing` · `business` · `design` · `career` · `other`
