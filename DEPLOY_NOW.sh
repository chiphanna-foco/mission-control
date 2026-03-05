#!/bin/bash
# Mission Control → Railway Deployment
# Run this script interactively

set -e

echo "🚀 Mission Control Railway Deployment"
echo "======================================"
echo ""

# Step 1: Login
echo "📍 Step 1: Authenticate with Railway"
echo "=====================================
echo ""
echo "Running: railway login"
echo "(Your browser will open - authenticate and return here)"
echo ""
railway login

# Verify auth
if ! railway status &>/dev/null; then
  echo "❌ Authentication failed"
  exit 1
fi
echo "✅ Successfully authenticated"
echo ""

# Step 2: Initialize project
echo "📍 Step 2: Initialize Railway Project"
echo "====================================="
cd /Users/chipai/Documents/mission-control
echo "Running: railway init"
railway init --exists 2>/dev/null || railway init

echo "✅ Project initialized"
echo ""

# Step 3: Set environment variables
echo "📍 Step 3: Setting Environment Variables"
echo "========================================"
echo ""

VARS=(
  "NODE_ENV=production"
  "SESSION_SECRET=0cd0efa384937a623f88f56a54c87a39ba69e4481cb22d739cec18eb04de19a2"
  "JWT_SECRET=c4a8dc1029c82444a426520ee0cdbf8eb647e0b8b73af9bfc1e3c1fc02a10808"
  "ENCRYPTION_KEY=fcc69a9bd87ae22f87352ef2e994330f1f5bd7a5d0099e52258be069c3c3e347"
  "DATABASE_URL=/data/mission-control.db"
  "LOG_LEVEL=info"
  "CORS_ORIGINS=https://mc.chip-hanna.com"
)

for var in "${VARS[@]}"; do
  echo "Setting: $var"
  railway variable set "$var" || true
done

echo ""
echo "✅ Environment variables set"
echo ""

# Step 4: Deploy
echo "📍 Step 4: Deploying to Railway"
echo "==============================="
echo ""
echo "Running: railway up"
railway up

echo ""
echo "✅ Deployment initiated"
echo ""

# Step 5: Get URL
echo "📍 Step 5: Getting Your Public URL"
echo "=================================="
echo ""
echo "Opening Railway Dashboard..."
echo ""
sleep 3

# Get project details
RAILWAY_URL=$(railway status 2>/dev/null | grep -oP 'https://[^\s]+' | head -1 || echo "Check dashboard")

echo "🎉 Deployment Complete!"
echo ""
echo "Your app URL: $RAILWAY_URL"
echo ""
echo "📝 Next Steps:"
echo "1. Update Cloudflare DNS:"
echo "   CNAME mc → mission-control-xxxx.railway.app"
echo ""
echo "2. Verify HTTPS:"
echo "   curl -I https://mc.chip-hanna.com"
echo ""
echo "3. Enable backups in Railway Dashboard"
echo ""
echo "4. Stop Mac tunnel:"
echo "   pkill -f 'cloudflared tunnel'"
echo ""
echo "✅ All done!"
