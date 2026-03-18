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

:: ── Nếu server cũ vẫn đang chạy thì mở tab đó luôn ──────────────────────
if exist ".port" (
  set /p OLD_PORT=<.port
  powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:%OLD_PORT%' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop; exit 0 } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    echo Server cu van dang chay tai port %OLD_PORT%
    start http://localhost:%OLD_PORT%
    exit /b 0
  )
)

:: ── Khởi động server mới ───────────────────────────────────────────────────
echo Dang khoi dong server...
if exist ".port" del ".port"

start "FinanceApp" cmd /k "node server.js"
