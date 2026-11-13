# MagentX Production Board

Bảng sản xuất dùng chung cho phòng: lịch, dự án, duyệt QC, credit Higgsfield, đặt tên file.
Web tĩnh trên Vercel, dữ liệu lưu ở Firebase Firestore. Không cần đăng nhập.

- `public/index.html`: toàn bộ app
- `firestore.rules`: quyền đọc/ghi database
- `api/drive.js`: hàm trung chuyển video Google Drive cho player duyệt (chạy trên Vercel)
- `api/review.js`: API cho trang duyệt của khách (đọc/ghi qua Firestore REST, chỉ trả phần khách được xem)
- `public/review.html`: trang duyệt video của khách, mở bằng link `/r/<dự án>/<mã link>`
- `public/rv-core.js`: bộ tải sẵn video theo khúc, dùng chung cho player nội bộ và trang khách
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
- Chưa đăng nhập thì không xem được bảng (dự án và credit chỉ tải sau khi đăng nhập). Khách chỉ dùng link duyệt riêng.
- Mã PIN của **Hào** vào được mọi tài khoản. Ai quên mã PIN thì Hào vào **Cài đặt › Nhân sự › Mã PIN › Đặt lại**, người đó tạo mã mới ở lần đăng nhập tới.
- Mã PIN lưu dạng băm SHA-256 kèm salt trong `staff/{id}.pin`, không lưu số gốc.

## Người dùng phòng ban khác
- Người ngoài phòng Production (Marketing, Sale, Học viện…) đăng nhập để **gửi yêu cầu việc nội bộ** và theo dõi tình trạng. Họ chỉ thấy tab **Booking nội bộ** với yêu cầu của chính mình: chờ nhận, đã giao (người làm, hạn giao, tiến độ từng bước), tạm hoãn hay từ chối kèm lý do. Họ không thấy lịch, dự án, credit, cài đặt, và không có trong lịch hay danh sách giao việc.
- **Tự tạo tài khoản:** ở màn hình đăng nhập bấm **Tạo tài khoản mới**, nhập họ tên, bộ phận, mã PIN 4 số (hai lần). Nếu Hào đặt **mã mời** ở Cài đặt thì phải gõ đúng mã đó.
- **Hào hoặc Hiếu tạo hộ:** Cài đặt › **Người dùng phòng ban khác** › nhập họ tên và bộ phận. Lần đầu đăng nhập họ tự tạo mã PIN. Ở đây cũng sửa tên, bộ phận, khóa tài khoản (bỏ tick Đang dùng), xóa tài khoản chưa gửi yêu cầu nào, và Hào đặt lại mã PIN.
- Tên tài khoản không được trùng. Mã PIN của Hào vẫn vào được mọi tài khoản.

## Duyệt
- **Các bước dự án:** Hiếu hoặc Hào duyệt bản hiện tại là bước xong, chỉ cần một trong hai người. Nếu sau khi đã duyệt mà một người bấm **Yêu cầu sửa** cho cùng bản đó thì bước chuyển sang Cần sửa (quyết định mới nhất được tính). Chọn ai được duyệt ở **Cài đặt › Nhân sự › Duyệt QC**.
- **Booking credit Higgsfield:** chỉ Hào duyệt. Chưa duyệt thì chưa được gen.

## Các bản nộp (V1, V2…)
- Mỗi lần nộp link là một bản mới: V1, V2, V3. Nhãn bản có màu theo trạng thái: vàng là đang chờ duyệt, đỏ là cần sửa, xanh là đã duyệt, xám là bản cũ đã bị thay.
- Trong bước: dòng **Kết quả** và **Duyệt** luôn ghi rõ đang nói về bản nào; dòng **Bản trước** liệt kê các bản cũ kèm lúc nộp và ai yêu cầu sửa.
- Góp ý của bản đang duyệt nằm trên. Góp ý và yêu cầu sửa của bản cũ gom vào **Góp ý của bản cũ**, hiện màu xám, không còn báo đỏ.

## Khung mỗi bước
- **Nộp V…** nằm riêng ở dòng trên cùng.
- Khung **bản đang duyệt** gom mọi thứ của bản hiện tại: tên file (bấm để mở), **Sửa link** (người nộp hoặc Hào sửa khi dán nhầm, chỉ được khi chưa ai duyệt bản đó), **Duyệt trên player**, **Duyệt nội bộ** và phản hồi của **Khách**.
- Bên dưới là **Góp ý** cho bản hiện tại, cuối cùng là **Các bản trước** (thu gọn), mỗi bản kèm tên file và góp ý của bản đó.

