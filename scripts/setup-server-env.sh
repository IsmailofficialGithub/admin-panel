#!/bin/bash

# Server Environment Setup Script
# This script should be run once on the server to set up environment variables

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
PROJECT_DIR="$HOME/admin-pannel/admin-panel"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/front-end"

# Server configuration
SERVER_IP="209.208.79.172"
SERVER_PORT="8080"
BACKEND_PORT="5000"

echo -e "${GREEN}Setting up server environment variables...${NC}"
echo ""

# Check if directories exist
if [ ! -d "$BACKEND_DIR" ] || [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}Error: Project directories not found${NC}"
    exit 1
fi

# Setup backend .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}Creating backend .env file...${NC}"
    cat > "$BACKEND_DIR/.env" << EOF
# Server Configuration
PORT=$BACKEND_PORT
NODE_ENV=production

# Client URL (Frontend)
CLIENT_URL=http://$SERVER_IP:$SERVER_PORT

# Supabase Configuration
# IMPORTANT: Update these with your actual Supabase credentials
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
AdminEmail=your_email@gmail.com
Nodemailer_Google_App_Password=your_app_password_here
MAIL_FROM_ADDRESS=your_email@gmail.com
EOF
    echo -e "${GREEN}Backend .env created. Please update with your actual values.${NC}"
else
    # Update CLIENT_URL if it's set to localhost
    if grep -q "CLIENT_URL=http://localhost" "$BACKEND_DIR/.env"; then
        sed -i "s|CLIENT_URL=http://localhost.*|CLIENT_URL=http://$SERVER_IP:$SERVER_PORT|g" "$BACKEND_DIR/.env"
        echo -e "${GREEN}Updated backend CLIENT_URL to use server IP${NC}"
    fi
fi

# Setup frontend .env
if [ ! -f "$FRONTEND_DIR/.env" ]; then
    echo -e "${YELLOW}Creating frontend .env file...${NC}"
    cat > "$FRONTEND_DIR/.env" << EOF
# API Configuration
REACT_APP_Server_Url=http://$SERVER_IP:$BACKEND_PORT/api
REACT_APP_API_URL=http://$SERVER_IP:$BACKEND_PORT/api

# Supabase Configuration
# IMPORTANT: Update these with your actual Supabase credentials
REACT_APP_SUPABASE_URL_PRODUCTION=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY_PRODUCTION=your_supabase_anon_key_here
REACT_APP_SUPABASE_SERVICE_ROLE_KEY_PRODUCTION=your_supabase_service_role_key_here
EOF
    echo -e "${GREEN}Frontend .env created. Please update with your actual values.${NC}"
else
    # Update API URLs if they're set to localhost
    if grep -q "REACT_APP_Server_Url=http://localhost" "$FRONTEND_DIR/.env"; then
        sed -i "s|REACT_APP_Server_Url=http://localhost.*|REACT_APP_Server_Url=http://$SERVER_IP:$BACKEND_PORT/api|g" "$FRONTEND_DIR/.env"
        echo -e "${GREEN}Updated frontend REACT_APP_Server_Url to use server IP${NC}"
    fi
    if grep -q "REACT_APP_API_URL=http://localhost" "$FRONTEND_DIR/.env"; then
        sed -i "s|REACT_APP_API_URL=http://localhost.*|REACT_APP_API_URL=http://$SERVER_IP:$BACKEND_PORT/api|g" "$FRONTEND_DIR/.env"
        echo -e "${GREEN}Updated frontend REACT_APP_API_URL to use server IP${NC}"
    fi
fi

echo ""
echo -e "${GREEN}Server environment setup complete!${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT:${NC}"
echo "1. Update backend/.env with your Supabase credentials"
echo "2. Update frontend/.env with your Supabase credentials"
echo "3. Update email configuration in backend/.env"
echo ""

