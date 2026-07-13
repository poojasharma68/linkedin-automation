FROM node:20-slim

# System Chromium + libs for Puppeteer (instead of Puppeteer's bundled download)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Backend deps
COPY package*.json ./
RUN npm ci --omit=dev

# Client deps (incl. dev deps needed to build) + build.
# NODE_ENV=production above makes npm skip devDependencies, but vite lives there
# and is needed to build — so force it to include dev deps.
COPY client/package*.json ./client/
RUN npm --prefix client ci --include=dev
COPY . .
RUN npm --prefix client run build

# Persistence (accounts + LinkedIn sessions) is handled by a Railway Volume
# mounted at /app/browser-profile — add it in the Railway dashboard. Railway's
# builder rejects a Docker VOLUME instruction, so it must not be declared here.

CMD ["node", "backend/server.js"]
