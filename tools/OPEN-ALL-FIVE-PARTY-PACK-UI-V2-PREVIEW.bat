@echo off
setlocal EnableExtensions
title MARBLE RUSH PARTY PACK UI V2 - ALL FIVE GAME PREVIEW
echo ===============================================================
echo  MARBLE RUSH - FIVE NEW GAME UIs - SAFE WINDOWS PREVIEW
echo ===============================================================
echo.
echo This creates a SEPARATE development game copy.
echo Original GitHub main and Render production are NOT modified.
echo.
where git >nul 2>nul
if errorlevel 1 goto nogit
where node >nul 2>nul
if errorlevel 1 goto nonode
where npm >nul 2>nul
if errorlevel 1 goto nonode

set "BRANCH=dev/party-pack-ui-v2-rebuild"
set "PREVIEW=%USERPROFILE%\Documents\MARBLE_RUSH_PARTY_UI_V2_COMPLETE"
if not exist "%PREVIEW%\.git" (
 echo [1/4] Cloning the latest independent development branch ...
 git clone --single-branch --branch "%BRANCH%" "https://github.com/connex222/MARBLE-RUSH.git" "%PREVIEW%"
 if errorlevel 1 goto failed
) else (
 echo [1/4] Updating the existing independent preview clone ...
 git -C "%PREVIEW%" fetch origin "%BRANCH%"
 if errorlevel 1 goto failed
 git -C "%PREVIEW%" switch "%BRANCH%"
 if errorlevel 1 goto failed
 git -C "%PREVIEW%" pull --ff-only origin "%BRANCH%"
 if errorlevel 1 goto failed
)
cd /d "%PREVIEW%" || goto failed
echo [2/4] Installing dependencies (the repository does not use npm ci) ...
call npm install --no-audit --no-fund
if errorlevel 1 goto failed
echo [3/4] Testing all five new mode UI links and the full Golf championship ...
node tools/test-party-ui-v2.js
if errorlevel 1 goto failed
node tools/test-golf.js
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo [4/4] Starting your own development TV game ...
echo.
echo   TV: http://localhost:35998/tv
echo.
echo All six games are selectable:
echo GRAND PRIX, DERBY, DROP ZONE, BOWL BRAWL, CURLING and GOLF.
echo.
echo Join mobile phones using the room code/QR on the TV.
echo Phones must be on the same Wi-Fi as the TV computer.
echo If prompted, permit Node.js on PRIVATE networks only.
echo The TV preview does not change your live Render game.
echo Close the server command window when finished.
echo.
start "MARBLE RUSH ALL FIVE UI V2 SERVER" /D "%PREVIEW%" cmd /k "set PORT=35998&node server/server.js"
timeout /t 4 /nobreak >nul
start "" "http://localhost:35998/tv"
echo.
echo Development preview launched. Nothing merged or deployed.
pause
exit /b 0

:nogit
echo Git for Windows required: https://git-scm.com/
goto failed
:nonode
echo Node.js LTS required: https://nodejs.org/
goto failed
:failed
echo.
echo PREVIEW SETUP FAILED. Production is UNCHANGED.
echo Send the full error text to ChatGPT.
pause
exit /b 1
