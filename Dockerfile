FROM node:26-alpine

WORKDIR /app
# load .env as well and let dotconfig include
ADD . /app

RUN npm install --omit=dev

CMD [ "npm", "start" ]