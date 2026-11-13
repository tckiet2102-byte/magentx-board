# Quy trình cập nhật

Vercel deploy tự động từ nhánh `main` của repo này (https://magentx-board.vercel.app). Mỗi lần sửa xong phải đẩy lên GitHub ngay để web cập nhật, không để thay đổi nằm trên máy:

1. `git fetch origin main`, tạo nhánh mới từ `origin/main` (ví dụ `feature/<việc>` hoặc `update/<việc>`).
2. Sửa `public/index.html` (toàn bộ app nằm trong file này), chạy thử, commit.
3. `git push -u origin <nhánh>`.
4. Merge vào `main` (fast-forward), `git push origin main`.
5. Chờ Vercel deploy (khoảng 20–30 giây), kiểm tra https://magentx-board.vercel.app đã trả về code mới.

# Ghi chú app

- Dữ liệu ở Firebase Firestore (cấu hình `FIREBASE_CONFIG` đầu file), quyền ở `firestore.rules`.
- Đăng nhập bằng mã PIN 4 số (`staff/{id}.pin`, băm SHA-256 + salt), giữ 24 giờ trên mỗi máy. Mã PIN của Hào vào được mọi tài khoản.
- Duyệt bước dự án: Hiếu bắt buộc, Hào không bắt buộc (`staff.qcOpt`). Booking credit và account: chỉ Hào.
- Player duyệt video (`ReviewPlayer`): video Drive phát qua `api/drive.js` (Google trả 403 nếu nhúng thẳng từ web khác). Ghi chú theo thời điểm và nét vẽ lưu ở `steps.{bước}.vn`, link video kèm theo ở `steps.{bước}.rv`.
- Bản nộp của mỗi bước hiện là V1, V2… (`vTag`, `VChip`); lịch sử nộp từng bản lưu ở `steps.{bước}.vh.v{n}`. Góp ý và yêu cầu sửa của bản cũ gom vào "Góp ý của bản cũ" và không báo đỏ.
- Link duyệt cho khách: `/r/<pid>/<mã>` (rewrite trong `vercel.json`) mở `public/review.html`, gọi `api/review.js` (Firestore REST, chỉ trả video, tên bước, góp ý của khách). Mã link ở `projects.shares.{mã}`; góp ý khách ở `steps.{bước}.vn` với `src: 'client'`. Thử API với Firestore emulator (biến `FIRESTORE_BASE`), không ghi vào database thật.
- Video tải sẵn theo khúc qua `public/rv-core.js` và `/api/drive?part=N`. Bảng nội bộ chỉ tải `projects`/`accounts` sau khi đăng nhập (`S.startPrivate`).
- Thân mỗi bước (`StepBody`): dòng "Nộp V…" trên cùng, khung "bản đang duyệt" (`vcard`: tên file, Sửa link, player, Duyệt nội bộ, Khách), Góp ý cho bản hiện tại, "Các bản trước" thu gọn. Tên file lấy qua `/api/drive?meta=1&kind=file|folder`, lưu ở `steps.{bước}.lname` và `vh.v{n}.name`. Sửa link chỉ cho người nộp và Hào, khi chưa ai duyệt bản đó.
- Đừng ghi mã PIN hay dữ liệu thay người dùng trên web thật khi kiểm tra.
