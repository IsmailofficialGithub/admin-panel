#!/bin/bash

# Admin Dashboard - Docker Quick Start Script
# This script helps you quickly set up and run the application with Docker

set -e

echo "============================================"
echo "   Admin Dashboard - Docker Setup"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose from https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating .env file from template..."
    echo ""
    
    cat > .env << 'EOF'
# Supabase Configuration (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Frontend Configuration
CLIENT_URL=http://localhost:3000
REACT_APP_API_URL=http://localhost:5000/api

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password_here
EOF
    
    echo -e "${YELLOW}⚠️  Please edit .env file with your actual Supabase credentials${NC}"
    echo ""
    read -p "Press Enter after you've updated the .env file..."
fi

echo -e "${GREEN}✅ .env file found${NC}"
echo ""

# Ask user which mode to run
echo "Select deployment mode:"
echo "1) Development (hot-reload enabled)"
echo "2) Production (optimized build)"
echo ""
read -p "Enter your choice (1 or 2): " mode

case $mode in
    1)
        echo ""
        echo "🔨 Building and starting in DEVELOPMENT mode..."
        echo ""
        docker-compose down -v
        docker-compose up --build
        ;;
    2)
        echo ""
        echo "🚀 Building and starting in PRODUCTION mode..."
        echo ""
        docker-compose -f docker-compose.prod.yml down -v
        docker-compose -f docker-compose.prod.yml up --build -d
        
        echo ""
        echo -e "${GREEN}✅ Production services started successfully!${NC}"
        echo ""
        echo "Access the application at:"
        echo "  - Frontend: http://localhost"
        echo "  - Backend API: http://localhost:5000"
        echo ""
        echo "View logs with: docker-compose -f docker-compose.prod.yml logs -f"
        echo "Stop services with: docker-compose -f docker-compose.prod.yml down"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

