#!/bin/bash

# CI/CD Deployment Script for Admin Panel
# This script handles both backend and frontend deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$HOME/admin-pannel/admin-panel"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/front-end"
NGINX_DIR="/usr/share/nginx/html"
PM2_APP_NAME="backend-api"
GIT_BRANCH="ismail-admin-panel"
GIT_REMOTE="ismail"

# Logging function
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required directories exist
check_directories() {
    log_info "Checking project directories..."
    
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "Project directory not found: $PROJECT_DIR"
        exit 1
    fi
    
    if [ ! -d "$BACKEND_DIR" ]; then
        log_error "Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    if [ ! -d "$FRONTEND_DIR" ]; then
        log_error "Frontend directory not found: $FRONTEND_DIR"
        exit 1
    fi
    
    log_success "All directories found"
}

# Backup server-specific files
backup_server_files() {
    log_info "Backing up server-specific files..."
    
    # Backup backend .env if it exists
    if [ -f "$BACKEND_DIR/.env" ]; then
        cp "$BACKEND_DIR/.env" "$BACKEND_DIR/.env.backup"
        log_success "Backend .env backed up"
    fi
    
    # Backup frontend .env if it exists
    if [ -f "$FRONTEND_DIR/.env" ]; then
        cp "$FRONTEND_DIR/.env" "$FRONTEND_DIR/.env.backup"
        log_success "Frontend .env backed up"
    fi
    
    # Backup PM2 ecosystem config if exists
    if [ -f "$PROJECT_DIR/ecosystem.config.cjs" ]; then
        cp "$PROJECT_DIR/ecosystem.config.cjs" "$PROJECT_DIR/ecosystem.config.cjs.backup"
        log_success "PM2 config backed up"
    fi
    
    # Backup nginx config if exists
    if [ -f "/etc/nginx/sites-available/default" ]; then
        sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
        log_success "Nginx config backed up"
    fi
}

# Restore server-specific files
restore_server_files() {
    log_info "Restoring server-specific files..."
    
    # Restore backend .env
    if [ -f "$BACKEND_DIR/.env.backup" ]; then
        mv "$BACKEND_DIR/.env.backup" "$BACKEND_DIR/.env"
        log_success "Backend .env restored"
    fi
    
    # Restore frontend .env
    if [ -f "$FRONTEND_DIR/.env.backup" ]; then
        mv "$FRONTEND_DIR/.env.backup" "$FRONTEND_DIR/.env"
        log_success "Frontend .env restored"
    fi
    
    # Restore PM2 config
    if [ -f "$PROJECT_DIR/ecosystem.config.cjs.backup" ]; then
        mv "$PROJECT_DIR/ecosystem.config.cjs.backup" "$PROJECT_DIR/ecosystem.config.cjs"
        log_success "PM2 config restored"
    fi
    
    # Restore nginx config
    if [ -f "/etc/nginx/sites-available/default.backup" ]; then
        sudo mv /etc/nginx/sites-available/default.backup /etc/nginx/sites-available/default
        log_success "Nginx config restored"
    fi
}

# Pull latest code from GitHub
pull_latest_code() {
    log_info "Pulling latest code from $GIT_REMOTE/$GIT_BRANCH..."
    
    cd "$PROJECT_DIR"
    
    # Fetch latest changes
    git fetch $GIT_REMOTE $GIT_BRANCH || {
        log_error "Failed to fetch from $GIT_REMOTE"
        exit 1
    }
    
    # Reset to remote branch (force update)
    git reset --hard $GIT_REMOTE/$GIT_BRANCH || {
        log_error "Failed to reset to $GIT_REMOTE/$GIT_BRANCH"
        exit 1
    }
    
    log_success "Code updated successfully"
}

# Deploy backend
deploy_backend() {
    log_info "Deploying backend..."
    
    cd "$BACKEND_DIR"
    
    # Install/update dependencies
    log_info "Installing backend dependencies..."
    npm install --production || {
        log_error "Failed to install backend dependencies"
        exit 1
    }
    
    # Restart PM2 process
    log_info "Restarting PM2 process: $PM2_APP_NAME"
    pm2 restart $PM2_APP_NAME || {
        log_warning "PM2 process not found, starting new process..."
        pm2 start ecosystem.config.cjs || pm2 start server.js --name $PM2_APP_NAME || {
            log_error "Failed to start backend with PM2"
            exit 1
        }
    }
    
    # Save PM2 configuration
    pm2 save || log_warning "Failed to save PM2 configuration"
    
    log_success "Backend deployed successfully"
}

# Deploy frontend
deploy_frontend() {
    log_info "Deploying frontend..."
    
    cd "$FRONTEND_DIR"
    
    # Install/update dependencies
    log_info "Installing frontend dependencies..."
    npm install --legacy-peer-deps || {
        log_error "Failed to install frontend dependencies"
        exit 1
    }
    
    # Run tests (non-blocking)
    log_info "Running frontend tests..."
    npm test -- --watchAll=false --passWithNoTests || {
        log_warning "Tests failed, but continuing deployment..."
    }
    
    # Build frontend
    log_info "Building frontend..."
    npm run build || {
        log_error "Frontend build failed"
        exit 1
    }
    
    # Copy build to nginx directory
    log_info "Copying build to nginx directory..."
    sudo rm -rf $NGINX_DIR/*
    sudo cp -r build/* $NGINX_DIR/ || {
        log_error "Failed to copy build files to nginx"
        exit 1
    }
    
    # Set proper permissions
    sudo chown -R www-data:www-data $NGINX_DIR || log_warning "Failed to set nginx permissions"
    
    # Test nginx configuration
    log_info "Testing nginx configuration..."
    sudo nginx -t || {
        log_error "Nginx configuration test failed"
        exit 1
    }
    
    # Reload nginx
    log_info "Reloading nginx..."
    sudo systemctl reload nginx || {
        log_error "Failed to reload nginx"
        exit 1
    }
    
    log_success "Frontend deployed successfully"
}

# Main deployment function
main() {
    log_info "============================================"
    log_info "   Admin Panel Deployment Script"
    log_info "============================================"
    log_info ""
    
    # Step 1: Check directories
    check_directories
    
    # Step 2: Backup server-specific files
    backup_server_files
    
    # Step 3: Pull latest code
    pull_latest_code
    
    # Step 4: Restore server-specific files (after pull)
    restore_server_files
    
    # Step 5: Deploy backend
    deploy_backend
    
    # Step 6: Deploy frontend
    deploy_frontend
    
    log_info ""
    log_success "============================================"
    log_success "   Deployment completed successfully!"
    log_success "============================================"
    log_info ""
    log_info "Backend: PM2 process '$PM2_APP_NAME' restarted"
    log_info "Frontend: Build copied to $NGINX_DIR"
    log_info "Nginx: Configuration reloaded"
    log_info ""
}

# Run main function
main

