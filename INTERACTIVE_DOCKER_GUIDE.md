# Interactive Docker Setup Guide

**Ask for Environment Variables at Container Startup**

---

## 🎯 What This Is

A **separate Docker image** that:
- ✅ Prompts you for environment variables when you start the container
- ✅ No need for `.env` file
- ✅ Interactive configuration during startup
- ✅ Runs both frontend and backend in a single container
- ✅ Perfect for first-time setup or testing

---

## 📦 Files Created

| File | Purpose |
|------|---------|
| `Dockerfile.interactive` | Interactive Dockerfile with prompt script |
| `build-interactive.sh` | Build script (Linux/Mac) |
| `build-interactive.bat` | Build script (Windows) |
| `run-interactive.sh` | Run script (Linux/Mac) |
| `run-interactive.bat` | Run script (Windows) |

---

## 🚀 Quick Start (2 Steps)

### **Step 1: Build the Image**

**Windows:**
```bash
build-interactive.bat
```

**Linux/Mac:**
```bash
chmod +x build-interactive.sh
./build-interactive.sh
```

**Or manually:**
```bash
docker build -f Dockerfile.interactive -t admin-dashboard:interactive .
```

⏱️ **Build time**: 5-10 minutes (first time only)

---

### **Step 2: Run the Container**

**Windows:**
```bash
run-interactive.bat
```

**Linux/Mac:**
```bash
chmod +x run-interactive.sh
./run-interactive.sh
```

**Or manually:**
```bash
docker run -it -p 3000:3000 -p 5000:5000 admin-dashboard:interactive
```

---

## 💬 Interactive Prompts

When you run the container, you'll see:

```
============================================
   Admin Dashboard - Interactive Setup
============================================

📋 Please enter your configuration:

--- Supabase Configuration (Required) ---
Supabase URL [https://your-project.supabase.co]: https://abcdefg.supabase.co
Supabase Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Supabase Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

--- Application Configuration ---
Client URL [http://localhost:3000]: 
Backend Port [5000]: 

--- Email Configuration (Optional - Press Enter to skip) ---
Email Host [smtp.gmail.com]: 
Email Port [587]: 
Email User: 
Email Password: 

✅ Configuration saved!

============================================
   Starting Services...
============================================

🚀 Starting Backend on port 5000...
✅ Backend started (PID: 8)
🎨 Starting Frontend on port 3000...
✅ Frontend started (PID: 9)

======================================
   🎉 Application is Running!
======================================
Frontend: http://localhost:3000
Backend:  http://localhost:5000
======================================
```

---

## 🔧 How It Works

### **Interactive Mode:**

1. Container starts
2. Script asks for environment variables
3. You type your answers
4. Script saves the configuration
5. Services start with your configuration

### **Inside the Container:**

```
┌─────────────────────────────────────┐
│   Docker Container                  │
│                                     │
│  ┌────────────────────────────┐    │
│  │  Interactive Startup       │    │
│  │  Script (Bash)             │    │
│  │  - Prompts for env vars    │    │
│  │  - Validates input         │    │
│  │  - Exports variables       │    │
│  │  - Starts services         │    │
│  └────────────────────────────┘    │
│         │                           │
│         ▼                           │
│  ┌──────────────────────────────┐  │
│  │   Frontend (Port 3000)       │  │
│  │   Backend (Port 5000)        │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## 📝 What You'll Be Asked

### **Required Information:**

1. **Supabase URL**
   - Example: `https://abcdefghijk.supabase.co`
   - Get from: Supabase Dashboard → Settings → API → Project URL

2. **Supabase Anon Key**
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Get from: Supabase Dashboard → Settings → API → anon public

3. **Supabase Service Role Key**
   - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Get from: Supabase Dashboard → Settings → API → service_role

### **Optional Information:**

