@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo 기존 데이터는 그대로 두고, 와드 일정/함께 생각하기 표만 추가합니다.
node scripts/update-database.mjs
if errorlevel 1 (
 echo 실패했습니다. 바뀐 것은 없습니다. 사용설명서의 "자주 나는 오류"를 보세요.
 pause
 exit /b 1
)
echo 완료했습니다.
pause
