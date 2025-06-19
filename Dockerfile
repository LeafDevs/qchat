# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Remove dev dependencies and build tools to reduce image size
RUN npm prune --production
RUN apk del python3 make g++

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
