# Production image for the workspace UI: build with Node, serve with
# nginx. The runtime carries static files only — no Node, no sources.

FROM node:22-alpine AS builder

WORKDIR /build

# Dependencies are installed from the lockfile alone, so this layer is
# reused whenever only application sources change.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1/ || exit 1
