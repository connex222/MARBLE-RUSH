@echo off
setlocal EnableExtensions
title MARBLE RUSH - PARTY PACK UI V2 - DERBY DEVELOPMENT
echo ===========================================================
echo MARBLE RUSH - CLEAN PARTY PACK UI V2 - MARBLE DERBY
echo ===========================================================
echo.
echo This tests a separate DEVELOPMENT branch only.
echo Live MARBLE RUSH and Render will NOT be changed.
echo.
where git >nul 2>nul
if errorlevel 1 goto nogit
where node >nul 2>nul
if errorlevel 1 goto nonode
where npm >nul 2>nul
if errorlevel 1 goto nonode

set "BRANCH=dev/party-pack-ui-v2-rebuild"
set "PREVIEW=%USERPROFILE%\Documents\MARBLE_RUSH_PARTY_UI_V2_DERBY"
if not exist "%PREVIEW%\.git" (
 echo [1/4] Downloading the new clean build ...
 git clone --single-branch --branch "%BRANCH%" "https://github.com/connex222/MARBLE-RUSH.git" "%PREVIEW%"
 if errorlevel 1 goto failed
) else (
 echo [1/4] Updating the independent preview folder ...
 git -C "%PREVIEW%" fetch origin "%BRANCH%"
 if errorlevel 1 goto failed
 git -C "%PREVIEW%" switch "%BRANCH%"
 if errorlevel 1 goto failed
 git -C "%PREVIEW%" pull --ff-only origin "%BRANCH%"
 if errorlevel 1 goto failed
)
cd /d "%PREVIEW%" || goto failed
echo [2/4] Installing build dependencies (this repository has no package-lock.json) ...
call npm install --no-audit --no-fund
if errorlevel 1 goto failed
echo [3/4] Checking Derby and compiling approved art ...
call node tools/test-party-ui-v2.js
if errorlevel 1 goto failed
call node tools/test-derby.js
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo [4/4] Starting Derby preview. Open the address below if needed:
echo.
echo    http://localhost:35995/tv
echo.
echo Grand Prix and Derby are available in this build.
echo Drop Zone, Brawl, Curling and Golf remain unavailable pending rebuild.
echo Join phones using the lobby QR and the same Wi-Fi network.
echo Permit Node.js on PRIVATE networks if Windows Firewall asks.
echo Close the separate server window when finished.
echo.
start "MARBLE RUSH PARTY UI V2 PREVIEW SERVER" /D "%PREVIEW%" cmd /k "set PORT=35995&node server/server.js"
timeout /t 4 /nobreak >nul
start "" "http://localhost:35995/tv"
echo The development preview is running. Your live game remains unchanged.
pause
exit /b 0

:nogit
echo Git for Windows is required: https://git-scm.com/
goto failed
:nonode
echo Node.js and npm are required: https://nodejs.org/
goto failed
:failed
echo.
echo PREVIEW SETUP FAILED. No changes to your production game.
echo Send this black window's error text to ChatGPT.
pause
exit /b 1
