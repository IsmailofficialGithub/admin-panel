@echo off
REM Admin Dashboard - Docker Quick Start Script for Windows
REM This script helps you quickly set up and run the application with Docker

echo ============================================
echo    Admin Dashboard - Docker Setup
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

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not installed
    echo Please install Docker Desktop which includes Docker Compose
    pause
    exit /b 1
)

echo [OK] Docker and Docker Compose are installed
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

REM Ask user which mode to run
echo Select deployment mode:
echo 1^) Development (hot-reload enabled^)
echo 2^) Production (optimized build^)
echo.
set /p mode="Enter your choice (1 or 2): "

if "%mode%"=="1" (
    echo.
    echo Building and starting in DEVELOPMENT mode...
    echo.
    docker-compose down -v
    docker-compose up --build
) else if "%mode%"=="2" (
    echo.
    echo Building and starting in PRODUCTION mode...
    echo.
    docker-compose -f docker-compose.prod.yml down -v
    docker-compose -f docker-compose.prod.yml up --build -d
    
    echo.
    echo [SUCCESS] Production services started successfully!
    echo.
    echo Access the application at:
    echo   - Frontend: http://localhost
    echo   - Backend API: http://localhost:5000
    echo.
    echo View logs with: docker-compose -f docker-compose.prod.yml logs -f
    echo Stop services with: docker-compose -f docker-compose.prod.yml down
    echo.
    pause
) else (
    echo [ERROR] Invalid choice
    pause
    exit /b 1
)

