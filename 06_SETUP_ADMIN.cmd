@echo off
setlocal
cd /d "%~dp0"
node scripts/bootstrap-admin.mjs
if errorlevel 1 (
 echo FAILED. Check the selected Supabase project and credentials.
 pause
 exit /b 1
)
echo DONE.
pause
