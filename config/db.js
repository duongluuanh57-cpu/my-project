const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/QuanLyTaiChinh';

// Flag toàn cục — true = dùng SQLite
global.USE_SQLITE = false;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB connected:', MONGO_URI);
  } catch (err) {
    console.warn('MongoDB không khả dụng, chuyển sang SQLite:', err.message);
    global.USE_SQLITE = true;
  }
};

module.exports = connectDB;
