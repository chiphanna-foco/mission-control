# 🚀 Mission Control Deployment Checklist

Use this checklist **every time** you push code updates to ensure no 502 Bad Gateway errors from Cloudflare.

## Pre-Deployment
- [ ] Test changes locally: `npm run dev` and verify at http://localhost:3000
- [ ] All changes committed to git

## Deployment
1. **Stop server gracefully** (optional, but clean):
   ```bash
   pkill -f "next"
   ```

2. **Pull latest code** (if using git):
   ```bash
   cd /Users/chipai/Documents/mission-control && git pull
   ```

3. **Hard restart** (always do this after code changes):
   ```bash
   pkill -9 -f "next" && pkill -9 -f "npm" && sleep 4 && \
   cd /Users/chipai/Documents/mission-control && \
   PORT=3000 npm run dev > /tmp/mission-control.log 2>&1 &
   ```

## Post-Deployment Verification ⚠️ **REQUIRED**
4. **Wait for startup** (6 seconds minimum):
   ```bash
   sleep 6
   ```

5. **Verify server is responding**:
   ```bash
   curl -s http://localhost:3000 | head -5
   ```
   ✅ Should see HTML starting with `<!DOCTYPE html>`  
   ❌ If you see "Connection refused" or errors → **STOP** and troubleshoot

6. **Verify via health check**:
   ```bash
   bash /Users/chipai/Documents/mission-control/scripts/health-check.sh
   ```
   ✅ Should output "Server healthy (HTTP 200)"

7. **Test Cloudflare tunnel** (if accessible):
   - Visit your public Cloudflare URL
   - Should NOT show 502 Bad Gateway
   - If it does → wait 30 seconds and retry (tunnel may be reconnecting)

## Automated Monitoring
✅ Auto-health check runs every 5 minutes:
- Script: `/Users/chipai/Documents/mission-control/scripts/health-check.sh`
- Scheduler: macOS LaunchAgent
- Will auto-restart server if port 3000 becomes unresponsive
- Logs: `/tmp/mission-control-health.log`

**To manually check health status:**
```bash
tail /tmp/mission-control-health.log
```

## Troubleshooting

**Symptom:** 502 Bad Gateway from Cloudflare  
**Action:** Run hard restart (step 3 above) then re-verify

**Symptom:** `Address already in use` error  
**Action:** Kill all node processes:
```bash
pkill -9 -f "node"
pkill -9 -f "next"
pkill -9 -f "npm"
sleep 4
```
Then restart.

**Symptom:** Server starts but stays slow  
**Action:** Check logs:
```bash
tail -50 /tmp/mission-control.log
```

## Quick One-Liner Deploy
Copy/paste this for fastest deployment + verification:
```bash
pkill -9 -f "next" && pkill -9 -f "npm" && sleep 4 && \
cd /Users/chipai/Documents/mission-control && \
PORT=3000 npm run dev > /tmp/mission-control.log 2>&1 & \
sleep 6 && echo "Verifying..." && \
curl -s http://localhost:3000 | head -5 && \
bash scripts/health-check.sh && \
echo "✓ Deployment complete!"
```

---
**Last updated:** 2026-03-05  
**Cloudflare tunnel status:** Always check your dashboard if 502 persists  
**Emergency contact:** Check with Chip if all troubleshooting steps fail
