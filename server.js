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

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Mode: ${global.USE_SQLITE ? 'SQLite' : 'MongoDB'}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
