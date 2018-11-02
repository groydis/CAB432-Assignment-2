FROM node:carbon
MAINTAINER greyden
ADD . /App
WORKDIR /App
ENV NODE_ENV production
RUN npm install
CMD node index.js