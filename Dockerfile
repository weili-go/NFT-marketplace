FROM node:14.17.0
WORKDIR /usr/src/app
COPY ["package.json", "yarn.lock", "./"]
RUN yarn install
COPY . .
RUN yarn build

ENTRYPOINT ["yarn", "dev"]