# Docker Setup Guide

Complete guide for running the Admin Dashboard using Docker and Docker Compose.

## 📋 Prerequisites

- **Docker** (v20.10 or higher)
- **Docker Compose** (v2.0 or higher)
- **Git**

### Install Docker

#### Windows & Mac
- Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)

#### Linux
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

## 🚀 Quick Start

### 1. **Create Environment File**

Create a `.env` file in the root directory:

```bash
# Create .env file
touch .env
```

Add the following content to `.env`:

```env
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
```

### 2. **Start Services (Development)**

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build
```

### 3. **Access the Application**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/health

---

## 📦 Available Docker Commands

### **Development Mode**

```bash
# Build and start services
docker-compose up --build

# Start services (without rebuilding)
docker-compose up

# Start in background
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# View logs
docker-compose logs

# View logs for specific service
docker-compose logs backend
docker-compose logs frontend

# Follow logs in real-time
docker-compose logs -f

# Restart services
docker-compose restart

# Rebuild a specific service
docker-compose build backend
docker-compose build frontend
```

### **Production Mode**

```bash
# Start production services
docker-compose -f docker-compose.prod.yml up --build -d

# Stop production services
docker-compose -f docker-compose.prod.yml down

# View production logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🏗️ Docker Architecture

### **Services**

| Service | Port | Description |
|---------|------|-------------|
| `backend` | 5000 | Node.js/Express API server |
| `frontend` | 3000 (dev)<br>80 (prod) | React application |

### **Networks**

- `admin-dashboard-network` - Bridge network connecting all services

### **Volumes**

Development mode uses bind mounts for hot-reloading:
- `./backend:/app` - Backend source code
- `./front-end:/app` - Frontend source code
- Anonymous volumes for `node_modules`

---

## 🔧 Configuration Details

### **Backend Service**

**Development:**
- Base image: `node:18-alpine`
- Hot-reload: Enabled via volume mounts
- Command: `npm run dev`
- Healthcheck: Curl to `/health` endpoint

**Production:**
- Multi-stage build for smaller image size
- Non-root user for security
- Command: `npm start`
- Production dependencies only

### **Frontend Service**

**Development:**
- Base image: `node:18-alpine`
- Hot-reload: Enabled with polling
- Command: `npm start`
- Port: 3000

**Production:**
- Multi-stage build (Node → Nginx)
- Nginx serves static files
- Custom nginx configuration
- Gzip compression enabled
- Port: 80

---

## 🔍 Debugging

### **View Service Status**

```bash
docker-compose ps
```

### **Access Container Shell**

```bash
# Backend
docker-compose exec backend sh

# Frontend
docker-compose exec frontend sh
```

### **Check Container Logs**

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend

# Last 100 lines
docker-compose logs --tail=100

# Follow logs
docker-compose logs -f
```

### **Inspect Container**

```bash
docker inspect admin-dashboard-backend
docker inspect admin-dashboard-frontend
```

### **Common Issues**

#### **Port Already in Use**

```bash
# Find process using port 3000 or 5000
# Linux/Mac
lsof -i :3000
lsof -i :5000

# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# Change ports in docker-compose.yml
ports:
  - "3001:3000"  # Map to different host port
```

#### **Container Fails to Start**

```bash
# Check logs
docker-compose logs backend

# Rebuild without cache
docker-compose build --no-cache backend

# Remove all containers and start fresh
docker-compose down -v
docker-compose up --build
```

#### **Environment Variables Not Working**

```bash
# Verify .env file exists
cat .env

# Restart services after .env changes
docker-compose down
docker-compose up -d
```

#### **Hot Reload Not Working**

For frontend, ensure these are in docker-compose.yml:
```yaml
environment:
  - WATCHPACK_POLLING=true
  - CHOKIDAR_USEPOLLING=true
