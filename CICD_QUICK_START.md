# CI/CD Quick Start Guide

## What Was Created

✅ **GitHub Actions Workflow** (`.github/workflows/deploy.yml`)
- Triggers on push to `ismail-admin-panel` branch
- Automatically deploys to server via SSH

✅ **Deployment Script** (`scripts/deploy.sh`)
- Handles backend deployment (PM2 restart)
- Handles frontend deployment (build + Nginx update)
- Preserves server-specific files (`.env`, PM2 config, Nginx config)

✅ **Environment Setup Scripts**
- `scripts/setup-server-env.sh` - Initial server setup
- `scripts/env-config.sh` - Environment variable helper

✅ **Updated `.gitignore`**
- Excludes server-specific files from git
- Preserves `.env` files during deployment

## Quick Setup (5 Steps)

### 1. Generate SSH Key (Local Machine)

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com" -f ~/.ssh/admin-panel-deploy
```

### 2. Add Public Key to Server

```bash
# On local machine - copy public key
cat ~/.ssh/admin-panel-deploy.pub

# On server - add to authorized_keys
echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys
```

### 3. Add GitHub Secrets

Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

Add these secrets:
- `SERVER_HOST`: `209.208.79.172`
- `SERVER_USER`: `root`
- `SERVER_SSH_KEY`: (Copy entire private key: `cat ~/.ssh/admin-panel-deploy`)
- `SERVER_PORT`: `22` (optional)

### 4. Setup Server Environment (On Server)

```bash
cd ~/admin-pannel/admin-panel
bash scripts/setup-server-env.sh
# Then manually update .env files with your actual credentials
```

### 5. Test Deployment

```bash
# Make a change and push
git add .
git commit -m "Test CI/CD"
git push ismail ismail-admin-panel
```

Check **GitHub → Actions** tab to see deployment progress!

## How It Works

1. **Push to GitHub** → Triggers workflow
2. **GitHub Actions** → Connects to server via SSH
3. **Deploy Script** → Runs on server:
   - Backs up server files (`.env`, PM2 config, Nginx config)
   - Pulls latest code from GitHub
   - Restores server files (so they're not overwritten)
   - Deploys backend (npm install + PM2 restart)
   - Deploys frontend (npm install + test + build + Nginx update)

## Environment Variables

**Code uses fallback pattern:**
```javascript
process.env.CLIENT_URL || 'http://localhost:3000'
```

**Server `.env` files override with server IP:**
```bash
# backend/.env (on server)
CLIENT_URL=http://209.208.79.172:8080

# front-end/.env (on server)
REACT_APP_Server_Url=http://209.208.79.172:5000/api
```

**Result:**
- Local development: Uses `localhost`
- Server deployment: Uses server IP
- No code changes needed!

## Preserved Files

These files are **never** committed to git and **always** preserved during deployment:

- `backend/.env` - Backend environment variables
- `front-end/.env` - Frontend environment variables
- `ecosystem.config.cjs` - PM2 configuration
- `/etc/nginx/sites-available/default` - Nginx configuration

## Troubleshooting

### Deployment Fails
1. Check **GitHub Actions** logs
2. Verify SSH key is correct
3. Test SSH connection manually: `ssh -i ~/.ssh/admin-panel-deploy root@209.208.79.172`

### Backend Not Restarting
```bash
# On server
pm2 list
pm2 restart backend-api
pm2 logs backend-api
```

### Frontend Not Updating
```bash
# On server
cd ~/admin-pannel/admin-panel/front-end
npm run build
sudo systemctl reload nginx
```

## Manual Deployment

If you need to deploy manually:

```bash
# SSH into server
ssh root@209.208.79.172

# Run deploy script
cd ~/admin-pannel/admin-panel
bash scripts/deploy.sh
```

## Full Documentation

See `CICD_SETUP.md` for detailed setup instructions.

