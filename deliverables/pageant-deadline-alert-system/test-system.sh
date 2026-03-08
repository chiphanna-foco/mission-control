#!/bin/bash

# Test script for Pageant Deadline Alert System

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "========================================="
echo "Pageant Deadline Alert System - Test Run"
echo "========================================="
echo ""

# Test 1: Check if required files exist
echo "✓ Test 1: Checking files..."
for file in alerts.json slack-config.json alert-engine.mjs dashboard-widget.mjs package.json; do
  if [ -f "$file" ]; then
    echo "  ✅ $file exists"
  else
    echo "  ❌ MISSING: $file"
    exit 1
  fi
done
echo ""

# Test 2: List upcoming pageants
echo "✓ Test 2: List upcoming pageants..."
node alert-engine.mjs --list
echo ""

# Test 3: Check alert status
echo "✓ Test 3: Check alert status..."
node alert-engine.mjs --status
echo ""

# Test 4: Test dashboard widget data
echo "✓ Test 4: Test dashboard widget data..."
node dashboard-widget.mjs | head -30
echo ""

# Test 5: Validate JSON files
echo "✓ Test 5: Validate JSON files..."
for file in alerts.json slack-config.json; do
  if node -e "JSON.parse(require('fs').readFileSync('$file'))" 2>/dev/null; then
    echo "  ✅ $file is valid JSON"
  else
    echo "  ❌ $file has invalid JSON"
    exit 1
  fi
done
echo ""

echo "========================================="
echo "✅ All tests passed!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Configure Slack webhooks in slack-config.json"
echo "2. Add/update pageant deadlines in alerts.json"
echo "3. Set up cron job or PM2 for automatic checks"
echo "4. Test Slack integration: npm run check"
echo ""
