@echo off
cd /d "%~dp0"

:: ── Kiểm tra Node.js, tự cài nếu chưa có ────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo [INFO] Chua co Node.js. Dang tu dong cai dat...
  where winget >nul 2>&1
  if errorlevel 1 (
    echo [LOI] Khong tim thay winget. Vui long cai Node.js thu cong tai: https://nodejs.org
    pause
    exit /b 1
  )
  winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  if errorlevel 1 (
    echo [LOI] Cai Node.js that bai. Vui long cai thu cong tai: https://nodejs.org
    pause
    exit /b 1
  )
  echo [INFO] Da cai xong. Vui long dong va mo lai start.bat de tiep tuc.
  pause
  exit /b 0
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
  powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:%OLD_PORT%' -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
  if not errorlevel 1 (
    echo Server dang chay tai port %OLD_PORT%
    start http://localhost:%OLD_PORT%
    exit /b 0
  )
)

:: ── Khởi động server ───────────────────────────────────────────────────────
if exist ".port" del ".port"
node server.js
