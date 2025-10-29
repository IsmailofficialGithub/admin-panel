@echo off
REM Single Container Setup Script for Windows
REM This script builds and runs ONE Docker image with both Frontend + Backend

echo ============================================
echo    Single Container Setup
echo ============================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed
    echo Please install Docker Desktop from https://docs.docker.com/desktop/install/windows-install/
    pause
    exit /b 1
)

echo [OK] Docker is installed
echo.

REM Check if .env file exists
if not exist .env (
    echo [WARNING] .env file not found
    echo Creating .env file from template...
    echo.
    
    (
        echo # Supabase Configuration (Required^)
        echo SUPABASE_URL=https://your-project.supabase.co
        echo SUPABASE_ANON_KEY=your_supabase_anon_key_here
        echo SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
        echo.
        echo # Frontend Configuration
        echo CLIENT_URL=http://localhost:3000
        echo REACT_APP_API_URL=http://localhost:5000/api
        echo.
        echo # Email Configuration (Optional^)
        echo EMAIL_HOST=smtp.gmail.com
        echo EMAIL_PORT=587
        echo EMAIL_USER=your_email@gmail.com
        echo EMAIL_PASS=your_app_password_here
    ) > .env
    
    echo [WARNING] Please edit .env file with your actual Supabase credentials
    echo.
    pause
)

echo [OK] .env file found
echo.

REM Stop and remove old container
echo Cleaning up old containers...
docker stop admin-dashboard-app >nul 2>&1
docker rm admin-dashboard-app >nul 2>&1

echo.
echo Building single Docker image (this may take 3-5 minutes)...
echo.

REM Build the single image
docker build -f Dockerfile.combined -t admin-dashboard:latest .

if %errorlevel% neq 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Image built successfully!
echo.

echo Starting container...
echo.

REM Load environment variables and run container
for /f "delims=" %%x in (.env) do (set "%%x")

REM Run the container
docker run -d ^
  --name admin-dashboard-app ^
  -p 3000:3000 ^
  -p 5000:5000 ^
  -e NODE_ENV=development ^
  -e PORT=5000 ^
  -e CLIENT_URL=http://localhost:3000 ^
  -e SUPABASE_URL=%SUPABASE_URL% ^
  -e SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY% ^
  -e SUPABASE_SERVICE_ROLE_KEY=%SUPABASE_SERVICE_ROLE_KEY% ^
  -e EMAIL_HOST=%EMAIL_HOST% ^
  -e EMAIL_PORT=%EMAIL_PORT% ^
  -e EMAIL_USER=%EMAIL_USER% ^
  -e EMAIL_PASS=%EMAIL_PASS% ^
  -e REACT_APP_API_URL=http://localhost:5000/api ^
  admin-dashboard:latest

if %errorlevel% neq 0 (
    echo [ERROR] Failed to start container
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Container started successfully!
echo.
echo ======================================
echo    Application URLs
echo ======================================
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo ======================================
echo.
echo View logs with:
echo    docker logs -f admin-dashboard-app
echo.
echo Stop container with:
echo    docker stop admin-dashboard-app
echo.
echo Wait 30-60 seconds for services to start...
echo.
pause

