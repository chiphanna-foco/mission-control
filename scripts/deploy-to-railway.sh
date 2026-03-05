#!/bin/bash
# Mission Control → Railway Deployment Script
# Handles secure deployment with proper environment setup

set -e

echo "🚀 Mission Control Railway Deployment"
echo "====================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v railway >/dev/null 2>&1 || { echo -e "${RED}✗ Railway CLI not found. Install: npm install -g @railway/cli${NC}"; exit 1; }
command -v git >/dev/null 2>&1 || { echo -e "${RED}✗ Git not found${NC}"; exit 1; }

echo -e "${GREEN}✓ Prerequisites OK${NC}"
echo ""

# Check git status
echo "🔍 Checking git status..."
if ! git diff-index --quiet HEAD --; then
  echo -e "${RED}✗ Uncommitted changes detected${NC}"
  echo "Commit your changes before deploying:"
  echo "  git add ."
  echo "  git commit -m 'Your message'"
  exit 1
fi
echo -e "${GREEN}✓ Git status clean${NC}"
echo ""

# Check .env.example exists
if [ ! -f .env.example ]; then
  echo -e "${RED}✗ .env.example not found${NC}"
  exit 1
fi

# Generate secrets if needed
echo "🔐 Generating secure secrets..."
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo -e "${GREEN}✓ Secrets generated${NC}"
echo ""

# Initialize Railway (if needed)
echo "📦 Initializing Railway project..."
if ! railway status >/dev/null 2>&1; then
  railway init
else
  echo -e "${GREEN}✓ Railway project already initialized${NC}"
fi
echo ""

# Build locally first
echo "🔨 Building project..."
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Set environment variables
echo "⚙️  Setting Railway environment variables..."
railway variables set NODE_ENV production
railway variables set SESSION_SECRET "$SESSION_SECRET"
railway variables set JWT_SECRET "$JWT_SECRET"
railway variables set ENCRYPTION_KEY "$ENCRYPTION_KEY"
railway variables set DATABASE_URL "/data/mission-control.db"
railway variables set LOG_LEVEL "info"
railway variables set CORS_ORIGINS "https://mc.chip-hanna.com"

echo -e "${GREEN}✓ Environment variables set${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Save these secrets securely (password manager, etc.)${NC}"
echo "  SESSION_SECRET: $SESSION_SECRET"
echo "  JWT_SECRET: $JWT_SECRET"
echo "  ENCRYPTION_KEY: $ENCRYPTION_KEY"
echo ""

# Deploy
echo "🚀 Deploying to Railway..."
railway up --detach

echo ""
echo -e "${GREEN}✓ Deployment started${NC}"
echo ""
echo "📊 Getting your Railway URL..."
sleep 10
RAILWAY_URL=$(railway status | grep -oP 'https://[^\s]+' | head -1)

if [ -n "$RAILWAY_URL" ]; then
  echo -e "${GREEN}✓ Your app is deployed at: $RAILWAY_URL${NC}"
else
  echo -e "${YELLOW}⚠️  Unable to auto-detect URL. Check Railway Dashboard:${NC}"
  echo "   https://railway.app"
fi

echo ""
echo "📝 Next steps:"
echo "1. Update your Cloudflare DNS:"
echo "   CNAME mc → $RAILWAY_URL"
echo "2. Verify security headers:"
echo "   curl -I https://mc.chip-hanna.com"
echo "3. Enable backups in Railway Dashboard"
echo "4. Stop the Cloudflare tunnel on your Mac:"
echo "   pkill -f 'cloudflared tunnel'"
echo ""
echo -e "${GREEN}Deployment complete! 🎉${NC}"
