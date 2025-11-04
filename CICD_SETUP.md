# CI/CD Pipeline Setup Guide

This guide explains how to set up automated deployment using GitHub Actions.

## Overview

The CI/CD pipeline automatically:
- Triggers on push to `ismail-admin-panel` branch
- Deploys backend (pulls code, installs deps, restarts PM2)
- Deploys frontend (pulls code, tests, builds, updates Nginx)
- Preserves server-specific configuration files

## Prerequisites

1. **GitHub Repository**: Code must be pushed to GitHub
2. **Server Access**: SSH access to your server
3. **SSH Key**: SSH key pair for authentication
4. **Server Requirements**: 
   - Node.js and npm installed
   - PM2 installed globally (`npm install -g pm2`)
   - Nginx installed and configured
   - Git installed

## Setup Steps

### 1. Generate SSH Key Pair (if you don't have one)

On your **local machine**:

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com" -f ~/.ssh/admin-panel-deploy
```

This creates:
- `~/.ssh/admin-panel-deploy` (private key - keep this secret!)
- `~/.ssh/admin-panel-deploy.pub` (public key - add to server)

### 2. Add Public Key to Server

Copy the public key to your server:

```bash
# On local machine
cat ~/.ssh/admin-panel-deploy.pub
```

Then on your **server**:

```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add public key to authorized_keys
echo "YOUR_PUBLIC_KEY_CONTENT_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Test SSH Connection

From your **local machine**:

```bash
ssh -i ~/.ssh/admin-panel-deploy root@209.208.79.172
```

If it connects without password, you're good!

### 4. Add GitHub Secrets

Go to your GitHub repository:
1. Navigate to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these secrets:

| Secret Name | Value | Description |
|------------|-------|-------------|
| `SERVER_HOST` | `209.208.79.172` | Your server IP address |
| `SERVER_USER` | `root` | SSH username |
| `SERVER_SSH_KEY` | Contents of `~/.ssh/admin-panel-deploy` | Your private SSH key (entire content) |
| `SERVER_PORT` | `22` | SSH port (default is 22) |

To get your private key content:
```bash
cat ~/.ssh/admin-panel-deploy
```

