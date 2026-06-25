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

# Client deps (incl. dev deps needed to build) + build
COPY client/package*.json ./client/
RUN npm --prefix client ci
COPY . .
RUN npm --prefix client run build

# Persist the LinkedIn browser profile across deploys (mount a Railway volume here)
VOLUME ["/app/browser-profile"]

CMD ["node", "src/server.js"]
