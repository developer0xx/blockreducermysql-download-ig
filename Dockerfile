FROM node:10.13.0
RUN mkdir -p /BlockReducer/BlockReducer/mysql/download
WORKDIR /BlockReducer/BlockReducer/mysql/download
COPY package.json /BlockReducer/BlockReducer/mysql/download
COPY package-lock.json /BlockReducer/BlockReducer/mysql/download
RUN npm install
COPY . /BlockReducer/BlockReducer/mysql/download
CMD ["npm", "start"]
