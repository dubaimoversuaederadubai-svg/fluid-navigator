#!/bin/bash
# =====================================================
# Fluid Navigator — EC2 HTTPS Setup Script
# Run this on your EC2 server as root/sudo
# EC2 IP: 13.60.191.187
# HTTPS Domain: https://13-60-191-187.sslip.io
# =====================================================

set -e

DOMAIN="13-60-191-187.sslip.io"
API_PORT=3000
REPO="https://github.com/dubaimoversuaederadubai-svg/fluid-navigator.git"
APP_DIR="/home/ubuntu/fluid-navigator"
PM2_NAME="fluid-navigator-api"

echo "======================================"
echo " Fluid Navigator EC2 HTTPS Setup"
echo " Domain: $DOMAIN"
echo "======================================"

# ---- 1. Update system ----
echo "[1/7] Updating system packages..."
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx git curl

# ---- 2. Install Node.js 20 + pnpm ----
echo "[2/7] Installing Node.js + pnpm..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
if ! command -v pnpm &>/dev/null; then
  npm install -g pnpm pm2
fi

# ---- 3. Pull latest code ----
echo "[3/7] Pulling latest code from GitHub..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git pull origin main
else
  git clone "$REPO" "$APP_DIR"
  cd "$APP_DIR"
fi

# ---- 4. Install dependencies & build API ----
echo "[4/7] Installing dependencies..."
cd "$APP_DIR"
pnpm install --frozen-lockfile

echo "Building API server..."
pnpm --filter @workspace/api-server run build

# ---- 5. Set environment variables (edit these!) ----
echo "[5/7] Setting up environment..."
cat > "$APP_DIR/artifacts/api-server/.env.production" << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://fluiduser:fluidpass123@localhost:5432/fluidnav
SESSION_SECRET=fluid-navigator-secret-change-this-in-production
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_FROM_NUMBER=your_twilio_number_here
EOF

echo "NOTE: Edit $APP_DIR/artifacts/api-server/.env.production with your Twilio credentials!"

# ---- 6. Start/Restart PM2 ----
echo "[6/7] Starting API with PM2..."
cd "$APP_DIR/artifacts/api-server"
pm2 delete "$PM2_NAME" 2>/dev/null || true
pm2 start dist/index.mjs --name "$PM2_NAME" --env production \
  --env-file="$APP_DIR/artifacts/api-server/.env.production"
pm2 save
pm2 startup

# ---- 7. Configure nginx ----
echo "[7/7] Configuring nginx reverse proxy..."
cat > /etc/nginx/sites-available/fluid-navigator << NGINX
server {
    listen 80;
    server_name $DOMAIN;
    location / {
        proxy_pass http://localhost:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/fluid-navigator /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# ---- 8. Get SSL Certificate ----
echo "[8] Getting Let's Encrypt SSL certificate..."
echo "NOTE: Make sure port 80 and 443 are OPEN in AWS Security Group!"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
  --email admin@fluidnavigator.pk --redirect

systemctl reload nginx

echo ""
echo "======================================"
echo " HTTPS Setup Complete!"
echo " API URL: https://$DOMAIN"
echo " Test: curl https://$DOMAIN/api/health"
echo "======================================"
