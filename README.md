# MagentX Production Board

Bảng sản xuất dùng chung cho phòng: lịch, dự án, duyệt QC, credit Higgsfield, đặt tên file.
Web tĩnh trên Vercel, dữ liệu lưu ở Firebase Firestore. Không cần đăng nhập.

- `public/index.html`: toàn bộ app
- `firestore.rules`: quyền đọc/ghi database
- `api/drive.js`: hàm trung chuyển video Google Drive cho player duyệt (chạy trên Vercel)
- `vercel.json`: cấu hình deploy
- `magentx-demo-offline.html`: bản demo cũ (dữ liệu lưu trong trình duyệt), giữ lại để tham khảo

## 1. Tạo database (một lần)
1. Vào https://console.firebase.google.com, bấm **Create project** (có thể tắt Google Analytics).
2. Vào **Build › Firestore Database › Create database**, chọn location `asia-southeast1 (Singapore)` và chọn **production mode**.
3. Mở tab **Rules**, dán nội dung file `firestore.rules`, bấm **Publish**.
   Đừng chọn "test mode": rule đó tự khóa database sau 30 ngày.
4. Vào **Project settings › Your apps**, bấm biểu tượng Web `</>` để đăng ký app, rồi copy đoạn `firebaseConfig`.
5. Dán đoạn đó vào `FIREBASE_CONFIG` ở đầu phần `<script>` trong `public/index.html`.

Lần đầu mở app, database trống sẽ được ghi sẵn 5 nhân sự (Hào, Hiếu, Đô, Việt, Bích Thuận), 7 account và các thông số mặc định. Database đã có dữ liệu thì thêm người mới ở **Cài đặt**.

## Chuyển dữ liệu từ bản demo sang
1. Mở `magentx-demo-offline.html` trên đúng trình duyệt đã dùng demo, rồi bấm **Tải dữ liệu demo (.json)** trên thanh vàng ở đầu trang.
2. Mở app mới, vào **Cài đặt › Sao lưu và nhập dữ liệu › Nhập từ file backup**, chọn file vừa tải, rồi bấm **Nhập**.

## 2. Deploy lên Vercel
```
npx vercel login
npx vercel --prod
```
Chạy trong thư mục này. Khi Vercel hỏi framework, chọn **Other**. Sau mỗi lần sửa `index.html`, chạy lại `npx vercel --prod`.

## Đăng nhập bằng mã PIN
- Mở web, chọn tên mình. Lần đầu: tạo mã PIN 4 số (nhập 2 lần). Lần sau: chỉ gõ 4 số.
- Máy đã đăng nhập được giữ 24 giờ, hết hạn thì hỏi lại mã PIN. Bấm tên mình ở góc trên để **Đổi mã PIN** hoặc **Đăng xuất**.
- Chưa đăng nhập thì chỉ xem được, không sửa được.
- Mã PIN của **Hào** vào được mọi tài khoản. Ai quên mã PIN thì Hào vào **Cài đặt › Nhân sự › Mã PIN › Đặt lại**, người đó tạo mã mới ở lần đăng nhập tới.
- Mã PIN lưu dạng băm SHA-256 kèm salt trong `staff/{id}.pin`, không lưu số gốc.

## Duyệt
- **Các bước dự án:** Hiếu duyệt là bắt buộc. Hiếu duyệt bản hiện tại thì bước xong, dù Hào chưa duyệt. Hào duyệt thêm nếu cần (không bắt buộc); nếu Hào duyệt trước thì bước vẫn chờ Hiếu. Đổi ai bắt buộc hay không bắt buộc ở **Cài đặt › Nhân sự › Duyệt QC**.
- **Booking credit Higgsfield:** chỉ Hào duyệt. Chưa duyệt thì chưa được gen.

## Các bản nộp (V1, V2…)
- Mỗi lần nộp link là một bản mới: V1, V2, V3. Nhãn bản có màu theo trạng thái: vàng là đang chờ duyệt, đỏ là cần sửa, xanh là đã duyệt, xám là bản cũ đã bị thay.
- Trong bước: dòng **Kết quả** và **Duyệt** luôn ghi rõ đang nói về bản nào; dòng **Bản trước** liệt kê các bản cũ kèm lúc nộp và ai yêu cầu sửa.
- Góp ý của bản đang duyệt nằm trên. Góp ý và yêu cầu sửa của bản cũ gom vào **Góp ý của bản cũ**, hiện màu xám, không còn báo đỏ.

## Player duyệt video
- Ở mỗi bước đã nộp link tới **file video trên Google Drive** (dạng `drive.google.com/file/d/…`), bấm **Duyệt trên player**: tua bằng thanh thời gian, lùi/tới từng khung hình (phím ← →), vẽ lên khung hình, ghi chú gắn với đúng thời điểm. Người làm tick **Đã sửa** cho từng ghi chú.
- Nếu link kết quả là folder, bấm **Thêm link file video để duyệt trên player** và dán link file video trong folder đó.
- Điều kiện: file chia sẻ **Bất kỳ ai có đường liên kết**, định dạng MP4 (H.264). Không đạt thì player chuyển sang trình xem của Google Drive, thời điểm ghi chú phải nhập tay.
- Google chặn phát thẳng file Drive trên web khác, nên video đi qua `api/drive.js` trên Vercel. Băng thông tính vào gói Vercel (gói miễn phí 100 GB mỗi tháng), nên nộp bản xem nhẹ thay vì file master.
- Ghi chú và nét vẽ lưu trong `projects/{id}.steps.{bước}.vn`. Phím tắt: Space phát/dừng, ← → từng khung hình, Shift + ← → 1 giây, D bật vẽ, N gõ ghi chú, Ctrl + Enter lưu.

## Lưu ý
- Mã PIN chặn việc chọn nhầm hoặc giả tên người khác trên giao diện. Database vẫn mở cho ai có link (xem `firestore.rules`), nên vẫn chỉ gửi link trong nội bộ.
- Nút **Điều chỉnh số dư**, **Sửa account** và **Thêm account** ở trang Credit chỉ hiện khi đang đăng nhập là Hào.
- Định kỳ bấm **Xuất Excel** (ở Cài đặt, Dự án hoặc Credit) để giữ bản backup.
- Gói miễn phí Firestore cho mỗi ngày 50.000 lượt đọc, 20.000 lượt ghi và tổng 1 GiB lưu trữ. Dữ liệu không hết hạn.
