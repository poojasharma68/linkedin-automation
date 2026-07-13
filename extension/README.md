# UnionStack — LinkedIn Connector (browser extension)

This tiny extension lets each user connect their **own** LinkedIn session to the
UnionStack app without pasting cookies by hand. It reads your LinkedIn login
cookie from the browser you're already signed into and sends it **only to your
own server** (the URL you configure). Nothing goes anywhere else.

## Install (Chrome or Edge)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `extension/` folder.
4. The **UnionStack — LinkedIn Connector** icon appears in the toolbar. Pin it.

> For a cleaner rollout to your team you can instead publish it as an **unlisted**
> Chrome Web Store item (one-time $5 developer fee) and share the private link.

## Use it

1. Make sure you're logged in to **linkedin.com** in this browser.
2. Open the app, sign in, and find the **LinkedIn Connection** panel.
3. Copy your **Server URL** and your **key** from that panel.
4. Click the extension icon, paste both, and hit **Connect LinkedIn**.
5. The app's panel turns green within a few seconds. Done.

When your LinkedIn session eventually expires, just click **Connect LinkedIn** in
the extension again — no engineer, no cookie editing.

## What it can access

- `cookies` + `https://*.linkedin.com/*` — to read your LinkedIn cookies.
- `storage` — to remember your server URL and key so you only type them once.

It has **no** access to any other site, and it never sends your data anywhere
except the server URL you enter.