## Player duyệt video
- Ở mỗi bước đã nộp link tới **file video trên Google Drive** (dạng `drive.google.com/file/d/…`), bấm **Duyệt trên player**: tua bằng thanh thời gian, lùi/tới từng khung hình (phím ← →), vẽ lên khung hình, ghi chú gắn với đúng thời điểm. Người làm tick **Đã sửa** cho từng ghi chú.
- Nếu link kết quả là folder, bấm **Thêm link file video để duyệt trên player** và dán link file video trong folder đó.
- Điều kiện: file chia sẻ **Bất kỳ ai có đường liên kết**, định dạng MP4 (H.264). Không đạt thì player chuyển sang trình xem của Google Drive, thời điểm ghi chú phải nhập tay.
- Google chặn phát thẳng file Drive trên web khác, nên video đi qua `api/drive.js` trên Vercel. Băng thông tính vào gói Vercel (gói miễn phí 100 GB mỗi tháng), nên nộp bản xem nhẹ thay vì file master.
- Ghi chú và nét vẽ lưu trong `projects/{id}.steps.{bước}.vn`. Phím tắt: Space phát/dừng, ← → từng khung hình, Shift + ← → 1 giây, D bật vẽ, N gõ ghi chú, Ctrl + Enter lưu.

## Gửi link duyệt cho khách
- Trong player, bấm **Gửi khách**, rồi **Tạo link mới cho V…**. Link tự copy, dạng `https://magentx-board.vercel.app/r/<dự án>/<mã>`.
- Khách mở link không cần đăng nhập: xem video, tua từng khung hình, vẽ, gửi góp ý theo thời điểm, và bấm **Đồng ý bản này** hoặc **Cần sửa**. Khách chỉ thấy video, tên bước và góp ý của khách; không thấy dữ liệu nào khác.
- Góp ý của khách hiện ngay trong player nội bộ với nhãn **Khách: tên**; team tick **Đã sửa** như ghi chú thường, khách thấy "MagentX đã sửa". Khách yêu cầu sửa thì dự án hiện cảnh báo trong **Cần xử lý**.
- Link mở 30 ngày. Có bản mới thì bấm **Đưa V… lên link này** để khách xem bản mới trên cùng link. **Tắt link** khi không muốn khách mở nữa.
- Mã link lưu ở `projects/{id}.shares.{mã}`; góp ý của khách nằm chung `steps.{bước}.vn` với `src: 'client'`.

## Tốc độ phát video
- Player (cả nội bộ và khách) vừa phát trực tiếp vừa tải sẵn cả file về máy theo khúc 8 MB, 3 khúc song song, mỗi khúc tự thử lại khi rớt mạng. Tải xong thì tua tức thì (khoảng 0,1 giây), không phụ thuộc mạng. File lớn hơn 900 MB (260 MB trên điện thoại) chỉ phát trực tiếp.
- Mỗi lần Google Drive trả dữ liệu mất khoảng 1,5–2 giây, nên nộp bản xem nhẹ: MP4 H.264, 1080p khoảng 8–15 Mbps, bật **Fast Start / Web optimized** khi xuất để video bắt đầu phát nhanh hơn.

## Quy trình tạo job
- **Job khách:** thêm dòng trong Job Register trước, lấy Job ID ở cột A. Trên bảng bấm **Tạo dự án**, để mặc định "Đã có trong Job Register", dán Job ID (hoặc chọn trong danh sách khi đã nối sheet); bảng tự tách kick-off, client code, project và điền khách. Dán Job ID nhầm vào ô Tên dự án thì bảng tự chuyển sang ô Job ID. Job chưa có trong Register thì chọn "Chưa có, tạo mới": bảng ghép Job ID và thêm dòng vào sheet (hoặc đưa ba khối ô để copy).
- **Job nội bộ:** tab **Booking nội bộ**. Ai cũng gửi yêu cầu được (tên việc, loại, người yêu cầu, brief, hạn xong, bản giao, credit dự kiến, mức gấp). Hào hoặc Hiếu bấm **Nhận và giao việc**: form dự án mở sẵn thông tin, chọn quy trình, người làm, thời gian; bảng tạo job `YYMM_MX_…`, đánh dấu yêu cầu đã giao và đưa vào Job Register. Có thể hoãn hoặc từ chối kèm lý do.
- **Nối với Job Register:** làm một lần theo [`docs/register-sync.md`](docs/register-sync.md) (Apps Script trong sheet + hai biến môi trường trên Vercel). Khi đã nối: trang Dự án liệt kê job đang chạy trong Register mà bảng chưa có, form tạo dự án có danh sách chọn, danh sách khách lấy từ tab Clients, và thẻ "Folder và tên file" cho biết job đã có trong Register chưa. Chưa nối: thẻ đó có nút copy ba khối ô (B, E, P) để dán vào sheet, vì cột A, D, N là công thức.

