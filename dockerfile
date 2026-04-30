# Use Node.js base image
FROM node:18

# Install yt-dlp and ffmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && pip3 install yt-dlp --break-system-packages

# Install yt-dlp with the necessary impersonation dependencies
RUN pip install "yt-dlp[default,curl-cffi]" --break-system-packages


# Ensure the app can find yt-dlp
#ENV PATH="$PATH:/usr/local/bin"

RUN pip install yt-dlp-get-oauth2


# Create app directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port
EXPOSE 3000

# Start the server
CMD [ "node", "server/server.js" ]


