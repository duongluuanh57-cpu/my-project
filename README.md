# FinanceApp 💰

Ứng dụng quản lý tài chính cá nhân chạy local, không cần internet.

## Tính năng

- Theo dõi số dư, thu nhập, chi tiêu theo ngày
- Lịch sử giao dịch với filter hôm nay / 7 ngày / 30 ngày
- Biểu đồ thống kê theo tuần và theo tháng
- Quản lý nguồn tiền và danh mục chi tiêu riêng cho từng tài khoản
- Đa ngôn ngữ (Tiếng Việt / English)
- Dark mode
- Quên mật khẩu qua email
- Dữ liệu được mã hóa trong database

## Yêu cầu

- [Node.js](https://nodejs.org) v18+
- MongoDB (tùy chọn — nếu không có sẽ tự dùng SQLite)

## Cài đặt & Chạy

Chỉ cần double-click `start.bat` — tự động:
- Kiểm tra Node.js
- Cài dependencies
- Tạo file `.env`
- Mở trình duyệt

## Lệnh terminal

Sau khi server khởi động, terminal hỗ trợ các lệnh:

| Lệnh | Mô tả |
|------|-------|
| `help` | Xem danh sách lệnh |
| `status` | Trạng thái server |
| `open` | Mở trình duyệt |
| `mode` | Chế độ DB đang dùng |
| `restart` | Khởi động lại server |
| `exit` | Tắt server |

## Cấu hình email (quên mật khẩu)

Điền vào file `.env`:

```
MAIL_USER=your_gmail@gmail.com
MAIL_PASS=your_app_password
APP_URL=http://localhost:PORT
```

> Dùng Gmail App Password: Google Account → Security → 2-Step Verification → App passwords

## Database

| Chế độ | Khi nào dùng |
|--------|-------------|
| MongoDB | Khi có MongoDB đang chạy |
| SQLite | Fallback tự động, lưu file `data.db` trong project |

> **Lưu ý:** Giữ nguyên `ENCRYPT_SECRET` trong `.env` để đọc được data cũ.

## Tech stack

- **Backend:** Node.js, Express, EJS
- **Database:** MongoDB + Mongoose / SQLite (fallback)
- **Auth:** bcryptjs, express-session
- **Frontend:** Vanilla JS, Chart.js, Font Awesome
