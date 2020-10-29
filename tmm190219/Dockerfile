FROM node:12
MAINTAINER msmong <01191318447@naver.com>

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "app.js"]
