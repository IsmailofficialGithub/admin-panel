# Docker Quick Reference Card

Quick reference for common Docker commands for this project.

## 🚀 Quick Start

```bash
# Easy start (interactive)
./docker-start.sh        # Linux/Mac
docker-start.bat         # Windows

# Manual start - Development
docker-compose up --build

# Manual start - Production
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 📦 Essential Commands

### **Start Services**

```bash
# Development (with logs)
docker-compose up --build

# Development (background)
docker-compose up -d --build

# Production
docker-compose -f docker-compose.prod.yml up -d --build
```

### **Stop Services**

```bash
# Development
docker-compose down

# Production
docker-compose -f docker-compose.prod.yml down

# Stop and remove volumes
docker-compose down -v
```

### **View Logs**

```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend

# Frontend only
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100
```

### **Restart Services**

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
docker-compose restart frontend
```

---

## 🔧 Development Commands

### **Rebuild After Code Changes**

```bash
# Rebuild specific service
docker-compose build backend
docker-compose build frontend

# Rebuild and restart
docker-compose up -d --build backend
```

### **Access Container Shell**

```bash
# Backend
docker-compose exec backend sh

# Frontend
docker-compose exec frontend sh

# Run commands in container
docker-compose exec backend npm install new-package
```

### **View Container Status**

```bash
# List running containers
docker-compose ps

# View resource usage
docker stats
```

---

## 🐛 Debugging

### **Common Issues**

```bash
# Port already in use
docker-compose down
# Kill process using port or change port in docker-compose.yml

# Container won't start
docker-compose logs backend
docker-compose logs frontend

# Rebuild without cache
docker-compose build --no-cache

# Complete reset
docker-compose down -v --rmi all
docker-compose up --build
```

### **Check Health Status**

```bash
# View health status
docker-compose ps

# Test endpoints manually
curl http://localhost:5000/health
curl http://localhost:3000
```

---

## 🧹 Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove everything including images
docker-compose down -v --rmi all

# Clean Docker system
docker system prune -a
```

---

## 📊 Monitoring

```bash
# Follow all logs
docker-compose logs -f

# Check resource usage
docker stats

# Inspect container
docker inspect admin-dashboard-backend
docker inspect admin-dashboard-frontend

# View container processes
docker-compose top
```

---

## 🔐 Environment Variables

```bash
# Check environment in container
docker-compose exec backend env

# Reload after .env changes
docker-compose down
docker-compose up -d
```

---

## 💾 Data Management

```bash
# Backup volumes
docker run --rm -v admin-dashboard_backend_data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data

# List volumes
docker volume ls

# Remove volumes
docker volume rm admin-dashboard_backend_data
```

---

## 📝 Quick Cheat Sheet

| Task | Command |
|------|---------|
| Start dev | `docker-compose up` |
| Start prod | `docker-compose -f docker-compose.prod.yml up -d` |
| Stop | `docker-compose down` |
| Logs | `docker-compose logs -f` |
| Rebuild | `docker-compose up --build` |
| Shell access | `docker-compose exec backend sh` |
| Restart | `docker-compose restart` |
| Clean up | `docker-compose down -v` |
| Status | `docker-compose ps` |

---

## 🆘 Emergency Commands

```bash
# Stop everything immediately
docker-compose down

# Force remove all containers
docker rm -f $(docker ps -aq)

# Force remove all volumes
docker volume rm $(docker volume ls -q)

# Complete Docker cleanup
docker system prune -a --volumes

# Restart Docker daemon (Linux)
sudo systemctl restart docker

# Restart Docker Desktop (Windows/Mac)
# Close Docker Desktop and reopen
```

---

## 📞 Need Help?

1. Check logs: `docker-compose logs -f`
2. See full documentation: [DOCKER.md](DOCKER.md)
3. Verify .env file has correct values
4. Try: `docker-compose down -v && docker-compose up --build`

---

**Last Updated**: 2025  
**Version**: 1.0.0

