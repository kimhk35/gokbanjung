@echo off
setlocal
cd /d "%~dp0"
node scripts/update-database.mjs
if errorlevel 1 (
 echo FAILED. Do not deploy until the database update succeeds.
 pause
 exit /b 1
)
echo DONE.
pause
