@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo [1/3] Node.js 확인
node -v || (echo Node.js 22 이상을 먼저 설치하세요: https://nodejs.org & pause & exit /b 1)
echo [2/3] 부품 설치 (처음 한 번, 몇 분 걸립니다)
call npm ci || (echo 설치 실패 & pause & exit /b 1)
echo [3/3] 자동 검사와 사이트 조립
call npm test || (echo 검사 실패 & pause & exit /b 1)
call npm run build || (echo 조립 실패 & pause & exit /b 1)
echo 모두 통과했습니다.
pause
