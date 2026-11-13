# MagentX Production: folder, Job ID và tên file

Bản rút gọn phần quy tắc của tài liệu chuẩn "MagentX Production — Folder Structure & File Naming Convention" (13/11/2026).
Bản đầy đủ (danh sách khách, Drive ID, ví dụ thật) nằm trong Drive của phòng, không đưa lên repo vì repo này công khai.
Ví dụ ở đây dùng tên giả: khách `ACME` (folder `Acme_Corp`), dự án `Demo-TVC`.

## 0. Quy tắc cho agent (đọc trước)

- Không bao giờ đổi tên file camera gốc trong `04B_Shoot`.
- Không rename file đã import vào Premiere/After Effects (đã nằm trong `_SELECTS` hoặc trong project edit/comp). Rename làm media offline.
- Không xoá file. Cần dọn thì chuyển vào `_to_delete/` cùng cấp và báo lại.
- Không đưa vào `_SELECTS` file sai quy tắc, hoặc file có Shot ID không có trong shot table.
- Không tạo folder job bằng tay: folder do Apps Script của Job Register tạo. Job ID lấy từ Job Register (cột A), không tự ghép.
- Tên file chỉ dùng `A–Z a–z 0–9 _ -`. Không dấu tiếng Việt, không khoảng trắng, không dấu chấm ngoài phần đuôi file.
- Không chắc file thuộc shot, version hay take nào thì hỏi lại, không đoán.

## 1. Nguyên tắc chung

- Folder để lưu trữ, Sheet để báo cáo. Không chia folder theo tháng; tháng nằm trong Job ID.
- Cấu trúc: Khách → Job → Stage.
- `_` ngăn cách các field, `-` nối chữ bên trong một field. Field xếp từ rộng đến hẹp.
- Số luôn đệm 0: `SH010`, `v01`, `t01`, `EP03`.
- Cấm trong tên file: `final`, `final2`, `new`, `fix` (dùng như trạng thái), `sua`, `latest`, `copy`. (`_FIX` chỉ dùng làm hậu tố file phái sinh ở 05_Gen.)

## 2. Cấu trúc folder (Google Drive)

```
MAGENTX_PRODUCTION/
├── 00_ADMIN/            Job Register (Google Sheet), _TEMPLATE_JOB/
├── 01_CLIENTS/
│   └── <Tên khách đầy đủ>/
│       ├── _BRAND_ASSETS/      asset dùng chung mọi job của khách
│       └── <Job ID>/
│           ├── 01_Brief/  02_Treatment/  03_Board/  04_Asset/  04B_Shoot/
│           ├── 05_Gen/  (SH010/, SH020/…, _SELECTS/ — editor chỉ import từ _SELECTS)
│           ├── 06_Comp/  07_Edit/  08_QC/  09_Finish/  10_Giao/
│           └── 99_Admin/       báo giá, HĐ, PO, invoice
├── 02_INTERNAL/         job nội bộ (client code MX)
└── 99_ARCHIVE/<năm>/<Tên khách>/<Job ID>/
```

- Tên folder khách viết đầy đủ, không viết tắt.
- 12 folder trong job theo thứ tự pipeline: Brief → Treatment → Board → Asset → Shoot → Gen → Comp → Edit → QC → Finish → Giao, cộng Admin.
- Chỉ tạo folder khi job từ Quoting trở lên; chỉ archive khi Paid hoặc Cancelled.

## 3. Job ID

`YYMM_CLIENTCODE_Project-Name`, regex `^\d{4}_[A-Z0-9]{2,5}_[A-Za-z0-9-]+$`

| Field | Quy tắc | Ví dụ |
|---|---|---|
| `YYMM` | Tháng kick-off: tháng ký quote hoặc confirm job, không lấy tháng giao | `2611` |
| `CLIENTCODE` | Code cố định 2–5 ký tự trong tab Clients của Job Register. Nội bộ: `MX` | `ACME` |
| `Project-Name` | Không dấu, nối bằng `-`, CamelCase nếu cần | `Demo-TVC` |

- Có PO hoặc báo giá mới (extend, khách book lại): job mới, cột Parent job ghi Job ID gốc, folder đặt cạnh job gốc trong cùng folder khách. Parent job phải cùng khách.
- Revision trong cùng báo giá: giữ job cũ, chỉ tăng version. Có tiền mới thì là job mới, không có tiền mới thì là version mới.
- Khách mới phải được thêm vào tab Clients trước khi tạo job.
- Status trong Job Register: Lead → Quoting → Confirmed → Pre-pro → Production → Review → Delivered → Invoiced → Paid, hoặc Cancelled.

## 4. Tên file theo stage

### 05_Gen

```
[EPxx_][ShotID]_[Kind]_[Model]_v[NN]_t[NN][_Suffix].[ext]
```

