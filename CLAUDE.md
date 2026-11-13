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
- Duyệt bước dự án: Hiếu hoặc Hào, một người duyệt bản hiện tại là bước xong (`enrichStep`: `approvedBy` khác rỗng). Lượt duyệt có trước yêu cầu sửa của cùng bản (`fix.at`) không tính. `staff.qcOpt` không còn dùng. Booking credit và account: chỉ Hào.
- Player duyệt video (`ReviewPlayer`): video Drive phát qua `api/drive.js` (Google trả 403 nếu nhúng thẳng từ web khác). Ghi chú theo thời điểm và nét vẽ lưu ở `steps.{bước}.vn`, link video kèm theo ở `steps.{bước}.rv`.
- Bản nộp của mỗi bước hiện là V1, V2… (`vTag`, `VChip`); lịch sử nộp từng bản lưu ở `steps.{bước}.vh.v{n}`. Góp ý và yêu cầu sửa của bản cũ gom vào "Góp ý của bản cũ" và không báo đỏ.
- Link duyệt cho khách: `/r/<pid>/<mã>` (rewrite trong `vercel.json`) mở `public/review.html`, gọi `api/review.js` (Firestore REST, chỉ trả video, tên bước, góp ý của khách). Mã link ở `projects.shares.{mã}`; góp ý khách ở `steps.{bước}.vn` với `src: 'client'`. Thử API với Firestore emulator (biến `FIRESTORE_BASE`), không ghi vào database thật.
- Video tải sẵn theo khúc qua `public/rv-core.js` và `/api/drive?part=N`. Bảng nội bộ chỉ tải `projects`/`accounts` sau khi đăng nhập (`S.startPrivate`).
- Thân mỗi bước (`StepBody`): dòng "Nộp V…" trên cùng, khung "bản đang duyệt" (`vcard`: tên file, Sửa link, player, Duyệt nội bộ, Khách), Góp ý cho bản hiện tại, "Các bản trước" thu gọn. Tên file lấy qua `/api/drive?meta=1&kind=file|folder`, lưu ở `steps.{bước}.lname` và `vh.v{n}.name`. Sửa link chỉ cho người nộp và Hào, khi chưa ai duyệt bản đó.
- Nhật ký thao tác (`LogView`, `#nhat-ky`, chỉ hiện với Hào): mỗi ngày một doc `config/log-YYYY-MM-DD` = `{day, e: {<id>: {at, by, via?, t, x, pid?, pn?, sid?}}}`, ghi bằng `logPut` (set merge). `W.*` lấy mô tả bằng `logDesc*` trước khi ghi và chỉ ghi nhật ký khi lưu thành công; đăng nhập, đăng xuất, sai/đổi PIN, backup cũng ghi. Thêm kiểu ghi mới qua `W` thì bổ sung mô tả trong `logDesc*`. `via` lấy từ `mx.sess.via` khi Hào đăng nhập hộ. Trước `LOG_SINCE` và thao tác của khách lấy lại từ dữ liệu dự án (`logDerived`).
- Folder, Job ID, tên file: theo `docs/naming-convention.md` (đọc mục 0 trước khi tạo, đổi tên hay dọn file). Repo công khai: không đưa tên khách thật, tên dự án thật hay Drive ID vào repo; danh sách khách nằm ở `config/main.clients` (Cài đặt), link Job Register và Drive ở `config/main.registerUrl`, `driveUrl`.
- Job ID `YYMM_CLIENTCODE_Project-Name` (`JOB_RE`, `parseJob`, `pnameOf`), nội bộ `MX` (`INT_CODE`). `projects.parent` là Job ID của job gốc. Mã cũ `MX-YYMM-…` vẫn giữ, không tự đổi.
- Thứ tự bước: 07 Edit → 08 QC (id `s09`) → 09 Finish (id `s08`) → 10 Giao. Id giữ nguyên để dữ liệu cũ không lệch; số hiển thị và thứ tự nằm ở `STEPS`, folder Drive ở `STEPS[].folder`. Model code ở `MODELS` + `config/main.models`.
- Job Register: `api/register.js` (GET danh sách job + khách, POST thêm dòng) gọi Apps Script `apps-script/MagentX_BoardSync.gs` qua biến môi trường Vercel `REGISTER_URL`, `REGISTER_TOKEN`; chưa đặt thì trả `{configured:false}` và bảng chạy nhập tay. Phía trình duyệt: `S.reg`, `regLoad`, `regJob`, `regAdd`, `regBlocks`. Script chỉ ghi cột B, C, E–J, P vì A, D, N là ARRAYFORMULA. Thử với Apps Script giả hoặc route giả, không gọi sheet thật. Hướng dẫn cài: `docs/register-sync.md`.
- Dự án có thêm `type` (Type trong Register), `reg` ({how: paste|pick|auto|manual|had, at, by}), `intake` (id booking nội bộ). Form tạo dự án mặc định "Đã có trong Job Register" (`src: 'reg'`, dán hoặc chọn Job ID); "Chưa có, tạo mới" (`src: 'new'`) ghép Job ID và `regAdd` sau khi tạo.
- Booking nội bộ (`IntakeView`, `#noi-bo`): `config/intake` = `{b: {<id>: {name, kind, type, req, brief, deliv, due, links, est, prio, status: new|assigned|hold|declined, by, at, pid, aBy, aAt, dBy, dAt, reason}}}`, ghi bằng `intakeSave`. Lead "Nhận và giao việc" mở `ProjectForm` với `pre` (INT, tier C); lưu xong gắn `pid` và đổi status.
- Đừng ghi mã PIN hay dữ liệu thay người dùng trên web thật khi kiểm tra.
