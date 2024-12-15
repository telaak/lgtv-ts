FROM node:22-bookworm-slim AS base

WORKDIR /app
COPY . .
RUN apt update && apt install python3 make g++ -y
RUN npm ci
RUN npx tsc

FROM node:22-bookworm-slim AS gyp
WORKDIR /app
COPY --from=base ./app/dist ./dist
COPY package*.json ./
ENV NODE_ENV=production
RUN apt update && apt install python3 make g++ -y
RUN npm ci

FROM node:22-bookworm-slim AS runner
WORKDIR /app
COPY --from=gyp ./app/dist ./dist
COPY --from=gyp ./app/node_modules ./node_modules
COPY package*.json ./
ENV NODE_ENV=production

EXPOSE 3000

CMD [ "node", "./dist/index.js" ]