# Stage 1: base with pnpm
FROM node:20-alpine AS base
RUN npm install -g pnpm@8.1.1
WORKDIR /app

# Stage 2: install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/mobile-h5/package.json ./packages/mobile-h5/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --filter @nasktv/mobile-h5...

# Stage 3: build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/mobile-h5/node_modules ./packages/mobile-h5/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY tsconfig.base.json ./
COPY packages/mobile-h5 ./packages/mobile-h5/
COPY packages/shared ./packages/shared/
# shared 的 main 直接指向 src/index.ts（TS 源码），由 vite/tsc 消费，无需预构建
RUN pnpm --filter @nasktv/mobile-h5 build

# Stage 4: production with nginx
FROM nginx:alpine AS production
COPY --from=build /app/packages/mobile-h5/dist /usr/share/nginx/html
COPY packages/mobile-h5/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