Copy the entire output (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`).

### 5. Set Up Server Environment

On your **server**, run the setup script:

```bash
cd ~/admin-pannel/admin-panel
bash scripts/setup-server-env.sh
```

This will:
- Create `.env` files for backend and frontend
- Set up environment variables with server IP
- Preserve your existing configuration

**Important**: After running the setup, manually update the `.env` files with your actual Supabase credentials and email configuration.

### 6. Initial Server Configuration

Make sure your server has:

1. **PM2 Configuration** (create if needed):
   ```bash
   # Create ecosystem.config.cjs in project root
   cd ~/admin-pannel/admin-panel
   # Copy from deploy.txt or create your own
   ```

2. **Nginx Configuration**:
   - Ensure `/etc/nginx/sites-available/default` is configured
   - Root directory should be `/usr/share/nginx/html`
   - See `front-end/nginx.conf` for reference

3. **Project Directory Structure**:
   ```
   ~/admin-pannel/admin-panel/
   ├── backend/
   │   ├── .env (server-specific, not in git)
   │   └── ...
   ├── front-end/
   │   ├── .env (server-specific, not in git)
   │   └── ...
   ├── ecosystem.config.cjs (server-specific, not in git)
   └── scripts/
       ├── deploy.sh
       └── setup-server-env.sh
   ```

### 7. Make Deploy Script Executable

On your **server**:

```bash
chmod +x ~/admin-pannel/admin-panel/scripts/deploy.sh
chmod +x ~/admin-pannel/admin-panel/scripts/setup-server-env.sh
chmod +x ~/admin-pannel/admin-panel/scripts/env-config.sh
```

### 8. Test Deployment

Once everything is set up:

1. Make a small change to your code
2. Commit and push to `ismail-admin-panel` branch:
   ```bash
   git add .
   git commit -m "Test CI/CD deployment"
   git push ismail ismail-admin-panel
   ```
3. Go to GitHub → **Actions** tab
4. Watch the deployment workflow run
5. Check your server to verify the deployment

## How It Works

### Workflow Steps

1. **Trigger**: Push to `ismail-admin-panel` branch
2. **Checkout**: GitHub Actions checks out your code
3. **SSH Deploy**: Connects to server via SSH
4. **Deploy Script**: Runs `scripts/deploy.sh` on server

### Deploy Script Process

1. **Backup**: Backs up server-specific files (`.env`, PM2 config, Nginx config)
2. **Pull Code**: Pulls latest code from GitHub
3. **Restore**: Restores server-specific files (so they don't get overwritten)
4. **Backend Deployment**:
   - Install dependencies
   - Restart PM2 process
5. **Frontend Deployment**:
   - Install dependencies
   - Run tests (non-blocking)
   - Build React app
   - Copy to Nginx directory
   - Reload Nginx

## Environment Variables

### Code Logic

The code uses fallback values for localhost:

```javascript
// Backend
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Frontend
const API_BASE_URL = process.env.REACT_APP_Server_Url || 'http://localhost:5000/api';
```

### Server Configuration

On the server, `.env` files override these with server IP:

```bash
# backend/.env
CLIENT_URL=http://209.208.79.172:8080

# front-end/.env
REACT_APP_Server_Url=http://209.208.79.172:5000/api
```

**Important**: These `.env` files are **NOT** in git (added to `.gitignore`), so they're preserved during deployment.

## Preserving Server Files

The following files are preserved during deployment:

- `backend/.env` - Backend environment variables
- `front-end/.env` - Frontend environment variables
- `ecosystem.config.cjs` - PM2 configuration
- `/etc/nginx/sites-available/default` - Nginx configuration

These files are:
1. Backed up before pulling code
2. Restored after pulling code
3. Never committed to git

## Troubleshooting

### Deployment Fails

1. **Check GitHub Actions logs**:
   - Go to GitHub → Actions → Click on failed workflow
   - Check the error message

2. **Common Issues**:
   - **SSH Connection Failed**: Check `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY` secrets
   - **Permission Denied**: Make sure SSH key is in `~/.ssh/authorized_keys` on server
   - **PM2 Not Found**: Install PM2: `npm install -g pm2`
   - **Nginx Not Running**: Check: `sudo systemctl status nginx`

3. **Manual Deployment**:
   ```bash
   # SSH into server
   ssh root@209.208.79.172
   
   # Run deploy script manually
   cd ~/admin-pannel/admin-panel
   bash scripts/deploy.sh
   ```

### Backend Not Restarting

Check PM2 status:
```bash
pm2 list
pm2 logs backend-api
pm2 restart backend-api
```

### Frontend Not Updating

1. Check if build succeeded:
   ```bash
   cd ~/admin-pannel/admin-panel/front-end
   npm run build
   ```

2. Check Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

3. Check Nginx directory:
   ```bash
   ls -la /usr/share/nginx/html
   ```

### Environment Variables Not Working

1. Check `.env` files exist:
   ```bash
   ls -la ~/admin-pannel/admin-panel/backend/.env
   ls -la ~/admin-pannel/admin-panel/front-end/.env
   ```

2. Verify values are correct:
   ```bash
   cat ~/admin-pannel/admin-panel/backend/.env
   cat ~/admin-pannel/admin-panel/front-end/.env
   ```

3. Re-run setup:
   ```bash
   bash scripts/setup-server-env.sh
   ```

## Manual Deployment

If you need to deploy manually:

```bash
# SSH into server
ssh root@209.208.79.172

# Navigate to project
cd ~/admin-pannel/admin-panel

# Run deploy script
bash scripts/deploy.sh
```

## Security Notes

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Keep SSH keys secure** - Never share your private key
3. **Rotate credentials** - Regularly update Supabase keys and passwords
4. **Monitor deployments** - Check GitHub Actions logs regularly

## Next Steps

1. Set up monitoring/alerting for deployments
2. Add rollback functionality
3. Set up staging environment
4. Add database migrations to deployment process

