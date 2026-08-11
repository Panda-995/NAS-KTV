# Stage 1: base with pnpm
FROM node:20-alpine AS base
RUN npm install -g pnpm@8.1.1
WORKDIR /app

# Stage 2: install dependencies
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/admin-web/package.json ./packages/admin-web/
RUN pnpm install --frozen-lockfile --filter @nasktv/admin-web

# Stage 3: build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/admin-web/node_modules ./packages/admin-web/node_modules
COPY tsconfig.base.json ./
COPY packages/admin-web ./packages/admin-web/
RUN pnpm --filter @nasktv/admin-web build

# Stage 4: production with nginx
FROM nginx:alpine AS production
COPY --from=build /app/packages/admin-web/dist /usr/share/nginx/html
COPY packages/admin-web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
