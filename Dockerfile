FROM node:slim

WORKDIR /app

# Copy only package.json and package-lock.json first
COPY package*.json ./

# Run npm install to sync the package-lock.json
RUN npm install

# Copy the rest of the application files
COPY . .

# Run npm ci to ensure a clean and reproducible installation
RUN npm ci

ARG PORT
EXPOSE ${PORT:-3000}

CMD ["npm", "run", "start"]
