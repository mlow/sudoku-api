# dev stage
FROM node:14-alpine as dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# build stage
FROM dev as build
RUN npx tsc && npm prune --production

# production stage
FROM node:14-alpine
WORKDIR /app

RUN apk add --update --no-cache util-linux

# Copy over production modules and dist folder
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 4000

CMD [ "node", "dist/main.js" ]
