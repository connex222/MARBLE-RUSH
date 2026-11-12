@echo off
setlocal EnableExtensions
title MARBLE RUSH - PARTY PACK UI V2 - CURLING PREVIEW
echo ===============================================================
echo MARBLE RUSH - MARBLE CURLING NEW ALPINE ICE UI - DEVELOPMENT
echo ===============================================================
echo.
echo Separate development clone. Original live MARBLE RUSH is untouched.
echo.
where git >nul 2>nul
if errorlevel 1 goto nogit
where node >nul 2>nul
if errorlevel 1 goto nonode
where npm >nul 2>nul
if errorlevel 1 goto nonode
set "BRANCH=dev/party-pack-ui-v2-rebuild"
set "PREVIEW=%USERPROFILE%\Documents\MARBLE_RUSH_PARTY_UI_V2_CURLING"
if not exist "%PREVIEW%\.git" (
 echo [1/4] Downloading approved-asset development branch ...
 git clone --single-branch --branch "%BRANCH%" "https://github.com/connex222/MARBLE-RUSH.git" "%PREVIEW%"
 if errorlevel 1 goto failed
) else (
 echo [1/4] Updating only the independent preview clone ...
 git -C "%PREVIEW%" fetch origin "%BRANCH%"
 if errorlevel 1 goto failed
 git -C "%PREVIEW%" switch "%BRANCH%"
 if errorlevel 1 goto failed
 git -C "%PREVIEW%" pull --ff-only origin "%BRANCH%"
 if errorlevel 1 goto failed
)
cd /d "%PREVIEW%" || goto failed
echo [2/4] Installing project dependencies ...
call npm install --no-audit --no-fund
if errorlevel 1 goto failed
echo [3/4] Checking removed UIs and Curling's preserved game physics ...
call node tools/test-party-ui-v2.js
if errorlevel 1 goto failed
call node tools/test-curling.js
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo [4/4] Starting the separate Curling development preview ...
echo.
echo     http://localhost:35997/tv
echo.
echo Choose MARBLE CURLING. The new Derby, Drop Zone and Brawl
echo are available too. Golf is disabled until its redesign.
echo All players' phones must be on the same local Wi-Fi network.
echo Allow Node.js private-network access if Windows asks.
echo Keep the server window open while testing. No Render changes.
echo.
start "MARBLE RUSH UI V2 CURLING SERVER" /D "%PREVIEW%" cmd /k "set PORT=35997&node server/server.js"
timeout /t 4 /nobreak >nul
start "" "http://localhost:35997/tv"
echo Independent preview launched. Nothing merged or deployed.
pause
exit /b 0

:nogit
echo Install Git for Windows from https://git-scm.com/
goto failed
:nonode
echo Install Node.js LTS from https://nodejs.org/
goto failed
:failed
echo.
echo PREVIEW SETUP FAILED. Your live game was not changed.
echo Send the error text from this window to ChatGPT.
pause
exit /b 1
