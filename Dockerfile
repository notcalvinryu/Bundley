FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

# Generate the Prisma client against the schema, then build the app.
RUN npx prisma generate
RUN npm run build

# docker-start runs `prisma migrate deploy` then starts the server.
CMD ["npm", "run", "docker-start"]
