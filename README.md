# FinanceApp

Ứng dụng quản lý tài chính cá nhân chạy local. Dữ liệu được mã hóa AES-256, không gửi lên internet.

## Yêu cầu

- [Node.js](https://nodejs.org) v18+

> MongoDB là tùy chọn. Nếu không có, app tự động dùng SQLite — dữ liệu lưu trong file `data.db` ngay trong project.

## Cài đặt & Chạy

Double click vào `start.bat` — script sẽ tự động:
1. Kiểm tra Node.js
2. Cài dependencies (`npm install`)
3. Tạo file `.env` với secrets ngẫu nhiên
4. Khởi động server và mở trình duyệt

## Cấu hình (tùy chọn)

File `.env` được tạo tự động. Nếu muốn dùng MongoDB hoặc tùy chỉnh:

```
MONGO_URI=mongodb://localhost:27017/QuanLyTaiChinh
SESSION_SECRET=...
ENCRYPT_SECRET=...
```

> **Lưu ý:** Nếu đã có dữ liệu từ trước, giữ nguyên `ENCRYPT_SECRET` cũ — đổi secret sẽ không đọc được dữ liệu cũ.

## Tính năng

- Theo dõi số dư (tiền mặt, ngân hàng, ví điện tử)
- Lịch sử số dư theo ngày, tự động carry sang ngày mới
- Quản lý thu nhập với check-in hàng ngày
- Quản lý chi tiêu theo danh mục và nguồn tiền
- Thống kê trực quan
- Hỗ trợ đa ngôn ngữ (VI/EN) và dark mode
- Dữ liệu mã hóa AES-256
