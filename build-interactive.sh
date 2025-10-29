#!/bin/bash

# Build Interactive Docker Image

set -e

echo "============================================"
echo "   Building Interactive Docker Image"
echo "============================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "Please install Docker from https://docs.docker.com/get-docker/"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

echo "🔨 Building image 'admin-dashboard:interactive'..."
echo "⏱️  This may take 5-10 minutes..."
echo ""

# Build the image
docker build -f Dockerfile.interactive -t admin-dashboard:interactive .

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "   ✅ Image Built Successfully!"
    echo "============================================"
    echo ""
    echo "Image name: admin-dashboard:interactive"
    echo ""
    echo "To run the container:"
    echo "  Interactive mode:  ./run-interactive.sh"
    echo "  Or manually:       docker run -it -p 3000:3000 -p 5000:5000 admin-dashboard:interactive"
    echo ""
else
    echo ""
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

