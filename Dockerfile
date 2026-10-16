FROM node:alpine

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy the rest of the application files
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Start the application
CMD ["npm", "start"]
