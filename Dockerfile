# syntax=docker/dockerfile:1

# Многоэтапная сборка: отдельно собираем фронтенд и бэкенд, а в финальный
# образ кладём только то, что нужно для запуска. Так образ меньше и чище.
# Зависимости ставим через `npm install` (а не `npm ci`), т.к. в репозитории
# нет package-lock.json.

# ---------- Этап 1: сборка фронтенда (Vite -> client/dist) ----------
FROM node:20-alpine AS client-build
WORKDIR /app/client
# Сначала манифест — слой с зависимостями кешируется, пока он не менялся.
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# ---------- Этап 2: сборка бэкенда (TypeScript -> server/dist) ----------
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json ./
RUN npm install
COPY server/ ./
RUN npm run build

# ---------- Этап 3: рантайм ----------
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=41321
WORKDIR /app

# Только production-зависимости сервера.
COPY server/package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Скомпилированный сервер + собранный фронтенд (его сервер отдаёт из ./public).
COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist ./public

EXPOSE 41321

# Healthcheck по нашему /api/health (в Node 20 есть глобальный fetch).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||41321)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
