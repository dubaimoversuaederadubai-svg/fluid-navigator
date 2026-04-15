# Fluid Navigator — AWS Deployment Guide

  ## System Requirements
  - Ubuntu 20.04+
  - Node.js 20+
  - PostgreSQL 14+

  ## Step 1: Clone the Repo
  ```bash
  git clone https://github.com/dubaimoversuaederadubai-svg/fluid-navigator.git
  cd fluid-navigator
  ```

  ## Step 2: Install pnpm (if not installed)
  ```bash
  npm install -g pnpm
  ```

  ## Step 3: Install PM2 (if not installed)
  ```bash
  npm install -g pm2
  ```

  ## Step 4: Install Dependencies
  ```bash
  pnpm install
  ```

  ## Step 5: Setup PostgreSQL Database
  ```bash
  sudo apt update && sudo apt install -y postgresql postgresql-contrib
  sudo systemctl start postgresql
  sudo -u postgres psql -c "CREATE USER fluiduser WITH PASSWORD 'fluidpass123';"
  sudo -u postgres psql -c "CREATE DATABASE fluidnav OWNER fluiduser;"
  ```

  ## Step 6: Run Database Migrations (creates all tables)
  ```bash
  cd lib/db
  DATABASE_URL="postgresql://fluiduser:fluidpass123@localhost:5432/fluidnav" pnpm exec drizzle-kit push
  cd ../..
  ```

  ## Step 7: Build the API Server
  ```bash
  pnpm --filter @workspace/api-server run build
  ```

  ## Step 8: Create PM2 Ecosystem File
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
        DATABASE_URL: 'postgresql://fluiduser:fluidpass123@localhost:5432/fluidnav',
        TWILIO_ACCOUNT_SID: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        TWILIO_AUTH_TOKEN: 'your_auth_token_here',
        TWILIO_PHONE_NUMBER: '+1xxxxxxxxxx'
      }
    }]
  };
  EOF
  ```

  > **NOTE:** Replace TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER with your real values from https://console.twilio.com

  ## Step 9: Start with PM2
  ```bash
  pm2 start ecosystem.config.cjs
  pm2 save
  pm2 startup
  ```

  ## Step 10: Test
  ```bash
  curl http://localhost:8080/api/healthz
  # Should return: {"status":"ok"}
  ```

  ## AWS Security Group Rules
  Open these ports in your AWS Security Group:
  - **Port 8080** — API server (TCP inbound from 0.0.0.0/0)
  - **Port 22** — SSH

  ## Update the APK with EC2 IP
  After deployment, tell Replit agent your EC2 IP so the APK can be rebuilt to connect to your server.

  ## Twilio Setup
  1. Go to https://console.twilio.com
  2. Get Account SID + Auth Token from dashboard
  3. Get a phone number from "Phone Numbers" section
  4. Add all 3 values to ecosystem.config.cjs
  5. Restart: `pm2 restart fluid-navigator-api`

  ## Updating After Code Changes
  ```bash
  git pull
  pnpm install
  pnpm --filter @workspace/api-server run build
  pm2 restart fluid-navigator-api
  ```
  