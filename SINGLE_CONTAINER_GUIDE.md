# Single Container Docker Setup Guide

**ONE Image, ONE Container, Both Services (Frontend + Backend)**

---

## 🎯 What This Is

Instead of 2 separate containers (one for frontend, one for backend), this setup creates:
- ✅ **ONE Docker image** containing both frontend and backend
- ✅ **ONE running container** with both services
- ✅ **Simpler installation** - just one build step
- ✅ **Easier management** - one container to start/stop

---

## 📦 Files Created

| File | Purpose |
|------|---------|
| `Dockerfile.combined` | Single Dockerfile that builds both services |
| `docker-compose.single.yml` | Docker Compose file for single container |
| `docker-run-single.sh` | Linux/Mac startup script |
| `docker-run-single.bat` | Windows startup script |

---

## 🚀 Quick Start

### **Option 1: Using Docker Compose (Recommended)**

```bash
# Stop old containers (if running)
docker-compose down

# Start single container
docker-compose -f docker-compose.single.yml up --build -d

# Access application
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
```

### **Option 2: Using Startup Script**

**Windows:**
```bash
docker-run-single.bat
```

**Linux/Mac:**
```bash
chmod +x docker-run-single.sh
./docker-run-single.sh
```

### **Option 3: Manual Docker Commands**

```bash
# Build the image
docker build -f Dockerfile.combined -t admin-dashboard:latest .

# Run the container
docker run -d \
  --name admin-dashboard-app \
  -p 3000:3000 \
  -p 5000:5000 \
  --env-file .env \
  admin-dashboard:latest

# View logs
docker logs -f admin-dashboard-app
```

---

## 🔧 How It Works

### **Inside the Single Container:**

```
┌────────────────────────────────────┐
│   Docker Container                 │
│                                    │
│  ┌──────────────────────────────┐ │
│  │   Frontend (React)           │ │
│  │   Port: 3000                 │ │
│  │   Process ID: PID 1          │ │
│  └──────────────────────────────┘ │
│                                    │
│  ┌──────────────────────────────┐ │
│  │   Backend (Express)          │ │
│  │   Port: 5000                 │ │
│  │   Process ID: PID 2          │ │
│  └──────────────────────────────┘ │
│                                    │
│  Both run simultaneously via       │
│  startup script (/app/start.sh)    │
└────────────────────────────────────┘
```

### **Build Process:**

1. Starts from `node:18-alpine` base image
2. Creates `/app/backend` directory
3. Installs backend dependencies
4. Copies backend code
5. Creates `/app/frontend` directory
6. Installs frontend dependencies
7. Copies frontend code
8. Creates startup script to run both
9. Result: ONE image with everything

---

## 📊 Comparison

### **Old Setup (2 Containers):**
```
┌──────────────┐     ┌──────────────┐
│  Frontend    │     │  Backend     │
│  Container   │◄───►│  Container   │
│  (Image 1)   │     │  (Image 2)   │
└──────────────┘     └──────────────┘
```
- **Pros**: Service isolation, easier to scale
- **Cons**: 2 images, 2 containers, more complex

### **New Setup (1 Container):**
```
┌────────────────────────────┐
│   Single Container         │
│   ┌────────┐  ┌─────────┐ │
│   │Frontend│  │ Backend │ │
│   └────────┘  └─────────┘ │
│   (ONE Image)              │
└────────────────────────────┘
```
- **Pros**: ONE image, ONE container, simpler setup
- **Cons**: Both services in same container (less isolation)

---

## 💡 Common Commands

### **Start Container**
```bash
docker-compose -f docker-compose.single.yml up -d
```

### **Stop Container**
```bash
docker-compose -f docker-compose.single.yml down
```

### **View Logs**
```bash
# All logs
docker logs admin-dashboard-app

# Follow logs in real-time
docker logs -f admin-dashboard-app

# Last 50 lines
docker logs --tail 50 admin-dashboard-app
```

### **Restart Container**
```bash
docker restart admin-dashboard-app
```

### **Check Status**
```bash
docker ps --filter "name=admin-dashboard-app"
```

### **Access Container Shell**
```bash
docker exec -it admin-dashboard-app sh
```

### **Rebuild Image**
```bash
docker-compose -f docker-compose.single.yml build --no-cache
docker-compose -f docker-compose.single.yml up -d
```

---

## 🐛 Troubleshooting

### **Container Won't Start**

```bash
# Check logs for errors
docker logs admin-dashboard-app

# Remove and rebuild
docker stop admin-dashboard-app
docker rm admin-dashboard-app
docker rmi admin-dashboard:latest
docker-compose -f docker-compose.single.yml up --build
```

### **Frontend Not Loading**

```bash
# Check if frontend compiled
docker logs admin-dashboard-app | grep "Compiled"

# Should see: "Compiled successfully!"
```

### **Backend Not Responding**

```bash
# Test health endpoint
curl http://localhost:5000/health

# Check backend logs
docker logs admin-dashboard-app | grep "Server running"
```

### **Port Already in Use**

```bash
# Kill process on port 3000 or 5000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:3000 | xargs kill -9
```

---

## 🧹 Cleanup

### **Remove Container Only**
```bash
docker stop admin-dashboard-app
docker rm admin-dashboard-app
```

### **Remove Container + Image**
```bash
docker stop admin-dashboard-app
docker rm admin-dashboard-app
docker rmi admin-dashboard:latest
```

### **Complete Cleanup**
```bash
docker-compose -f docker-compose.single.yml down --rmi all --volumes
```

---

## 📈 Image Size

| Component | Size |
|-----------|------|
| Base Image (node:18-alpine) | ~40MB |
| Backend Dependencies | ~150MB |
| Frontend Dependencies | ~400MB |
| Application Code | ~50MB |
| **Total Image Size** | **~640MB** |

**Note:** First build takes 5-10 minutes. Subsequent builds are faster (2-3 minutes).

---

## ✅ Advantages of Single Container

1. **Simpler Setup** - One command to start everything
2. **Easier Management** - One container to monitor
3. **Faster Startup** - No network setup between containers
4. **Less Resource Usage** - Shared base image layers
5. **Perfect for Development** - Quick iteration

---

## ⚠️ When to Use 2 Containers Instead

Use the original 2-container setup (`docker-compose.yml`) when:
- Deploying to production with load balancing
- Scaling frontend and backend independently
- Need better service isolation
- Running in Kubernetes or similar orchestration

---

## 🎯 Summary

**To use the single container setup:**

1. Ensure `.env` file exists with Supabase credentials
2. Run: `docker-compose -f docker-compose.single.yml up -d`
3. Wait 30-60 seconds for services to start
4. Access: http://localhost:3000

**That's it!** One image, one container, both services running! 🚀

---

Built with ❤️ - Simplified Docker Setup  
**Version**: 1.0.0

