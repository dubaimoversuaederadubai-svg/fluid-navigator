# Fluid Navigator — AWS Deployment Guide

  ## System Requirements
  - Ubuntu 20.04+
  - Node.js 20+
  - PostgreSQL 14+
  - PM2 (npm install -g pm2)
  - pnpm (npm install -g pnpm)

  ## Step 1: Clone the Repo
  ```bash
  git clone https://github.com/dubaimoversuaederadubai-svg/fluid-navigator.git
  cd fluid-navigator
  ```

  ## Step 2: Install Dependencies
  ```bash
  pnpm install
  ```

  ## Step 3: Setup Environment Variables
  ```bash
  cp .env.example artifacts/api-server/.env
  nano artifacts/api-server/.env
  ```

  Edit the .env file with your values.

  ## Step 4: Setup Database
  ```bash
  # Create PostgreSQL database
  sudo -u postgres psql -c "CREATE USER fluiduser WITH PASSWORD 'yourpassword';"
  sudo -u postgres psql -c "CREATE DATABASE fluidnav OWNER fluiduser;"

  # Run migrations (creates all tables)
  cd lib/db
  DATABASE_URL="postgresql://fluiduser:yourpassword@localhost:5432/fluidnav" npx drizzle-kit push
  cd ../..
  ```

  ## Step 5: Build the API Server
  ```bash
  pnpm --filter @workspace/api-server run build
  ```

  ## Step 6: Create PM2 Ecosystem File
  ```bash
  cat > ecosystem.config.cjs << 'EOF'
  module.exports = {
    apps: [{
      name: 'fluid-navigator-api',
      script: 'node',
      args: '--enable-source-maps artifacts/api-server/dist/index.mjs',
      cwd: '/home/ubuntu/fluid-navigator',
      env: {
        PORT: '8080',
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://fluiduser:yourpassword@localhost:5432/fluidnav',
        TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        TWILIO_AUTH_TOKEN: 'your_auth_token_here',
        TWILIO_PHONE_NUMBER: '+1xxxxxxxxxx'
      }
    }]
  };
  EOF
  ```

  ## Step 7: Start with PM2
  ```bash
  pm2 start ecosystem.config.cjs
  pm2 save
  pm2 startup
  ```

  ## Step 8: Test
  ```bash
  curl http://localhost:8080/api/healthz
  # Should return: {"status":"ok"}
  ```

  ## AWS Security Group Rules
  Open these ports in your AWS Security Group:
  - **Port 8080** — API server (TCP inbound from 0.0.0.0/0)
  - **Port 22** — SSH

  ## Update the APK
  After deployment, update `artifacts/mobile/eas.json`:
  ```json
  "EXPO_PUBLIC_API_URL": "http://YOUR_EC2_IP:8080"
  ```

  Then rebuild: `npx eas-cli build --platform android --profile preview --non-interactive`

  ## Twilio Setup
  1. Go to https://console.twilio.com
  2. Get your Account SID + Auth Token from dashboard
  3. Get a phone number from "Phone Numbers" section
  4. Add all 3 values to ecosystem.config.cjs
  5. Restart: `pm2 restart fluid-navigator-api`
  