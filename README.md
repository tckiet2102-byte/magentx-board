# MagentX Production Board

Bảng sản xuất dùng chung cho phòng: lịch, dự án, duyệt QC, credit Higgsfield, đặt tên file.
Web tĩnh trên Vercel, dữ liệu lưu ở Firebase Firestore. Không cần đăng nhập.

- `public/index.html`: toàn bộ app
- `firestore.rules`: quyền đọc/ghi database
- `vercel.json`: cấu hình deploy
- `magentx-demo-offline.html`: bản demo cũ (dữ liệu lưu trong trình duyệt), giữ lại để tham khảo

## 1. Tạo database (một lần)
1. Vào https://console.firebase.google.com, bấm **Create project** (có thể tắt Google Analytics).
2. Vào **Build › Firestore Database › Create database**, chọn location `asia-southeast1 (Singapore)` và chọn **production mode**.
3. Mở tab **Rules**, dán nội dung file `firestore.rules`, bấm **Publish**.
   Đừng chọn "test mode": rule đó tự khóa database sau 30 ngày.
4. Vào **Project settings › Your apps**, bấm biểu tượng Web `</>` để đăng ký app, rồi copy đoạn `firebaseConfig`.
5. Dán đoạn đó vào `FIREBASE_CONFIG` ở đầu phần `<script>` trong `public/index.html`.

Lần đầu mở app, database trống sẽ được ghi sẵn 4 nhân sự, 7 account và các thông số mặc định.

## Chuyển dữ liệu từ bản demo sang
1. Mở `magentx-demo-offline.html` trên đúng trình duyệt đã dùng demo, rồi bấm **Tải dữ liệu demo (.json)** trên thanh vàng ở đầu trang.
2. Mở app mới, vào **Cài đặt › Sao lưu và nhập dữ liệu › Nhập từ file backup**, chọn file vừa tải, rồi bấm **Nhập**.

## 2. Deploy lên Vercel
```
npx vercel login
npx vercel --prod
```
Chạy trong thư mục này. Khi Vercel hỏi framework, chọn **Other**. Sau mỗi lần sửa `index.html`, chạy lại `npx vercel --prod`.

## Lưu ý
- Ai có link đều xem và sửa được, vì vậy chỉ gửi link trong nội bộ.
- Định kỳ bấm **Xuất Excel** (ở Cài đặt, Dự án hoặc Credit) để giữ bản backup.
- Gói miễn phí Firestore cho mỗi ngày 50.000 lượt đọc, 20.000 lượt ghi và tổng 1 GiB lưu trữ. Dữ liệu không hết hạn.
