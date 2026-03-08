#!/bin/bash

# Email Triage System - LaunchD Installation Script
# Installs 3 launchd jobs for 8 AM, 12 PM, and 5 PM runs

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
LAUNCHD_DIR="$PROJECT_DIR/.launchd"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"

echo -e "${GREEN}=== Email Triage System - LaunchD Setup ===${NC}\n"

# Check Node.js
NODE_PATH=$(which node)
if [ -z "$NODE_PATH" ]; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Found Node.js: $NODE_PATH${NC}"

# Create logs directory
mkdir -p "$PROJECT_DIR/logs"
echo -e "${GREEN}✅ Created logs directory${NC}"

# Create results directory
mkdir -p "$PROJECT_DIR/results"
echo -e "${GREEN}✅ Created results directory${NC}"

# Make script executable
chmod +x "$PROJECT_DIR/scripts/email-triage.js"
echo -e "${GREEN}✅ Made script executable${NC}"

# Create Launch Agents directory if it doesn't exist
mkdir -p "$LAUNCH_AGENTS_DIR"

# Install 3 LaunchD jobs
for plist in "$LAUNCHD_DIR"/*.plist; do
    plist_name=$(basename "$plist")
    label=$(basename "$plist" .plist)
    target_path="$LAUNCH_AGENTS_DIR/$plist_name"
    
    echo -e "\n${YELLOW}Installing $plist_name...${NC}"
    
    # Check if already installed
    if [ -f "$target_path" ]; then
        echo "  Unloading existing job..."
        launchctl unload "$target_path" 2>/dev/null || true
    fi
    
    # Copy plist file
    cp "$plist" "$target_path"
    echo "  Copied to: $target_path"
    
    # Update paths in plist (if needed)
    # Use sed to replace paths if they're different
    
    # Load job
    launchctl load "$target_path"
    echo -e "  ${GREEN}✅ Loaded: $label${NC}"
done

# Verify installation
echo -e "\n${YELLOW}Verifying installation...${NC}"
echo "Loaded LaunchD jobs:"
launchctl list | grep email-triage

echo -e "\n${GREEN}=== Installation Complete ===${NC}\n"

echo "Next steps:"
echo "1. Set up Gmail API credentials:"
echo "   - Download service-account.json from Google Cloud Console"
echo "   - Place in: $PROJECT_DIR/service-account.json"
echo ""
echo "2. Configure .env.local:"
echo "   - cp $PROJECT_DIR/.env.example $PROJECT_DIR/.env.local"
echo "   - Edit with your Gmail API key file path"
echo ""
echo "3. Test installation:"
echo "   - Run manually: node $PROJECT_DIR/scripts/email-triage.js"
echo "   - Check logs: tail -f $PROJECT_DIR/logs/morning.log"
echo ""
echo "4. Monitor scheduled runs:"
echo "   - Morning: tail -f $PROJECT_DIR/logs/morning.log"
echo "   - Noon: tail -f $PROJECT_DIR/logs/noon.log"
echo "   - Evening: tail -f $PROJECT_DIR/logs/evening.log"
echo ""
echo "5. Manually trigger a job:"
echo "   - launchctl start com.mission-control.email-triage-morning"
echo ""
echo "For help: see README.md and TROUBLESHOOTING.md"
