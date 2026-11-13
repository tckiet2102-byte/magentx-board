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

### 2. Biến môi trường trên Vercel (người quản lý Vercel làm)
Trong project magentx-board trên Vercel › **Settings › Environment Variables**, thêm cho Production:
- `REGISTER_URL` = Web app URL ở bước 1.4
- `REGISTER_TOKEN` = chuỗi `BOARD_TOKEN` ở bước 1.3

Rồi **Redeploy** bản mới nhất. Token chỉ nằm ở Vercel và Apps Script, không nằm trong repo hay trình duyệt.

### 3. Kiểm tra
Vào bảng › **Cài đặt › Khách hàng và Job Register**. Dòng trạng thái phải là "Đã kết nối Job Register, N job, M khách". Nếu báo lỗi token thì kiểm tra hai chuỗi có khớp không. Sửa Apps Script xong phải **Deploy › Manage deployments › Edit › New version** thì web app mới nhận code mới.

## Lưu ý
- Script ghi vào các cột nhập tay B, C, E–J, P. Cột A, D, N là ARRAYFORMULA nên không ghi đè.
- Script kiểm Kick-off 4 chữ số, Client code có trong tab Clients, Project chỉ có chữ không dấu, số và gạch ngang, và không thêm Job ID trùng.
- Bảng không tự tạo folder: folder vẫn tạo bằng menu MagentX trong sheet (script hiện có).
- API của bảng không có đăng nhập phía server (giống phần còn lại của bảng), nên ai biết địa chỉ bảng vẫn gọi được. Vì vậy web app không trả giá trị báo giá và ghi chú.
