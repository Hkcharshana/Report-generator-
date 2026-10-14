FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency definition files
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci --omit=dev

# Copy the rest of the application files
COPY . .

# Expose server port
EXPOSE 1516

# Set default port environment variable
ENV PORT=1516

# Start the application
CMD ["npm", "start"]
