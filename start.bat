@echo off
cd /d "%~dp0"

:: ── Kiểm tra Node.js ──────────────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo [LOI] Chua cai Node.js. Tai tai: https://nodejs.org
  pause
  exit /b 1
)

:: ── Cài dependencies nếu chưa có ─────────────────────────────────────────
if not exist "node_modules" (
  echo Dang cai dependencies...
  npm install
  if errorlevel 1 (
    echo [LOI] npm install that bai.
    pause
    exit /b 1
  )
)

:: ── Tạo .env nếu chưa có ──────────────────────────────────────────────────
if not exist ".env" (
  echo Tao file .env...
  for /f %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set SESSION_SECRET=%%i
  for /f %%i in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set ENCRYPT_SECRET=%%i
  (
    echo MONGO_URI=mongodb://localhost:27017/QuanLyTaiChinh
    echo SESSION_SECRET=%SESSION_SECRET%
    echo ENCRYPT_SECRET=%ENCRYPT_SECRET%
  ) > .env
  echo File .env da duoc tao tu dong.
)

:: ── Khởi động server ───────────────────────────────────────────────────────
echo Dang khoi dong server...

if exist ".port" del ".port"

start /b cmd /c "node server.js > .server.log 2>&1"

echo Cho server khoi dong...
:wait
timeout /t 1 /nobreak > nul
if not exist ".port" goto wait

set /p PORT=<.port

echo Server dang chay tai port %PORT%
start http://localhost:%PORT%
