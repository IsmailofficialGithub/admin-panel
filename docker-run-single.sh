#!/bin/bash

# Single Container Setup Script
# This script builds and runs ONE Docker image with both Frontend + Backend

set -e

echo "============================================"
echo "   Single Container Setup"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed${NC}"
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

# Stop and remove old container
echo "🧹 Cleaning up old containers..."
docker stop admin-dashboard-app 2>/dev/null || true
docker rm admin-dashboard-app 2>/dev/null || true

echo ""
echo "🔨 Building single Docker image (this may take 3-5 minutes)..."
echo ""

# Build the single image
docker build -f Dockerfile.combined -t admin-dashboard:latest .

echo ""
echo -e "${GREEN}✅ Image built successfully!${NC}"
echo ""

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "🚀 Starting container..."
echo ""

# Run the container
docker run -d \
  --name admin-dashboard-app \
  -p 3000:3000 \
  -p 5000:5000 \
  -e NODE_ENV=development \
  -e PORT=5000 \
  -e CLIENT_URL=http://localhost:3000 \
  -e SUPABASE_URL="${SUPABASE_URL}" \
  -e SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}" \
  -e SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}" \
  -e EMAIL_HOST="${EMAIL_HOST}" \
  -e EMAIL_PORT="${EMAIL_PORT}" \
  -e EMAIL_USER="${EMAIL_USER}" \
  -e EMAIL_PASS="${EMAIL_PASS}" \
  -e REACT_APP_API_URL=http://localhost:5000/api \
  admin-dashboard:latest

echo ""
echo -e "${GREEN}✅ Container started successfully!${NC}"
echo ""
echo "======================================"
echo "   Application URLs"
echo "======================================"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:5000"
echo "======================================"
echo ""
echo "📊 View logs with:"
echo "   docker logs -f admin-dashboard-app"
echo ""
echo "🛑 Stop container with:"
echo "   docker stop admin-dashboard-app"
echo ""
echo "⏳ Wait 30-60 seconds for services to start..."
echo ""

