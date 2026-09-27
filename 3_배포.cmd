@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
git add -A
git commit -m "사이트 수정" || echo 새로 바뀐 파일이 없습니다.
git push || (echo GitHub 올리기 실패. 인터넷과 GitHub 로그인을 확인하세요. & pause & exit /b 1)
echo GitHub에 올렸습니다. 1~2분 뒤 Vercel이 사이트를 자동으로 새로 만듭니다.
pause
