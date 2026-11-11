@echo off
setlocal EnableExtensions
title MARBLE RUSH - AAA 3D DEVELOPMENT PREVIEW
echo ============================================================
echo   MARBLE RUSH - CINEMATIC 3D PREVIEW
echo   Development branch only - production is NOT changed.
echo ============================================================
echo.
where git >nul 2>nul
if errorlevel 1 goto missing_git
where node >nul 2>nul
if errorlevel 1 goto missing_node
where npm >nul 2>nul
if errorlevel 1 goto missing_node

set "PREVIEW=%USERPROFILE%\Documents\MARBLE_RUSH_AAA_3D_PREVIEW"
set "BRANCH=dev/aaa-gameplay-cinematic-rebuild"
if not exist "%PREVIEW%\.git" (
  echo [1/4] Copying the independent development branch...
  git clone --single-branch --branch "%BRANCH%" "https://github.com/connex222/MARBLE-RUSH.git" "%PREVIEW%"
  if errorlevel 1 goto failed
) else (
  echo [1/4] Updating the separate preview directory...
  git -C "%PREVIEW%" fetch origin "%BRANCH%"
  if errorlevel 1 goto failed
  git -C "%PREVIEW%" switch "%BRANCH%"
  if errorlevel 1 goto failed
  git -C "%PREVIEW%" pull --ff-only origin "%BRANCH%"
  if errorlevel 1 goto failed
)
cd /d "%PREVIEW%" || goto failed
echo [2/4] Installing local build dependencies...
echo (Using npm install rather than npm ci because this repo has no lockfile.)
call npm install --no-audit --no-fund
if errorlevel 1 goto failed
echo [3/4] Building the complete TV/phone preview...
call npm run build
if errorlevel 1 goto failed
node tools/test-3d-visuals.js
if errorlevel 1 goto failed
echo [4/4] Opening the preview on this PC...
echo.
echo You will see MARBLE RUSH running in its own command window.
echo TV preview:  http://localhost:35993/tv
echo Phone join:  http://YOUR-PC-LAN-IP:35993/play
echo.
echo For phones, use the QR code from the TV screen. Your devices
echo must share one Wi-Fi network; permit Node.js on PRIVATE networks
echo if Windows Firewall asks. Close the extra command window to stop.
echo.
start "MARBLE RUSH AAA 3D SERVER" cmd /k "cd /d ""%PREVIEW%"" && set PORT=35993 && node server/server.js"
timeout /t 4 /nobreak >nul
start "" "http://localhost:35993/tv"
echo SUCCESS - Development preview started. Production unchanged.
echo.
pause
exit /b 0

:missing_git
echo ERROR: Git for Windows is required. Install from https://git-scm.com/
goto failed
:missing_node
echo ERROR: Node.js and npm are required. Install the Node.js LTS version.
goto failed
:failed
echo.
echo PREVIEW SETUP FAILED. No GitHub merge or Render deployment occurred.
echo If the failure persists, send the error shown above to ChatGPT.
pause
exit /b 1