4. **Client URL** (default: http://localhost:3000)
5. **Backend Port** (default: 5000)
6. **Email Settings** (for password reset feature)
   - Email Host
   - Email Port
   - Email User
   - Email Password

---

## 💡 Usage Scenarios

### **Scenario 1: First Time Setup**

```bash
# Build once
build-interactive.bat

# Run and enter credentials
run-interactive.bat

# Enter your Supabase credentials when prompted
# Services start automatically
```

### **Scenario 2: Testing with Different Credentials**

```bash
# Stop current container
docker stop admin-dashboard-interactive

# Run again with new credentials
run-interactive.bat

# Enter different credentials
```

### **Scenario 3: Non-Interactive Mode (with env vars)**

```bash
docker run -d \
  --name admin-dashboard-app \
  -p 3000:3000 \
  -p 5000:5000 \
  -e SUPABASE_URL="https://your-project.supabase.co" \
  -e SUPABASE_ANON_KEY="your_key" \
  -e SUPABASE_SERVICE_ROLE_KEY="your_key" \
  -e PORT=5000 \
  admin-dashboard:interactive
```

---

## 🆚 Comparison

### **Interactive Image** (`Dockerfile.interactive`)
```
✅ Asks for credentials at startup
✅ No .env file needed
✅ Perfect for testing
✅ Easy to change credentials
❌ Must re-enter each time
```

### **Combined Image** (`Dockerfile.combined`)
```
✅ Uses .env file
✅ No prompts needed
✅ Credentials saved
✅ Faster startup
❌ Requires .env file setup
```

---

## 🔧 Common Commands

### **Build the Image**
```bash
# Windows
build-interactive.bat

# Linux/Mac
./build-interactive.sh
```

### **Run Container (Interactive)**
```bash
# Windows
run-interactive.bat

# Linux/Mac
./run-interactive.sh
```

### **Stop Container**
```bash
docker stop admin-dashboard-interactive
```

### **Start Again (Same Config)**
```bash
docker start -i admin-dashboard-interactive
```

### **Remove Container**
```bash
docker rm admin-dashboard-interactive
```

### **Remove Image**
```bash
docker rmi admin-dashboard:interactive
```

### **View Logs**
```bash
docker logs admin-dashboard-interactive
```

---

## 🐛 Troubleshooting

### **Problem: Prompts Not Showing**

**Solution**: Make sure you're using the `-it` flags:
```bash
docker run -it -p 3000:3000 -p 5000:5000 admin-dashboard:interactive
```

### **Problem: Want to Change Credentials**

**Solution**:
```bash
# Stop and remove container
docker stop admin-dashboard-interactive
docker rm admin-dashboard-interactive

# Run again and enter new credentials
run-interactive.bat
```

### **Problem: Container Exits Immediately**

**Solution**: Check logs for errors:
```bash
docker logs admin-dashboard-interactive
```

### **Problem: Port Already in Use**

**Solution**: Stop other containers or processes:
```bash
# Stop the combined container if running
docker stop admin-dashboard-app

# Then run interactive
run-interactive.bat
```

---

## 📊 Build Details

### **Image Components:**

| Component | Size | Purpose |
|-----------|------|---------|
| Base (node:18-alpine) | ~40MB | Node.js runtime |
| Bash | ~5MB | For interactive script |
| Backend deps | ~150MB | Express + dependencies |
| Frontend deps | ~400MB | React + dependencies |
| App code | ~50MB | Your application |
| **Total** | **~645MB** | Complete image |

### **Build Process:**

1. Pull Node.js Alpine base image
2. Install bash for interactive prompts
3. Install backend dependencies
4. Install frontend dependencies
5. Copy application code
6. Create interactive startup script
7. Build complete ✅

---

## 🎯 When to Use This

**Use Interactive Image When:**
- ✅ First time trying the application
- ✅ Testing with different Supabase projects
- ✅ Demoing to someone
- ✅ Don't want to create .env file
- ✅ Need to change credentials frequently

**Use Combined Image (`Dockerfile.combined`) When:**
- ✅ Production deployment
- ✅ Credentials don't change
- ✅ Automated deployments
- ✅ Don't want to enter credentials each time

---

## 🔐 Security Notes

⚠️ **Important Security Tips:**

1. **Don't share** your service role key
2. **Don't commit** credentials to git
3. **Use environment variables** for production
4. **Consider using** Docker secrets for sensitive data
5. **Rotate keys** regularly

---

## 📖 Example Session

```bash
$ run-interactive.bat

============================================
   Run Interactive Admin Dashboard
============================================

[OK] Image found: admin-dashboard:interactive

Starting interactive container...

================================================
  You will be prompted for configuration now
================================================

============================================
   Admin Dashboard - Interactive Setup
============================================

📋 Please enter your configuration:

--- Supabase Configuration (Required) ---
Supabase URL [https://your-project.supabase.co]: https://abc123.supabase.co
Supabase Anon Key: eyJhbGci...
Supabase Service Role Key: eyJhbGci...

--- Application Configuration ---
Client URL [http://localhost:3000]: ⏎ (press Enter for default)
Backend Port [5000]: ⏎ (press Enter for default)

--- Email Configuration (Optional - Press Enter to skip) ---
Email Host [smtp.gmail.com]: ⏎
Email Port [587]: ⏎
Email User: ⏎ (skip)
Email Password: ⏎ (skip)

✅ Configuration saved!

============================================
   Starting Services...
============================================

🚀 Starting Backend on port 5000...
✅ Backend started (PID: 8)
🎨 Starting Frontend on port 3000...
✅ Frontend started (PID: 9)

======================================
   🎉 Application is Running!
======================================
Frontend: http://localhost:3000
Backend:  http://localhost:5000
======================================

💡 Tip: View logs with 'docker logs -f admin-dashboard-interactive'
🛑 Stop with: docker stop admin-dashboard-interactive

[Frontend compiling...]
Compiled successfully!
```

---

## ✅ Summary

**Interactive Docker Setup:**
1. Build image once: `build-interactive.bat`
2. Run container: `run-interactive.bat`
3. Enter your Supabase credentials
4. Application starts automatically
5. Access at http://localhost:3000

**Perfect for quick testing and demos!** 🚀

---

Built with ❤️ - Interactive Docker Experience  
**Version**: 1.0.0

