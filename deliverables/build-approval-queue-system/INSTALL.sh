#!/bin/bash

# Approval Queue System - Installation Script
# This script copies all files from the approval queue system to Mission Control

set -e

# Configuration
PROJECT_ROOT="/Users/chipai/workshop"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="$PROJECT_ROOT/.approval-queue-backup-$(date +%Y%m%d-%H%M%S)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Approval Queue System - Installation Script                ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Mission Control directory exists
if [ ! -d "$PROJECT_ROOT" ]; then
    echo -e "${RED}✗ Mission Control directory not found: $PROJECT_ROOT${NC}"
    exit 1
fi

echo -e "${YELLOW}ℹ Source directory: $SOURCE_DIR${NC}"
echo -e "${YELLOW}ℹ Target directory: $PROJECT_ROOT${NC}"
echo ""

# Confirmation
read -p "Continue installation? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 1
fi

echo ""
echo -e "${BLUE}Creating backup...${NC}"
mkdir -p "$BACKUP_DIR"

# Backup existing files if they exist
if [ -f "$PROJECT_ROOT/src/lib/approval-queue.ts" ]; then
    cp -r "$PROJECT_ROOT/src/lib/approval-queue.ts" "$BACKUP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/src/lib/slack-notifications.ts" "$BACKUP_DIR/" 2>/dev/null || true
    cp -r "$PROJECT_ROOT/src/app/api/approvals" "$BACKUP_DIR/" 2>/dev/null || true
    echo -e "${GREEN}✓ Backup created: $BACKUP_DIR${NC}"
else
    echo -e "${YELLOW}ℹ No existing files to backup${NC}"
fi

echo ""
echo -e "${BLUE}Installing files...${NC}"

# 1. Library files
echo -e "${BLUE}  Installing library files...${NC}"
mkdir -p "$PROJECT_ROOT/src/lib"
cp "$SOURCE_DIR/lib/approval-queue.ts" "$PROJECT_ROOT/src/lib/"
cp "$SOURCE_DIR/lib/slack-notifications.ts" "$PROJECT_ROOT/src/lib/"
echo -e "${GREEN}  ✓ Library files installed${NC}"

# 2. API endpoints
echo -e "${BLUE}  Installing API endpoints...${NC}"
mkdir -p "$PROJECT_ROOT/src/app/api/approvals/[id]/approve"
mkdir -p "$PROJECT_ROOT/src/app/api/approvals/[id]/reject"
cp "$SOURCE_DIR/api/approvals/route.ts" "$PROJECT_ROOT/src/app/api/approvals/"
cp "$SOURCE_DIR/api/approvals/[id]/route.ts" "$PROJECT_ROOT/src/app/api/approvals/[id]/"
cp "$SOURCE_DIR/api/approvals/[id]/approve/route.ts" "$PROJECT_ROOT/src/app/api/approvals/[id]/approve/"
cp "$SOURCE_DIR/api/approvals/[id]/reject/route.ts" "$PROJECT_ROOT/src/app/api/approvals/[id]/reject/"
echo -e "${GREEN}  ✓ API endpoints installed${NC}"

# 3. Components
echo -e "${BLUE}  Installing UI components...${NC}"
mkdir -p "$PROJECT_ROOT/src/components"
cp "$SOURCE_DIR/components/ApprovalQueueWidget.tsx" "$PROJECT_ROOT/src/components/"
echo -e "${GREEN}  ✓ UI components installed${NC}"

# 4. Pages
echo -e "${BLUE}  Installing pages...${NC}"
mkdir -p "$PROJECT_ROOT/src/app/approvals"
cp "$SOURCE_DIR/pages/approvals/page.tsx" "$PROJECT_ROOT/src/app/approvals/"
echo -e "${GREEN}  ✓ Pages installed${NC}"

# 5. Tests
echo -e "${BLUE}  Installing tests...${NC}"
mkdir -p "$PROJECT_ROOT/tests"
cp "$SOURCE_DIR/tests/approval-queue.test.ts" "$PROJECT_ROOT/tests/"
cp "$SOURCE_DIR/tests/api-integration.test.ts" "$PROJECT_ROOT/tests/"
echo -e "${GREEN}  ✓ Tests installed${NC}"

# 6. Documentation
echo -e "${BLUE}  Installing documentation...${NC}"
cp "$SOURCE_DIR/README.md" "$PROJECT_ROOT/APPROVAL-QUEUE-README.md"
cp "$SOURCE_DIR/SETUP.md" "$PROJECT_ROOT/APPROVAL-QUEUE-SETUP.md"
cp "$SOURCE_DIR/MANIFEST.md" "$PROJECT_ROOT/APPROVAL-QUEUE-MANIFEST.md"
echo -e "${GREEN}  ✓ Documentation installed${NC}"

# 7. Examples
echo -e "${BLUE}  Installing examples...${NC}"
mkdir -p "$PROJECT_ROOT/examples"
cp "$SOURCE_DIR/examples/agent-integration.ts" "$PROJECT_ROOT/examples/approval-queue-agent-integration.ts"
echo -e "${GREEN}  ✓ Examples installed${NC}"

# 8. Environment template
echo -e "${BLUE}  Installing configuration template...${NC}"
cp "$SOURCE_DIR/.env.example" "$PROJECT_ROOT/.env.approval-queue.example"
echo -e "${GREEN}  ✓ Configuration template installed${NC}"

echo ""
echo -e "${BLUE}Creating queue directory structure...${NC}"
mkdir -p "/data/approval-queue/pending"
mkdir -p "/data/approval-queue/approved"
mkdir -p "/data/approval-queue/rejected"
chmod 755 "/data/approval-queue"
echo -e "${GREEN}✓ Queue directory created: /data/approval-queue${NC}"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Installation Complete! ✓                                   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}Next steps:${NC}"
echo "  1. Configure environment variables:"
echo "     • Edit: $PROJECT_ROOT/.env.local"
echo "     • Add: SLACK_BOT_TOKEN and SLACK_APPROVER_USER_ID (optional)"
echo "     • Template: $PROJECT_ROOT/.env.approval-queue.example"
echo ""
echo "  2. Start the development server:"
echo "     cd $PROJECT_ROOT"
echo "     npm run dev"
echo ""
echo "  3. Test the system:"
echo "     • Dashboard: http://localhost:3000/approvals"
echo "     • API: curl http://localhost:3000/api/approvals"
echo ""
echo "  4. View documentation:"
echo "     • $PROJECT_ROOT/APPROVAL-QUEUE-README.md"
echo "     • $PROJECT_ROOT/APPROVAL-QUEUE-SETUP.md"
echo "     • $PROJECT_ROOT/APPROVAL-QUEUE-MANIFEST.md"
echo ""

if [ -d "$BACKUP_DIR" ] && [ "$(ls -A "$BACKUP_DIR")" ]; then
    echo -e "${YELLOW}✓ Backup available at: $BACKUP_DIR${NC}"
fi

echo ""
echo -e "${GREEN}Happy approving! 🚀${NC}"