## Job ID, folder và tên file
- Quy tắc nằm ở [`docs/naming-convention.md`](docs/naming-convention.md) (bản rút gọn; bản đầy đủ có danh sách khách và Drive ID nằm trong Drive của phòng).
- **Job ID** dạng `YYMM_CLIENTCODE_Project-Name`, ví dụ `2611_ACME_Demo-TVC`, lấy từ cột A của Job Register. Job nội bộ dùng `MX`. Có PO hoặc báo giá mới thì tạo job mới và chọn **Job gốc**.
- Dự án cũ giữ mã cũ (dạng `MX-2611-…`); sửa thông tin dự án để dán Job ID từ Job Register khi cần.
- **Số thứ tự trong tháng:** job lặp lại (VD content ads cho từng người) dùng Project dạng `Loại-Người-NN`: `2611_MX_ContentAds-Kiet-01`, `-02`… Job từ Booking nội bộ tự đặt Project theo loại việc và phần còn lại của tên việc ("Content ads Trâm" thành `ContentAds-Tram`; tên việc chỉ có loại việc thì lấy tên người yêu cầu), và tự lấy số tiếp theo trong tháng (xét cả dự án trên bảng lẫn job trong Job Register khi đã nối). Tạo tay mà trùng Job ID thì bảng tự thêm số. Sang tháng mới YYMM đổi nên số lại bắt đầu từ -01.
- **Cài đặt › Khách hàng và Job Register**: danh sách client code (giữ giống tab Clients, có nút dán cả bảng), link Job Register, link folder MAGENTX_PRODUCTION, model code cho tên file 05_Gen. Chỉ leader sửa.
- Pipeline theo thứ tự folder: 07 Edit → **08 QC** (gửi khách R1, R2…) → **09 Finish** → 10 Giao. Dự án lập lịch theo thứ tự cũ có nút **Đổi lịch hai bước** trong trang dự án.
- Trang **Đặt tên file**: chọn job và folder (01_Brief … 99_Admin), điền vài ô là ra tên đúng chuẩn, kèm prompt sidecar và folder shot ở 05_Gen, cảnh báo round vượt số vòng sửa trong HĐ ở 08_QC. Ô **Kiểm tra tên file** soát ký tự, chữ cấm, cấu trúc, model code và Job ID.

## Nhật ký thao tác
- Đăng nhập là Hào sẽ thấy thêm tab **Nhật ký**. Trang này ghi lại ai làm gì, lúc nào: nộp bản, sửa link, duyệt, yêu cầu sửa, góp ý, ghi chú video, lịch và giao việc, gate, booking và log credit, số credit còn, link gửi khách, nhân sự, cài đặt, đăng nhập, đăng xuất, nhập sai và đổi mã PIN.
- Khi Hào dùng mã PIN của mình để vào tài khoản người khác, các thao tác trong phiên đó có thêm dòng **Hào đăng nhập hộ**.
- Chọn **Hôm nay**, **7 ngày** hoặc **30 ngày**. Bấm thẻ tên một người để xem riêng người đó; lọc theo loại thao tác, tìm theo dự án hay nội dung; **Tải CSV** để mở bằng Excel.
- Nhật ký bắt đầu ghi từ ngày 13/11/2026. Trước đó trang lấy lại các lần nộp bản, duyệt, góp ý và gate từ dữ liệu dự án. Phản hồi của khách qua link duyệt luôn lấy từ dữ liệu dự án.
- Dữ liệu lưu ở Firestore, mỗi ngày một doc `config/log-YYYY-MM-DD` (dùng collection `config` có sẵn nên không phải sửa Firestore Rules).

## Lưu ý
- Mã PIN chặn việc chọn nhầm hoặc giả tên người khác trên giao diện. Database vẫn mở cho ai có link (xem `firestore.rules`), nên vẫn chỉ gửi link trong nội bộ.
- Nút **Điều chỉnh số dư**, **Sửa account** và **Thêm account** ở trang Credit chỉ hiện khi đang đăng nhập là Hào.
- Định kỳ bấm **Xuất Excel** (ở Cài đặt, Dự án hoặc Credit) để giữ bản backup.
- Gói miễn phí Firestore cho mỗi ngày 50.000 lượt đọc, 20.000 lượt ghi và tổng 1 GiB lưu trữ. Dữ liệu không hết hạn.
