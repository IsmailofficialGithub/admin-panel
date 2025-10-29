#!/bin/bash

# Run Interactive Docker Container

set -e

echo "============================================"
echo "   Run Interactive Admin Dashboard"
echo "============================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

# Check if image exists
if ! docker image inspect admin-dashboard:interactive &> /dev/null; then
    echo "❌ Image 'admin-dashboard:interactive' not found"
    echo ""
    echo "Please build the image first:"
    echo "  ./build-interactive.sh"
    echo ""
    exit 1
fi

echo "✅ Image found: admin-dashboard:interactive"
echo ""

# Stop and remove old container if exists
if docker ps -a --format '{{.Names}}' | grep -q '^admin-dashboard-interactive$'; then
    echo "🧹 Removing old container..."
    docker stop admin-dashboard-interactive 2>/dev/null || true
    docker rm admin-dashboard-interactive 2>/dev/null || true
    echo ""
fi

echo "🚀 Starting interactive container..."
echo ""
echo "================================================"
echo "  You will be prompted for configuration now"
echo "================================================"
echo ""

# Run the container interactively
docker run -it \
  --name admin-dashboard-interactive \
  -p 3000:3000 \
  -p 5000:5000 \
  admin-dashboard:interactive

echo ""
echo "Container stopped."
echo ""
echo "To start again: ./run-interactive.sh"
echo "To remove: docker rm admin-dashboard-interactive"
echo ""

