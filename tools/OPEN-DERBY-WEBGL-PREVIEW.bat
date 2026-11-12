@echo off
setlocal EnableExtensions
title MARBLE RUSH - NATIVE WEBGL DERBY PREVIEW - REVIEW ONLY
echo ===========================================================
echo MARBLE RUSH - REAL 3D DERBY PILOT - NO DEPLOYMENT
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
set "BRANCH=improvement/marble-rush-derby-true3d"
set "WORK=%USERPROFILE%\Documents\MARBLE_RUSH_DERBY_3D_REVIEW"
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
echo [3/4] Checking WebGL source, exclusive stage, rules and local TV QA...
node tools/test-derby-webgl.js
if errorlevel 1 goto failed
node tools/test-party-scene-cache.js
if errorlevel 1 goto failed
node tools/test-tv-qa.js
if errorlevel 1 goto failed
node tools/test-party-ui-v2.js
if errorlevel 1 goto failed
node tools/test-brawl-balance.js
if errorlevel 1 goto failed
node tools/test-golf.js
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo [4/4] Opening native WebGL Derby prototype at port 36004...
echo.
echo TV with local performance recorder: http://localhost:36002/tv?qa=1
echo Clean TV (no diagnostics):         http://localhost:36002/tv
echo Phones: scan the TV room QR or use your computer's LAN IP
echo         and the four-letter room code.
echo.
echo Use the same Wi-Fi and permit Node.js on PRIVATE networks.
echo Leave the server command window open during your test.
echo Compare Derby with and without derby3d=1. Other modes and Grand Prix remain unchanged.
echo On TV select SAVE QA REPORT after each game for real hardware data.
echo No report can certify physical phones automatically.
echo.
start "MARBLE RUSH DERBY WEBGL REVIEW SERVER" /D "%WORK%" cmd /k "set PORT=36004&node server/server.js"
timeout /t 4 /nobreak >nul
start "" "http://localhost:36004/tv?derby3d=1"
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
