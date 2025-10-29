@echo off
REM Build Interactive Docker Image for Windows

echo ============================================
echo    Building Interactive Docker Image
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

echo Building image 'admin-dashboard:interactive'...
echo This may take 5-10 minutes...
echo.

REM Build the image
docker build -f Dockerfile.interactive -t admin-dashboard:interactive .

if %errorlevel% equ 0 (
    echo.
    echo ============================================
    echo    [SUCCESS] Image Built Successfully!
    echo ============================================
    echo.
    echo Image name: admin-dashboard:interactive
    echo.
    echo To run the container:
    echo   Interactive mode:  run-interactive.bat
    echo   Or manually:       docker run -it -p 3000:3000 -p 5000:5000 admin-dashboard:interactive
    echo.
    pause
) else (
    echo.
    echo [ERROR] Build failed. Please check the errors above.
    pause
    exit /b 1
)

