FROM node:18

RUN apt-get update && apt-get install -y postgresql postgresql-contrib

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 5432

CMD service postgresql start && npm start