- `EPxx`: chỉ cho job dạng series (`EP01`, `EP02`…).
- `ShotID`: `SH` + 3 chữ số, bước 10 (`SH010`, `SH020`); chèn giữa dùng `SH015`. Phải có trong shot table trước khi gen.
- `Kind`: `KF` keyframe/frame đầu, `EF` frame cuối, `VID` video, `PLT` plate nền.
- `Model`: `GPTI` GPT Image 2.5, `SDR5` Seedream 5.0 Pro, `NB2` Nano Banana 2.1, `SD25` Seedance 2.5. Model mới phải được thêm vào bảng trước khi dùng.
- `vNN` version: mỗi lần đổi input (prompt, reference, model, setting), mỗi lần chỉ đổi 1 biến. `tNN` take: các lần gen từ cùng input.
- Hậu tố file phái sinh, chỉ thêm vào cuối: `_UPS` upscale, `_RF` reframe, `_EXT` extend, `_FIX` sửa cục bộ.
- Prompt sidecar `.txt`/`.json` đặt theo version, không có take: `SH010_VID_SD25_v03.txt`.
- Mỗi shot một folder con; take được duyệt copy vào `_SELECTS/`, giữ nguyên tên. Take hỏng không cần tải; ghi lý do vào QC log theo `ShotID + vNN + tNN`.
- Regex file gen: `^(EP\d{2}_)?SH\d{3}_(KF|EF|VID|PLT)_[A-Z0-9]+_v\d{2}_t\d{2}(_(UPS|RF|EXT|FIX))*\.[a-z0-9]+$`
- Regex sidecar: `^(EP\d{2}_)?SH\d{3}_(KF|EF|VID|PLT)_[A-Z0-9]+_v\d{2}\.(txt|json)$`

### Các stage khác

| Stage | Format | Ví dụ |
|---|---|---|
| 01_Brief | `YYMMDD_[Loại]_[Nguồn]` | `261105_Brief_Acme.pdf` |
| 02_Treatment | `[JobID]_[Loại]_v[NN]` | `2611_ACME_Demo-TVC_Treatment_v02.pdf` |
| 03_Board | `[ShotID]_BRD_v[NN]`; animatic `[JobID]_Animatic_v[NN]` | `SH010_BRD_v01.png` |
| 04_Asset | `[Type]_[Tên]_[Góc]_v[NN]`; Type: `CHR`, `LOC`, `PRD`, `PRP` | `CHR_Lan_Sheet_v02.png` |
| 04B_Shoot | Giữ nguyên tên file camera, xếp theo `DAYxx/CAM-x/` | `DAY01/CAM-A/A001C003_261105.mov` |
| 06_Comp | `[ShotID]_COMP_v[NN]` | `SH010_COMP_v02.aep` |
| 07_Edit | `[JobID]_[Deliverable]_EDIT_v[NN]` | `2611_ACME_Demo-TVC_Main_EDIT_v05.prproj` |
| 08_QC | Bản gửi khách: `[JobID]_[Deliverable]_R[N]` | `2611_ACME_Demo-TVC_Main_R2.mp4` |
| 09_Finish | `[JobID]_[Deliverable]_MASTER_v[NN]` | `2611_ACME_Demo-TVC_Main_MASTER_v01.mov` |
| 10_Giao | `[JobID]_[Deliverable]_[Thời lượng]_[Tỉ lệ]_[Ngôn ngữ]` | `2611_ACME_Demo-TVC_Main_30s_16x9_VN.mp4` |
| 99_Admin | `YYMMDD_[Loại]_[Đối tác]_v[NN]` | `261020_Quote_Acme_v02.pdf` |

- Ngày `YYMMDD` chỉ dùng ở Brief và Admin.
- File nội bộ trong folder stage không cần Job ID. File gửi ra ngoài (Treatment, Animatic, bản review, bản giao) bắt buộc có Job ID đầy đủ.
- `EDIT_v` (version nội bộ) và `R` (round gửi khách) là hai dãy số riêng. Số `R` khớp số vòng revision trong hợp đồng; vượt số vòng đã ký là căn cứ tính phí thêm.
- 10_Giao không có chữ `final`. Giao lại sau khi sửa thì thêm `_v02` vào cuối.
- Deliverable: `Main`, `Cutdown`, `Teaser`, `EP01`…; thời lượng `30s`, `15s`; tỉ lệ `16x9`, `9x16`, `1x1`, `4x5`; ngôn ngữ `VN`, `EN`.

## 5. Nguồn chuẩn

- Danh sách job và Job ID: Job Register.
- Danh sách shot và Shot ID: shot table của từng job.
- Model code và client code: tài liệu chuẩn đầy đủ (đồng bộ với tab Clients).
- Rename tay là chỗ dễ hỏng nhất: chỉ tải các take ứng viên, rename hàng loạt bằng script hoặc Finder/Bridge.