```

---

## 🚀 Production Deployment

### **1. Update Environment Variables**

Update `.env` with production values:

```env
CLIENT_URL=https://your-domain.com
REACT_APP_API_URL=https://api.your-domain.com/api
```

### **2. Build Production Images**

```bash
docker-compose -f docker-compose.prod.yml build
```

### **3. Start Production Services**

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### **4. Production Checklist**

- ✅ Set `NODE_ENV=production`
- ✅ Use production Supabase credentials
- ✅ Configure proper CORS origins
- ✅ Set up SSL/TLS certificates (use reverse proxy)
- ✅ Configure firewall rules
- ✅ Set up logging and monitoring
- ✅ Configure backups
- ✅ Use secrets management (Docker secrets, AWS Secrets Manager, etc.)

---

## 🔐 Security Best Practices

### **1. Don't Commit .env Files**

```bash
# Ensure .env is in .gitignore
echo ".env" >> .gitignore
```

### **2. Use Docker Secrets (Production)**

```yaml
services:
  backend:
    secrets:
      - supabase_url
      - supabase_key

secrets:
  supabase_url:
    file: ./secrets/supabase_url.txt
  supabase_key:
    file: ./secrets/supabase_key.txt
```

### **3. Run as Non-Root User**

Already implemented in production Dockerfile:
```dockerfile
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs
```

### **4. Use Multi-Stage Builds**

Reduces image size and attack surface - already implemented.

### **5. Scan Images for Vulnerabilities**

```bash
docker scan admin-dashboard-backend
docker scan admin-dashboard-frontend
```

---

## 📊 Monitoring & Logs

### **View Resource Usage**

```bash
docker stats
```

### **View Logs**

```bash
# Last 100 lines
docker-compose logs --tail=100 backend

# Follow logs
docker-compose logs -f frontend

# Save logs to file
docker-compose logs > logs.txt
```

### **Health Checks**

Both services have health checks configured:

```bash
# Check health status
docker-compose ps

# Manually test health endpoints
curl http://localhost:5000/health
curl http://localhost:3000
```

---

## 🧹 Cleanup

### **Remove Containers**

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove containers, volumes, and images
docker-compose down -v --rmi all
```

### **Clean Docker System**

```bash
# Remove unused containers, networks, images
docker system prune

# Remove everything (use with caution)
docker system prune -a --volumes
```

---

## 🔄 CI/CD Integration

### **GitHub Actions Example**

```yaml
name: Docker Build and Push

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build images
        run: docker-compose -f docker-compose.prod.yml build
      
      - name: Run tests
        run: docker-compose run backend npm test
      
      - name: Push to registry
        run: |
          docker tag backend your-registry/backend:latest
          docker push your-registry/backend:latest
```

---

## 📦 Image Optimization

### **Current Image Sizes (Approximate)**

- **Backend Dev**: ~200MB
- **Backend Prod**: ~150MB
- **Frontend Dev**: ~600MB
- **Frontend Prod**: ~30MB (Nginx + static files)

### **Tips for Smaller Images**

1. Use Alpine base images ✅
2. Multi-stage builds ✅
3. Remove dev dependencies in production ✅
4. Use .dockerignore files ✅
5. Combine RUN commands
6. Clean npm cache

---

## 🆘 Support

### **Common Commands Reference**

```bash
# Start everything
docker-compose up -d

# Stop everything
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View logs
docker-compose logs -f

# Shell access
docker-compose exec backend sh
docker-compose exec frontend sh

# Restart specific service
docker-compose restart backend

# Remove everything
docker-compose down -v --rmi all
```

### **Troubleshooting**

1. Check Docker is running: `docker --version`
2. Check logs: `docker-compose logs`
3. Verify .env file exists and has correct values
4. Ensure ports 3000 and 5000 are not in use
5. Try rebuilding: `docker-compose up --build`
6. Clean restart: `docker-compose down -v && docker-compose up --build`

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Best Practices for Node.js in Docker](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Nginx Docker Official Image](https://hub.docker.com/_/nginx)

---

Built with ❤️ using Docker, Node.js, React, and Nginx

