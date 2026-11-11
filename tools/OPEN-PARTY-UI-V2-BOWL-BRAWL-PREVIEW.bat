@echo off
setlocal EnableExtensions
title MARBLE RUSH - PARTY PACK UI V2 - BOWL BRAWL PREVIEW
echo ==========================================================
echo MARBLE RUSH - BOWL BRAWL NEW UI - SAFE DEVELOPMENT PREVIEW
echo ==========================================================
echo.
echo Runs a separate development copy. LIVE RENDER IS NOT CHANGED.
echo.
where git >nul 2>nul
if errorlevel 1 goto nogit
where node >nul 2>nul
if errorlevel 1 goto nonode
where npm >nul 2>nul
if errorlevel 1 goto nonode
set "BRANCH=dev/party-pack-ui-v2-rebuild"
set "PREVIEW=%USERPROFILE%\Documents\MARBLE_RUSH_PARTY_UI_V2_BRAWL"
if not exist "%PREVIEW%\.git" (
 echo [1/4] Cloning approved-asset development branch ...
 git clone --single-branch --branch "%BRANCH%" "https://github.com/connex222/MARBLE-RUSH.git" "%PREVIEW%"
 if errorlevel 1 goto failed
) else (
 echo [1/4] Pulling latest new Brawl, Derby and Drop Zone UIs ...
 git -C "%PREVIEW%" fetch origin "%BRANCH%"
 if errorlevel 1 goto failed
 git -C "%PREVIEW%" switch "%BRANCH%"
 if errorlevel 1 goto failed
 git -C "%PREVIEW%" pull --ff-only origin "%BRANCH%"
 if errorlevel 1 goto failed
)
cd /d "%PREVIEW%" || goto failed
echo [2/4] Installing dependencies (no package-lock; npm ci is not valid) ...
call npm install --no-audit --no-fund
if errorlevel 1 goto failed
echo [3/4] Checking replaced UIs and real Bowl Brawl physics ...
node tools/test-party-ui-v2.js
if errorlevel 1 goto failed
node tools/test-brawl.js
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo [4/4] Starting your independent TV preview ...
echo.
echo URL: http://localhost:35996/tv
echo.
echo Select BOWL BRAWL, or choose the rebuilt Derby or Drop Zone.
echo Grand Prix is unchanged. Curling and Golf remain locked.
echo Join up to 8 phones with the QR; use same local Wi-Fi.
echo Leave the server window open during play.
echo If firewall asks, allow Node.js access on PRIVATE networks.
echo.
start "MARBLE RUSH UI V2 BRAWL SERVER" /D "%PREVIEW%" cmd /k "set PORT=35996&node server/server.js"
timeout /t 4 /nobreak >nul
start "" "http://localhost:35996/tv"
echo Preview launched; original live MARBLE RUSH is unchanged.
pause
exit /b 0

:nogit
echo Git for Windows is required: https://git-scm.com/
goto failed
:nonode
echo Node.js and npm required: https://nodejs.org/
goto failed
:failed
echo.
echo DEVELOPMENT PREVIEW FAILED - no production change.
echo Send the full error text to ChatGPT.
pause
exit /b 1
