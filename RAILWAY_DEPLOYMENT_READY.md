# Mission Control → Railway Deployment Instructions

## ✅ Pre-Deployment Status
- **Build:** ✅ Complete and tested
- **Security:** ✅ Enterprise hardening applied
- **Secrets:** ✅ Generated and saved securely
- **Configuration:** ✅ Railway config ready

---

## 🔐 Your Generated Secrets (SAVE SECURELY!)

**⚠️ CRITICAL: Save these immediately to a password manager (1Password, Bitwarden, etc.)**

```
SESSION_SECRET=0cd0efa384937a623f88f56a54c87a39ba69e4481cb22d739cec18eb04de19a2
JWT_SECRET=c4a8dc1029c82444a426520ee0cdbf8eb647e0b8b73af9bfc1e3c1fc02a10808
ENCRYPTION_KEY=fcc69a9bd87ae22f87352ef2e994330f1f5bd7a5d0099e52258be069c3c3e347
```

---

## 🚀 Deploy Now (5 steps)

### Step 1: Login to Railway
```bash
railway login
```
This will open your browser. Authenticate and return to terminal.

### Step 2: Initialize Railway Project
```bash
cd /Users/chipai/Documents/mission-control
railway init
```
Select "Create a new project" when prompted.

### Step 3: Set Environment Variables
```bash
railway variable set NODE_ENV=production
railway variable set SESSION_SECRET=0cd0efa384937a623f88f56a54c87a39ba69e4481cb22d739cec18eb04de19a2
railway variable set JWT_SECRET=c4a8dc1029c82444a426520ee0cdbf8eb647e0b8b73af9bfc1e3c1fc02a10808
railway variable set ENCRYPTION_KEY=fcc69a9bd87ae22f87352ef2e994330f1f5bd7a5d0099e52258be069c3c3e347
railway variable set DATABASE_URL=/data/mission-control.db
railway variable set LOG_LEVEL=info
railway variable set CORS_ORIGINS=https://mc.chip-hanna.com
```

### Step 4: Deploy
```bash
railway up
```

### Step 5: Get Your URL
```bash
railway open
```
This opens Railway dashboard. Copy your app's public URL (e.g., `mission-control-xxxx.railway.app`)

---

## 🔗 After Deployment

### 1. Update Cloudflare DNS
Go to Cloudflare Dashboard → your domain:
- Find `mc` CNAME record
- Change target from tunnel to: `mission-control-xxxx.railway.app`
- Save (may take 5-15 min to propagate)

### 2. Verify SSL/HTTPS
```bash
# Should show 200 OK
curl -I https://mc.chip-hanna.com

# Should show these security headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Strict-Transport-Security: max-age=31536000
```

### 3. Enable Backups
- Go to Railway Dashboard
- Select mission-control project
- Settings → Backups
- Enable automatic daily backups
- Set retention to 30 days

### 4. Stop Mac Tunnel (Optional)
Once Cloudflare DNS is updated and working:
```bash
pkill -f "cloudflared tunnel"
```

---

## 📊 Monitoring & Management

### View Logs
```bash
railway logs --follow
```

### Restart Service
```bash
railway restart
```

### View Environment Variables
```bash
railway variable list
```

### Database Access
Your SQLite database is stored in a persistent volume at `/data/mission-control.db`

**To check database size:**
```bash
railway run "du -h /data/mission-control.db"
```

**To backup database:**
```bash
railway run "sqlite3 /data/mission-control.db '.backup /tmp/backup.db'"
railway run "head -c 1000000 /tmp/backup.db" > ~/mission-control-backup.db
```

---

## 🔒 Security Verification Checklist

After deployment, verify:

- [ ] ✅ HTTPS works: `curl -I https://mc.chip-hanna.com`
- [ ] ✅ Security headers present: `curl -I https://mc.chip-hanna.com | grep X-`
- [ ] ✅ No environment variables in logs: `railway logs | grep SECRET`
- [ ] ✅ Database is persisted: `railway run "test -f /data/mission-control.db"`
- [ ] ✅ Backups enabled in Railway Dashboard
- [ ] ✅ Secrets saved in password manager

---

## 🆘 Troubleshooting

**502 Bad Gateway on Cloudflare**
- Wait 15 minutes for DNS propagation
- Check Railway logs: `railway logs`
- Verify environment variables: `railway variable list`

**Database permission errors**
- Check database exists: `railway run "ls -la /data/"`
- Railway automatically manages permissions

**Rate limiting errors**
- Check logs: `railway logs | grep 429`
- Limit is 100 req/min per IP (configurable in CORS_ORIGINS)

---

## 📝 Important Notes

1. **Secrets are now in Railway** — Never commit them to git
2. **Persistent Storage** — Your SQLite database persists across deploys
3. **Auto-Backups** — Enable in Railway Dashboard (recommended)
4. **Monitoring** — Use `railway logs --follow` to watch deployments
5. **Costs** — Free tier available; $5/month for Pro features

---

## 🎯 Next Steps

1. Run `railway login` to authenticate
2. Follow steps 2-5 above to deploy
3. Update Cloudflare DNS
4. Enable backups in Railway
5. Test your app: `https://mc.chip-hanna.com`

**Estimated time: 10-15 minutes total**

---

Questions? See full security guide: [RAILWAY_SECURITY.md](./RAILWAY_SECURITY.md)
