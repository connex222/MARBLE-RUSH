@echo off
setlocal EnableExtensions
title MARBLE RUSH - Drop Zone Real 3D Physical TV Review
echo.
echo   MARBLE RUSH - PRIVATE PHYSICAL 3D REVIEW
echo   This does NOT alter the deployed game.
echo.
where git >nul 2>nul
if errorlevel 1 (
 echo Git for Windows is not installed or cannot be found.
 pause
 exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js is not installed or cannot be found.
 pause
 exit /b 1
)
set "TARGET=%USERPROFILE%\Documents\MARBLE_RUSH_DROPZONE3D_PHYSICAL_REVIEW"
if exist "%TARGET%" (
 echo The private review folder already exists:
 echo %TARGET%
 echo To avoid overwriting your work, this launcher will not replace it.
 echo Rename the folder and run the launcher again if you want a fresh copy.
 pause
 exit /b 1
)
git clone --depth=1 --branch improvement/marble-rush-dropzone-real3d --single-branch https://github.com/connex222/MARBLE-RUSH.git "%TARGET%"
if errorlevel 1 (
 echo Git clone failed. Check your GitHub connection/access.
 pause
 exit /b 1
)
cd /d "%TARGET%"
call npm install --no-audit --no-fund
if errorlevel 1 goto :fail
call npm run build
if errorlevel 1 goto :fail
echo.
echo Compare the two screens in the SAME Windows browser:
echo Original: http://localhost:36005/tv
echo Actual 3D: http://localhost:36005/tv?dropzone3d=1
echo.
echo TV physical test: check real FPS, 3D perspective, bin alignment,
echo full 5 rounds, 2-4 phones, reconnects, and 20 minutes of play.
echo Do NOT treat GitHub SwiftShader results as actual TV frame rate.
echo.
start "MARBLE RUSH review server" /D "%TARGET%" cmd /k "set PORT=36005&& node server/server.js"
timeout /t 4 /nobreak >nul
start "" "http://localhost:36005/tv?dropzone3d=1"
goto :done
:fail
echo.
echo Preparation failed. No production service was modified.
pause
:done
endlocal
