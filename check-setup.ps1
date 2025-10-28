# Quick Setup Verification Script for Windows
# Run this script in PowerShell to check if everything is configured correctly

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Setup Verification Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check 1: Backend server
Write-Host "[1/5] Checking backend server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend server is running" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Backend server is NOT running" -ForegroundColor Red
    Write-Host "   Start it with: cd backend && npm start" -ForegroundColor Gray
}

# Check 2: Frontend .env file
Write-Host "`n[2/5] Checking frontend .env file..." -ForegroundColor Yellow
if (Test-Path "front-end\.env") {
    Write-Host "✅ Frontend .env file exists" -ForegroundColor Green
    $envContent = Get-Content "front-end\.env" -Raw
    if ($envContent -like "*REACT_APP_Server_Url*") {
        Write-Host "✅ REACT_APP_Server_Url is configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️  REACT_APP_Server_Url not found in .env" -ForegroundColor Yellow
        Write-Host "   Add: REACT_APP_Server_Url=http://localhost:5000/api" -ForegroundColor Gray
    }
} else {
    Write-Host "❌ Frontend .env file does NOT exist" -ForegroundColor Red
    Write-Host "   Create: front-end\.env" -ForegroundColor Gray
    Write-Host "   Add: REACT_APP_Server_Url=http://localhost:5000/api" -ForegroundColor Gray
}

# Check 3: Backend .env file
Write-Host "`n[3/5] Checking backend .env file..." -ForegroundColor Yellow
if (Test-Path "backend\.env") {
    Write-Host "✅ Backend .env file exists" -ForegroundColor Green
    $backendEnv = Get-Content "backend\.env" -Raw
    
    $checks = @(
        @{Name="PORT"; Found=$backendEnv -like "*PORT=*"},
        @{Name="CLIENT_URL"; Found=$backendEnv -like "*CLIENT_URL=*"},
        @{Name="SUPABASE_URL"; Found=$backendEnv -like "*SUPABASE_URL=*"},
        @{Name="SUPABASE_SERVICE_KEY"; Found=$backendEnv -like "*SUPABASE_SERVICE_KEY=*"}
    )
    
    foreach ($check in $checks) {
        if ($check.Found) {
            Write-Host "  ✅ $($check.Name) configured" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  $($check.Name) not found" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ Backend .env file does NOT exist" -ForegroundColor Red
    Write-Host "   Create: backend\.env with Supabase credentials" -ForegroundColor Gray
}

# Check 4: Node modules
Write-Host "`n[4/5] Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "backend\node_modules") {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Backend dependencies NOT installed" -ForegroundColor Red
    Write-Host "   Run: cd backend && npm install" -ForegroundColor Gray
}

if (Test-Path "front-end\node_modules") {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend dependencies NOT installed" -ForegroundColor Red
    Write-Host "   Run: cd front-end && npm install" -ForegroundColor Gray
}

# Check 5: Port availability
Write-Host "`n[5/5] Checking port availability..." -ForegroundColor Yellow
$ports = @(3000, 5000)
foreach ($port in $ports) {
    $connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connection) {
        Write-Host "✅ Port $port is in use (server likely running)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Port $port is available (server not running)" -ForegroundColor Yellow
    }
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   Summary" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor White
Write-Host "1. Fix any ❌ or ⚠️  issues above" -ForegroundColor Gray
Write-Host "2. Restart both servers if you made changes" -ForegroundColor Gray
Write-Host "3. Login as admin" -ForegroundColor Gray
Write-Host "4. Open browser console (F12)" -ForegroundColor Gray
Write-Host "5. Try creating a user and check the logs" -ForegroundColor Gray

Write-Host "`nFor detailed help, see: FIX_CREATE_USER_ISSUE.md`n" -ForegroundColor Cyan

