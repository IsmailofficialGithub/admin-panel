#!/bin/bash

# Environment Configuration Helper
# This script helps manage environment variables for different environments

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
PROJECT_DIR="$HOME/admin-pannel/admin-panel"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/front-end"

# Server IP (set this to your server IP)
SERVER_IP="${SERVER_IP:-209.208.79.172}"
SERVER_PORT="${SERVER_PORT:-8080}"
BACKEND_PORT="${BACKEND_PORT:-5000}"

# Function to create backend .env from template
create_backend_env() {
    local env_file="$BACKEND_DIR/.env"
    
    if [ -f "$env_file" ]; then
        echo -e "${YELLOW}Backend .env already exists. Skipping...${NC}"
        return
    fi
    
    echo -e "${GREEN}Creating backend .env file...${NC}"
    
    cat > "$env_file" << EOF
# Server Configuration
PORT=$BACKEND_PORT
NODE_ENV=production

# Client URL (Frontend) - Uses SERVER_IP if set, otherwise localhost
CLIENT_URL=\${CLIENT_URL:-http://$SERVER_IP:$SERVER_PORT}

# Supabase Configuration
# Add your Supabase credentials here
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
}

# Function to create frontend .env from template
create_frontend_env() {
    local env_file="$FRONTEND_DIR/.env"
    
    if [ -f "$env_file" ]; then
        echo -e "${YELLOW}Frontend .env already exists. Skipping...${NC}"
        return
    fi
    
    echo -e "${GREEN}Creating frontend .env file...${NC}"
    
    cat > "$env_file" << EOF
# API Configuration - Uses SERVER_IP if set, otherwise localhost
REACT_APP_Server_Url=\${REACT_APP_Server_Url:-http://$SERVER_IP:$BACKEND_PORT/api}
REACT_APP_API_URL=\${REACT_APP_API_URL:-http://$SERVER_IP:$BACKEND_PORT/api}

# Supabase Configuration
REACT_APP_SUPABASE_URL_PRODUCTION=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY_PRODUCTION=your_supabase_anon_key_here
REACT_APP_SUPABASE_SERVICE_ROLE_KEY_PRODUCTION=your_supabase_service_role_key_here
EOF
    
    echo -e "${GREEN}Frontend .env created. Please update with your actual values.${NC}"
}

# Function to update environment variables with server IP
update_env_with_server_ip() {
    if [ -f "$BACKEND_DIR/.env" ]; then
        # Update CLIENT_URL if it's set to localhost
        sed -i "s|CLIENT_URL=http://localhost:3000|CLIENT_URL=http://$SERVER_IP:$SERVER_PORT|g" "$BACKEND_DIR/.env" 2>/dev/null || true
        sed -i "s|CLIENT_URL=http://localhost:8080|CLIENT_URL=http://$SERVER_IP:$SERVER_PORT|g" "$BACKEND_DIR/.env" 2>/dev/null || true
        echo -e "${GREEN}Backend .env updated with server IP${NC}"
    fi
    
    if [ -f "$FRONTEND_DIR/.env" ]; then
        # Update REACT_APP_Server_Url if it's set to localhost
        sed -i "s|REACT_APP_Server_Url=http://localhost:5000/api|REACT_APP_Server_Url=http://$SERVER_IP:$BACKEND_PORT/api|g" "$FRONTEND_DIR/.env" 2>/dev/null || true
        sed -i "s|REACT_APP_API_URL=http://localhost:5000|REACT_APP_API_URL=http://$SERVER_IP:$BACKEND_PORT|g" "$FRONTEND_DIR/.env" 2>/dev/null || true
        echo -e "${GREEN}Frontend .env updated with server IP${NC}"
    fi
}

# Main function
main() {
    echo "Environment Configuration Helper"
    echo "================================"
    echo ""
    echo "Server IP: $SERVER_IP"
    echo "Server Port: $SERVER_PORT"
    echo "Backend Port: $BACKEND_PORT"
    echo ""
    
    # Check if .env files exist, create if not
    create_backend_env
    create_frontend_env
    
    # Update with server IP if needed
    update_env_with_server_ip
    
    echo ""
    echo -e "${GREEN}Configuration complete!${NC}"
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi

