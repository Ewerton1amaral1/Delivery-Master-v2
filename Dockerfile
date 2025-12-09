# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools needed for some npm packages
RUN apk add --no-cache python3 make g++

# Copy root package files first to leverage caching
COPY package.json package-lock.json ./
# Copy backend package file
COPY backend/package.json ./backend/

# Install dependencies from root (this installs everything including workspace deps)
# We use --workspace=backend to install only backend deps + shared, but usually installing all is safer/easier
RUN npm ci

WORKDIR /app/backend

COPY backend/prisma ./prisma/
RUN npx prisma generate

COPY backend/. .

RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install Chrome dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Tell Puppeteer to skip downloading Chrome. We'll use the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy necessary files from builder
# Note: node_modules structure might be different in monorepo, usually hoisted to root
COPY --from=builder /app/node_modules ./node_modules
# Also copy backend specific modules if any (though usually hoist)
# COPY --from=builder /app/backend/node_modules ./backend/node_modules

COPY --from=builder /app/backend/package.json ./
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/prisma ./prisma

EXPOSE 3001

CMD ["npm", "run", "start"]
