# Mission Control on Railway — Security Guide

This document covers the secure deployment of Mission Control to Railway.

## 🔒 Pre-Deployment Checklist

### 1. Generate Secure Environment Variables

Run these commands to generate cryptographically secure secrets:

```bash
# Session secret (min 32 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Railway Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
cd /Users/chipai/Documents/mission-control
railway init
```

### 3. Set Environment Variables in Railway

```bash
# Via CLI
railway variables set NODE_ENV production
railway variables set SESSION_SECRET <your-generated-secret>
railway variables set JWT_SECRET <your-generated-secret>
railway variables set ENCRYPTION_KEY <your-generated-secret>
railway variables set DATABASE_URL /data/mission-control.db
railway variables set CORS_ORIGINS "https://mc.chip-hanna.com"
railway variables set LOG_LEVEL info
```

**OR via Dashboard:**
1. Go to Railway Dashboard
2. Select mission-control project
3. Settings → Variables
4. Add each variable (never paste into code!)

### 4. Database Setup

Railway automatically provisions persistent volumes. Your SQLite database will be stored at `/data/mission-control.db`.

**Migration from Mac:**
```bash
# Export from Mac
sqlite3 /Users/chipai/Documents/mission-control/mission-control.db ".backup /tmp/mc-backup.db"

# Upload to Railway via CLI
railway run "sqlite3 /data/mission-control.db < /tmp/mc-backup.db"
```

### 5. Deploy

```bash
# Deploy to Railway
railway up

# Get your public URL
railway open
```

Railway will provide a URL like: `https://mission-control-xxxx.railway.app`

---

## 🛡️ Security Features

### Built-In Protections

✅ **HTTPS/TLS** — Automatically enforced by Railway  
✅ **Security Headers** — Set in `next.config.js`:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000

✅ **Rate Limiting** — Implemented in `/src/lib/security.ts` (100 req/min default)  
✅ **CORS Validation** — Whitelisted origins only  
✅ **Input Sanitization** — Removes dangerous characters  
✅ **No Sensitive Data in Logs** — Use `LOG_LEVEL=info` in production

### Database Security

✅ **Persistent Volume** — SQLite stored in Railway's managed storage  
✅ **Automatic Backups** — (Configure via Railway Dashboard)  
✅ **No Exposed Credentials** — Database path via environment variable only  
✅ **Encryption at Rest** — Managed by Railway infrastructure

### API Security

✅ **Rate Limiting** — 100 requests/minute per IP  
✅ **CORS Whitelist** — Only allow `mc.chip-hanna.com`  
✅ **Content Validation** — JSON payloads validated before processing  
✅ **Security Middleware** — Enforced on all `/api/*` routes

---

## 📋 Post-Deployment

### 1. Update DNS

Update your Cloudflare DNS to point to Railway:

```
CNAME mc → mission-control-xxxx.railway.app
```

(You can remove the Cloudflare tunnel after verifying this works)

### 2. Test Security

```bash
# Check security headers
curl -I https://mc.chip-hanna.com

# Response should include:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000
```

### 3. Monitor Logs

```bash
# View real-time logs
railway logs

# Filter for errors
railway logs | grep ERROR
```

### 4. Set Up Backups

Via Railway Dashboard:
1. Select mission-control project
2. Settings → Backups
3. Enable automatic daily backups
4. Configure 30-day retention

---

## 🚨 Security Best Practices

### Environment Variables
- ✅ Always use Railway Dashboard (never paste in terminal history)
- ✅ Rotate secrets every 90 days
- ✅ Never commit `.env` file (use `.env.example` only)

### Monitoring
```bash
# Check for unusual activity in logs
railway logs | grep "WARN\|ERROR"

# Monitor rate limit hits
railway logs | grep "429"
```

### Incident Response
1. Check logs immediately: `railway logs`
2. If compromised: Rotate all secrets
3. Review audit logs (if enabled)
4. Consider database snapshot/restore

---

## 🔄 Disaster Recovery

### Backup Strategy

**Automatic:** Railway handles daily snapshots  
**Manual:** Export via CLI before major changes

```bash
# Backup SQLite to local machine
railway run "sqlite3 /data/mission-control.db '.backup /backup.db'"
railway variables get BACKUP_PATH

# Download backup
scp -r $RAILWAY_USER@$RAILWAY_HOST:/backup.db ~/mission-control-backup.db
```

### Restore from Backup

```bash
# Upload backup file
railway run "sqlite3 /data/mission-control.db < /backup.db"

# Verify
railway run "sqlite3 /data/mission-control.db 'SELECT COUNT(*) FROM sqlite_master;'"
```

---

## 📊 Monitoring Checklist

Daily:
- [ ] Check logs for errors: `railway logs --follow`
- [ ] Verify HTTPS certificate is valid
- [ ] Monitor uptime via Railway Dashboard

Weekly:
- [ ] Review security headers with curl
- [ ] Check rate limit metrics
- [ ] Verify backup completion

Monthly:
- [ ] Rotate JWT/session secrets
- [ ] Audit environment variables
- [ ] Review access logs

---

## 🎯 Next Steps

1. ✅ Generate secrets (see above)
2. ✅ Deploy to Railway (`railway up`)
3. ✅ Test at your Railway URL
4. ✅ Update Cloudflare DNS
5. ✅ Verify security headers
6. ✅ Enable backups in Railway
7. ✅ Retire Cloudflare tunnel (stop on Mac)

**Questions?** Check Railway docs: https://docs.railway.app
