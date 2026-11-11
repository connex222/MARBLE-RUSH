@echo off
setlocal EnableExtensions
title MARBLE RUSH - REAL REBUILD - SAFE TV AND PHONE PREVIEW
echo ===========================================================
echo MARBLE RUSH - EXCLUSIVE NEW PARTY PACK GAME SCREENS
echo ===========================================================
echo.
echo This uses a separate test folder and the improvement branch.
echo It does NOT change production GitHub main or Render.
echo.
where git >nul 2>nul
if errorlevel 1 goto nogit
where node >nul 2>nul
if errorlevel 1 goto nonode
where npm >nul 2>nul
if errorlevel 1 goto nonode
set "BRANCH=improvement/marble-rush-real-rebuild"
set "WORK=%USERPROFILE%\Documents\MARBLE_RUSH_REAL_REBUILD_TEST"
if not exist "%WORK%\.git" (
 echo [1/4] Cloning the new improvement branch...
 git clone --single-branch --branch "%BRANCH%" "https://github.com/connex222/MARBLE-RUSH.git" "%WORK%"
 if errorlevel 1 goto failed
) else (
 echo [1/4] Updating this separate local preview...
 git -C "%WORK%" fetch origin "%BRANCH%"
 if errorlevel 1 goto failed
 git -C "%WORK%" switch "%BRANCH%"
 if errorlevel 1 goto failed
 git -C "%WORK%" pull --ff-only origin "%BRANCH%"
 if errorlevel 1 goto failed
)
cd /d "%WORK%" || goto failed
echo [2/4] Installing dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 goto failed
echo [3/4] Checking single renderer, physical rules and asset references...
node tools/test-party-ui-v2.js
if errorlevel 1 goto failed
node tools/test-brawl-balance.js
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo [4/4] Opening independent TV preview at port 36002...
echo.
echo TV:  http://localhost:36002/tv
echo Phones: scan the TV room QR or use your computer's LAN IP
echo         and the four-letter room code.
echo.
echo Use the same Wi-Fi and permit Node.js on PRIVATE networks.
echo Leave the server command window open during your test.
echo Test all five Party Pack modes and original Grand Prix.
echo.
start "MARBLE RUSH REAL REBUILD TEST SERVER" /D "%WORK%" cmd /k "set PORT=36002&node server/server.js"
timeout /t 4 /nobreak >nul
start "" "http://localhost:36002/tv"
echo Preview started. No GitHub merge or Render deployment.
pause
exit /b 0
:nogit
echo Git for Windows is required: https://git-scm.com/
goto failed
:nonode
echo Node.js LTS and npm are required: https://nodejs.org/
goto failed
:failed
echo.
echo TEST SETUP FAILED. Production remains unchanged.
echo Copy this window's error text back into ChatGPT.
pause
exit /b 1
