#!/bin/bash
# Capture build information before build

# Get version from package.json
VERSION=$(jq -r '.version' package.json)

# Get short git hash (7 characters)
GIT_HASH=$(git rev-parse --short=7 HEAD 2>/dev/null || echo "unknown")

# Get deploy number (increment counter, or use environment variable)
DEPLOY_NUM=${NEXT_PUBLIC_DEPLOY_NUM:-$(date +%s | tail -c 4)}

echo "=== Build Info ==="
echo "VERSION: $VERSION"
echo "GIT_HASH: $GIT_HASH"
echo "DEPLOY_NUM: $DEPLOY_NUM"
echo "=================="

# Export as environment variables for Next.js build
export NEXT_PUBLIC_VERSION="$VERSION"
export NEXT_PUBLIC_GIT_HASH="$GIT_HASH"
export NEXT_PUBLIC_DEPLOY_NUM="$DEPLOY_NUM"

echo "Environment variables set for build"
