FROM node:lts-alpine
RUN apk add --no-cache curl bash yarn

RUN mkdir -p /home/node/app/node_modules && mkdir -p /home/node/app/src && chown -R node:node /home/node/app

WORKDIR /home/node/app

USER node

COPY package.json ./

COPY yarn.lock ./

COPY index.js ./

COPY .babelrc ./

RUN yarn

COPY --chown=node:node . .

EXPOSE 3000