FROM node:20-slim

# 1. Install system dependencies for Puppeteer + Common libs + Build Tools
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    openssl \
    python3 \
    make \
    g++ \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Set Env to use installed Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# 3. Copy Backend manifests first (for cache)
COPY backend/package.json ./package.json

# 4. Install dependencies FORCEFULLY (ignoring lockfile)
RUN npm install

# 5. Copy Source Code
COPY backend/ .

# 6. Build Project
RUN npx prisma generate
RUN npx tsc

# 7. Start
CMD ["node", "dist/server.js"]
