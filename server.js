require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const connectDB = require('./config/db');
const fs = require('fs');
const app = express();

connectDB();

// Random port mỗi lần start (10000–65000)
const PORT = Math.floor(Math.random() * 55000) + 10000;
// Ghi port ra file để start.bat đọc
fs.writeFileSync('.port', String(PORT));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'qltc_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/QuanLyTaiChinh',
    ttl: 10 * 365 * 24 * 60 * 60 // 10 năm tính bằng giây
  }),
  cookie: { maxAge: 10 * 365 * 24 * 60 * 60 * 1000 } // 10 năm tính bằng ms
}));
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));

// Routes
const routes = require('./routes');
app.use('/', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
