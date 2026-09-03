FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.seed.json nest-cli.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

RUN apk add --no-cache openssl

COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund \
  && npm cache clean --force

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-seed ./dist-seed
COPY prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh \
  && addgroup -g 1001 -S nodejs \
  && adduser -S nestjs -u 1001 \
  && chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 4000

ENTRYPOINT ["./docker-entrypoint.sh"]
