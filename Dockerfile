FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package.json
RUN npm install

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server ./server
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "server/src/main/server.js"]
