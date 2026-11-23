# Nối bảng với Job Register

Khi đã nối, bảng tự đọc danh sách job và khách trong sheet "[MagentX] Job Register", và tự thêm dòng cho job tạo từ bảng (job nội bộ từ Booking nội bộ, hoặc job khách chưa có Job ID). Chưa nối thì bảng vẫn chạy, chỉ là nhập tay: dán Job ID khi tạo dự án, và copy ba khối ô vào sheet.

## Quy trình sau khi nối

**Job khách**
1. Thêm dòng trong Job Register (Kick-off, Client code, Project, Type, Status, PIC, Deadline). Cột A ra Job ID.
2. Status từ Quoting trở lên thì tạo folder bằng menu **MagentX › Tạo folder cho dòng đang chọn**.
3. Trên bảng, trang **Dự án** hiện "Job Register có N job chưa lên bảng". Bấm **Tạo dự án**: Job ID, khách, Type, PIC, deadline, link folder, job gốc đã điền sẵn. Chọn quy trình, người làm, credit rồi tạo.

**Job nội bộ**
1. Ai cần việc thì vào tab **Booking nội bộ**, bấm **Gửi yêu cầu**.
2. Hào hoặc Hiếu bấm **Nhận và giao việc**: chọn quy trình, người làm, thời gian. Bảng tạo dự án `YYMM_MX_…` và thêm dòng vào Job Register (Client code MX, Type, Status Confirmed, PIC, Deadline, Notes).
3. Tạo folder bằng menu MagentX như job khách (folder nằm trong 02_INTERNAL).

## Cài đặt một lần

### 1. Apps Script trong Job Register (chủ sheet làm)
1. Mở Job Register › **Extensions › Apps Script**.
2. Thêm file mới tên `MagentX_BoardSync`, dán toàn bộ nội dung `apps-script/MagentX_BoardSync.gs` trong repo này. Nếu script đang có hàm `doGet` hoặc `doPost` khác thì báo lại trước khi dán, vì mỗi project chỉ có một hàm mỗi loại.
3. **Project Settings › Script properties › Add script property**: tên `BOARD_TOKEN`, giá trị là một chuỗi ngẫu nhiên dài ít nhất 16 ký tự (ví dụ tạo bằng trình quản lý mật khẩu). Không gửi chuỗi này qua chat.
4. **Deploy › New deployment › Web app**: Execute as **Me**, Who has access **Anyone**. Cho phép quyền khi Google hỏi. Copy **Web app URL** (dạng `https://script.google.com/macros/s/…/exec`).

Web app chỉ trả dữ liệu khi có đúng token, và không trả cột Quote, Credits, Notes.

### 2. Biến môi trường trên Cloudflare (người quản lý Cloudflare làm)
Trong Cloudflare › **Workers & Pages › board › Settings › Variables and secrets**, bấm **Add**, chọn loại **Secret**, thêm cho Production:
- `REGISTER_URL` = Web app URL ở bước 1.4
- `REGISTER_TOKEN` = chuỗi `BOARD_TOKEN` ở bước 1.3

Rồi vào **Deployments**, ở bản mới nhất bấm **⋯ › Retry deployment** (biến mới chỉ áp dụng cho lần deploy sau). Token chỉ nằm ở Cloudflare và Apps Script, không nằm trong repo hay trình duyệt.

### 3. Kiểm tra
Vào bảng › **Cài đặt › Khách hàng và Job Register**. Dòng trạng thái phải là "Đã kết nối Job Register, N job, M khách". Nếu báo lỗi token thì kiểm tra hai chuỗi có khớp không. Sửa Apps Script xong phải **Deploy › Manage deployments › Edit › New version** thì web app mới nhận code mới.

## Lưu ý
- Script ghi vào các cột nhập tay B, C, E–J, P khi thêm job, và cột **Credits Higgsfield** (tìm theo tên ở dòng tiêu đề) khi ghi credit. Cột A, D, N là ARRAYFORMULA nên không ghi đè.
- Credit: bảng ghi tổng credit **đã log** của mỗi job (mọi kỳ, mọi account, không phải số giữ chỗ) vào cột Credits Higgsfield, 2 giây sau mỗi lần log, sửa hay xóa dòng log. Nút **Ghi credit sang Job Register** ở trang Credit (chỉ Hào) ghi lại toàn bộ job có booking. Số nhập tay ở cột này sẽ bị thay bằng số log.
- Script kiểm Kick-off 4 chữ số, Client code có trong tab Clients, Project chỉ có chữ không dấu, số và gạch ngang, và không thêm Job ID trùng.
- Bảng không tự tạo folder: folder vẫn tạo bằng menu MagentX trong sheet (script hiện có).
- API của bảng không có đăng nhập phía server (giống phần còn lại của bảng), nên ai biết địa chỉ bảng vẫn gọi được. Vì vậy web app không trả giá trị báo giá và ghi chú.

## Cập nhật script (khi repo đổi `MagentX_BoardSync.gs`)
1. Mở sheet › **Extensions › Apps Script**, mở file `MagentX_BoardSync.gs`, xóa hết nội dung, dán bản mới trong repo, bấm **Save**.
2. **Deploy › Manage deployments**, chọn bản đang chạy, bấm biểu tượng bút (**Edit**), ở **Version** chọn **New version**, bấm **Deploy**. URL web app giữ nguyên nên không cần sửa Cloudflare.
3. Vào trang Credit trên bảng, bấm **Ghi credit sang Job Register** để thử. Script cũ sẽ báo "Apps Script trong Job Register là bản cũ".
