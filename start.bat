@echo off
cd /d "%~dp0"

echo Dang khoi dong server...

if exist ".port" del ".port"

start /b cmd /c "npm run dev > .server.log 2>&1"

echo Cho server khoi dong...
:wait
timeout /t 1 /nobreak > nul
if not exist ".port" goto wait

set /p PORT=<.port

echo Server dang chay tai port %PORT%
start http://localhost:%PORT%
