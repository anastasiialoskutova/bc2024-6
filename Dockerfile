FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 9229
EXPOSE 3000
CMD ["npx", "nodemon", "main.js", "--host", "0.0.0.0", "--port", "3000", "--cache", "./cache"]