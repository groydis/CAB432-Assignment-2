FROM node:carbon
MAINTAINER greyden
ADD . /App
EXPOSE 3001
WORKDIR /App
ENV NODE_ENV production
RUN npm install
CMD npm start