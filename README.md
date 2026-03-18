# Quản Lý Tài Chính

Ứng dụng quản lý tài chính cá nhân chạy local, dữ liệu được mã hóa AES-256.

## Yêu cầu

- [Node.js](https://nodejs.org) v18+
- [MongoDB](https://www.mongodb.com/try/download/community) (tùy chọn)

> Nếu không có MongoDB, ứng dụng tự động dùng SQLite — dữ liệu lưu trong file `data.db` ngay trong project, không cần cài thêm gì.

## Cài đặt

```bash
# 1. Clone repo
git clone https://github.com/username/ten-repo.git
cd ten-repo

# 2. Cài dependencies
npm install

# 3. Tạo file .env từ mẫu
cp .env.example .env
```

Mở file `.env` và điền secrets:

```
MONGO_URI=mongodb://localhost:27017/QuanLyTaiChinh
SESSION_SECRET=change_me
ENCRYPT_SECRET=change_me_32_chars_minimum
```

Tạo chuỗi ngẫu nhiên bằng lệnh:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Chạy ứng dụng

```bash
# Windows — double click file:
start.bat

# Hoặc chạy thủ công:
node server.js
```

Server sẽ tự chọn port ngẫu nhiên và mở trình duyệt.

## Lưu ý

- File `.env` chứa secrets — **không chia sẻ hoặc commit lên git**
- Dữ liệu lưu local (MongoDB hoặc `data.db`), không gửi lên internet
