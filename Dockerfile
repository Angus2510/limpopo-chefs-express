# Use the official Node.js image from the Docker Hub
FROM node:20.13.1

# Create and set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm install && npm cache clean --force

# Install the application dependencies
RUN npm install && npm cache clean --force

# Install bcrypt and build it from source
RUN npm install bcrypt --build-from-source

# Install Puppeteer dependencies
RUN apt-get update && apt-get install -y \
  gconf-service \
  libasound2 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgconf-2-4 \
  libxss1 \
  lsb-release \
  xdg-utils \
  wget \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxi6 \
  libxtst6 \
  libappindicator1 \
  libxrandr2 \
  libgbm-dev \
  libpangocairo-1.0-0 \
  libpangoft2-1.0-0 \
  libjpeg-dev \
  libgdk-pixbuf2.0-0 \
  libcairo2-dev \
  libpango1.0-0 \
  libgif-dev \
  build-essential \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libnss3 \
  libatk-bridge2.0-0 \
  libgbm1 \
  libgtk-3-0 \
  libxshmfence1

# Install Puppeteer and ensure the correct browser binaries are installed
RUN npm install puppeteer --unsafe-perm=true

# Copy the rest of the application code to the working directory
COPY . .

# Expose port 3500 for the application
EXPOSE 3500

# Install PM2 globally
RUN npm install pm2 -g

# Use PM2 to run the app with auto-restart
CMD ["pm2-runtime", "server.js"]
