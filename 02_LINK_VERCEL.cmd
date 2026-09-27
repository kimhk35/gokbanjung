@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 LTS first: https://nodejs.org/
  pause
  exit /b 1
)
node scripts/manual-vercel.mjs link
if errorlevel 1 (
  echo FAILED. Read the error above. Do not continue to the next step.
  pause
  exit /b 1
)
echo DONE.
pause
