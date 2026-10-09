# syntax=docker/dockerfile:1
# Đóng gói cả 5 app + đồ họa thành một image Caddy (spec 01 mục 7). Dựng bằng:
#   docker compose --env-file deploy/.env -f deploy/docker-compose.yml build
# Biến VITE_* chỉ truyền bằng build args; không chép .env* vào image (xem .dockerignore).

# ---------- Tầng 1: build ----------
FROM node:22-slim AS build
WORKDIR /repo

# pnpm đúng phiên bản trong package.json ("packageManager") qua corepack
RUN corepack enable

# Tải sẵn thư viện theo lockfile (lớp này được cache nếu lockfile không đổi)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch

COPY . .
RUN pnpm install --frozen-lockfile --offline

# Kiểm tra trước khi build: đỏ thì dừng, không tạo image. (Chạy trước khi khai báo ARG để test không thấy biến của bản thật.)
RUN pnpm check:text && pnpm test

# Biến công khai của frontend (khóa publishable của Supabase được phép để ở frontend; KHÔNG truyền service role).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_USERNAME_EMAIL_DOMAIN
ARG VITE_COOKIE_DOMAIN
ARG VITE_ASSETS_URL
ARG VITE_HUB_URL
ARG VITE_LANG_GIAY_URL
ARG VITE_LANG_DET_URL
ARG VITE_LANG_KHAC_DAU_URL
ARG VITE_LANG_BAC_URL
ARG VITE_MERGED=false
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_USERNAME_EMAIL_DOMAIN=$VITE_USERNAME_EMAIL_DOMAIN \
    VITE_COOKIE_DOMAIN=$VITE_COOKIE_DOMAIN \
    VITE_ASSETS_URL=$VITE_ASSETS_URL \
    VITE_HUB_URL=$VITE_HUB_URL \
    VITE_LANG_GIAY_URL=$VITE_LANG_GIAY_URL \
    VITE_LANG_DET_URL=$VITE_LANG_DET_URL \
    VITE_LANG_KHAC_DAU_URL=$VITE_LANG_KHAC_DAU_URL \
    VITE_LANG_BAC_URL=$VITE_LANG_BAC_URL \
    VITE_MERGED=$VITE_MERGED

RUN pnpm build

# ---------- Tầng 2: chạy ----------
FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/hub/dist /srv/hub
COPY --from=build /repo/apps/lang-giay/dist /srv/lang-giay
COPY --from=build /repo/apps/lang-det/dist /srv/lang-det
COPY --from=build /repo/apps/lang-khac-dau/dist /srv/lang-khac-dau
COPY --from=build /repo/apps/lang-bac/dist /srv/lang-bac
COPY --from=build /repo/assets-build /srv/assets

EXPOSE 8081 8082 8083 8084 8085 8086
