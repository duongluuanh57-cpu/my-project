require('dotenv').config();
const express = require('express');
const session = require('express-session');
const connectDB = require('./config/db');
const fs = require('fs');
const app = express();

// Random port mỗi lần start (10000–65000)
const PORT = Math.floor(Math.random() * 55000) + 10000;
fs.writeFileSync('.port', String(PORT));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));

async function start() {
  // Phải await để biết dùng MongoDB hay SQLite trước khi setup session
  await connectDB();

  let sessionStore;
  if (!global.USE_SQLITE) {
    // MongoDB mode — dùng connect-mongo
    const { MongoStore } = require('connect-mongo');
    sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/QuanLyTaiChinh',
      ttl: 10 * 365 * 24 * 60 * 60
    });
  } else {
    // SQLite mode — dùng session-file-store (lưu file trong project)
    const FileStore = require('session-file-store')(session);
    sessionStore = new FileStore({ path: './sessions', ttl: 10 * 365 * 24 * 60 * 60, logFn: () => {} });
  }

  app.use(session({
    secret: process.env.SESSION_SECRET || 'qltc_secret_key',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { maxAge: 10 * 365 * 24 * 60 * 60 * 1000 }
  }));

  const routes = require('./routes');
  app.use('/', routes);

  // SSE endpoint — client dùng để detect server tắt
  const sseClients = [];
  app.get('/__ping', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write('data: ok\n\n');
    sseClients.push(res);
    req.on('close', () => {
      const i = sseClients.indexOf(res);
      if (i !== -1) sseClients.splice(i, 1);
    });
  });

  const server = app.listen(PORT, () => {
    console.log('');
    console.log('  FinanceApp dang chay!');
    console.log('  URL   : http://localhost:' + PORT);
    console.log('  Mode  : ' + (global.USE_SQLITE ? 'SQLite' : 'MongoDB'));
    console.log('');
    console.log('  Go "help" de xem danh sach lenh.');
    console.log('');
    // Tự mở browser
    require('child_process').exec('start http://localhost:' + PORT);
  });

  // ── CLI tương tác ──────────────────────────────────────────────────────
  if (process.stdin.isTTY) {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' });
    rl.prompt();
    rl.on('line', async (line) => {
      const cmd = line.trim().toLowerCase();
      switch (cmd) {
        case 'help':
          console.log('');
          console.log('  Danh sach lenh:');
          console.log('  help       - Hien thi danh sach lenh nay');
          console.log('  status     - Kiem tra trang thai server');
          console.log('  open       - Mo trinh duyet');
          console.log('  mode       - Hien thi che do DB (MongoDB/SQLite)');
          console.log('  restart    - Khoi dong lai server');
          console.log('  exit       - Tat server');
          console.log('');
          break;
        case 'status':
          console.log('  Server: dang chay');
          console.log('  Port  : ' + PORT);
          console.log('  DB    : ' + (global.USE_SQLITE ? 'SQLite' : 'MongoDB'));
          console.log('  URL   : http://localhost:' + PORT);
          break;
        case 'open':
          require('child_process').exec('start http://localhost:' + PORT);
          console.log('  Mo trinh duyet...');
          break;
        case 'mode':
          console.log('  DB mode: ' + (global.USE_SQLITE ? 'SQLite (local)' : 'MongoDB'));
          break;
        case 'restart':
          console.log('  Dang khoi dong lai server...');
          rl.close();
          server.close(() => {
            const { spawn } = require('child_process');
            spawn(process.execPath, [__filename], {
              stdio: 'inherit',
              cwd: __dirname,
              detached: false
            }).on('exit', (code) => process.exit(code ?? 0));
          });
          return; // không gọi rl.prompt() nữa
        case 'exit':
        case 'quit':
          console.log('  Dang tat server...');
          server.close(() => process.exit(0));
          break;
        case '':
          break;
        default:
          console.log('  Lenh khong hop le. Go "help" de xem danh sach lenh.');
      }
      rl.prompt();
    });
  }
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
