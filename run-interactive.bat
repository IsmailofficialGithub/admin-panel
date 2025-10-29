@echo off
REM Run Interactive Docker Container for Windows

echo ============================================
echo    Run Interactive Admin Dashboard
echo ============================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed
    pause
    exit /b 1
)

REM Check if image exists
docker image inspect admin-dashboard:interactive >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Image 'admin-dashboard:interactive' not found
    echo.
    echo Please build the image first:
    echo   build-interactive.bat
    echo.
    pause
    exit /b 1
)

echo [OK] Image found: admin-dashboard:interactive
echo.

REM Stop and remove old container if exists
docker ps -a --format "{{.Names}}" | findstr /x "admin-dashboard-interactive" >nul 2>&1
if %errorlevel% equ 0 (
    echo Removing old container...
    docker stop admin-dashboard-interactive >nul 2>&1
    docker rm admin-dashboard-interactive >nul 2>&1
    echo.
)

echo Starting interactive container...
echo.
echo ================================================
echo   You will be prompted for configuration now
echo ================================================
echo.

REM Run the container interactively
docker run -it ^
  --name admin-dashboard-interactive ^
  -p 3000:3000 ^
  -p 5000:5000 ^
  admin-dashboard:interactive

echo.
echo Container stopped.
echo.
echo To start again: run-interactive.bat
echo To remove: docker rm admin-dashboard-interactive
echo.
pause

