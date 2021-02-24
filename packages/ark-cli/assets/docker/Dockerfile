FROM node:14.16-slim

WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH

RUN apt-get update -y
RUN apt-get install python -y
RUN apt-get install build-essential -y

COPY package.json ./
COPY package-lock.json ./
RUN npm install
COPY . ./
RUN npm run build

EXPOSE 3000

CMD ["node", "./build/server/main.js"]