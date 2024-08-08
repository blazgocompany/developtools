FROM node:slim

WORKDIR /app

# Copy only package.json and package-lock.json first
COPY package*.json ./

# Run npm install to sync the package-lock.json
RUN npm install

# Copy the rest of the application files
COPY . .

ARG PORT
EXPOSE ${PORT:-3000}

CMD ["npm", "run", "start"]
