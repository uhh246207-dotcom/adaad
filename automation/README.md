# Batch Generate PSD — Hướng dẫn sử dụng

Script tự động tạo hàng loạt ảnh thẻ/banner từ một file PSD mẫu, dữ liệu lấy từ file CSV.

## 1. Yêu cầu

- Adobe Photoshop (CC 2019 trở lên — bản nào cũng chạy được ExtendScript).
- File `template.psd` đã chuẩn bị sẵn 3 layer:
  - Text layer: `layer_name`
  - Text layer: `layer_code`
  - Smart Object layer: `layer_avatar` (chuột phải layer ảnh > **Convert to Smart Object**)
- File `data.csv` mã hoá **UTF-8**, phân tách bằng dấu phẩy `,`.

## 2. Cấu trúc file CSV

```csv
Ten_Khach_Hang,Ma_Giam_Gia,Duong_Dan_Anh
Nguyễn Văn An,SALE2026-001,C:/images/avatar1.jpg
Trần Thị Bích Hằng,SALE2026-002,C:/images/avatar2.jpg
```

> **Mẹo:** Nếu giá trị có dấu phẩy hoặc xuống dòng, hãy bao trong dấu nháy kép: `"Phạm, Quốc Anh"`.

> **Lưu ý đường dẫn:** Trong CSV nên dùng dấu `/` (vd `C:/images/...`) hoặc `\\` (vd `C:\\images\\...`). Tránh `\` đơn vì có thể bị hiểu là escape.

## 3. Cách chạy

### Bước 1 — Mở file `BatchGeneratePSD.jsx` và sửa phần `CONFIG`

```javascript
var CONFIG = {
    templatePath: "C:/Users/YOUR_USER/Desktop/template.psd",
    csvPath:      "C:/Users/YOUR_USER/Desktop/data.csv",
    outputDir:    "C:/Users/YOUR_USER/Desktop/Output_Images",

    layerNameText:   "layer_name",
    layerCodeText:   "layer_code",
    layerAvatarSO:   "layer_avatar",

    jpgQuality: 12,
    outputPrefix: "Anh_Chuc_Mung_"
};
```

### Bước 2 — Chạy script

Mở Photoshop → menu **File > Scripts > Browse...** → chọn `BatchGeneratePSD.jsx`.

### Bước 3 — Xem kết quả

Sau khi chạy xong, Photoshop sẽ hiện hộp thoại tổng kết (số dòng thành công / lỗi). Ảnh JPG sẽ nằm trong thư mục `Output_Images` với tên:

```
Anh_Chuc_Mung_Nguyễn Văn An.jpg
Anh_Chuc_Mung_Trần Thị Bích Hằng.jpg
...
```

## 4. Giải thích các bước script thực hiện

Với mỗi dòng trong CSV, script sẽ:

1. **Mở lại** file `template.psd` từ đầu (đảm bảo không bị tích luỹ thay đổi từ dòng trước).
2. Tìm layer `layer_name` → đổi nội dung thành `Ten_Khach_Hang`.
3. Tìm layer `layer_code` → đổi nội dung thành `Ma_Giam_Gia`.
4. Tìm Smart Object `layer_avatar` → **Replace Contents** bằng ảnh trong `Duong_Dan_Anh`.
5. **Save As** sang JPG, quality = 12, vào thư mục `Output_Images`.
6. Đóng document với option `DONOTSAVECHANGES` → **template gốc không bao giờ bị ghi đè**.

## 5. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân | Cách khắc phục |
|---|---|---|
| `Không tìm thấy layer text: 'layer_name'` | Tên layer trong PSD viết khác (vd có khoảng trắng, viết hoa) | Mở PSD, đổi tên layer cho khớp **chính xác** với CONFIG |
| `Layer 'layer_avatar' không phải Text Layer` (khi script báo lỗi text) | Đặt nhầm tên layer text vào Smart Object | Kiểm tra lại 3 layer trong PSD |
| Ký tự tiếng Việt bị lỗi `???` | CSV không phải UTF-8 | Mở CSV bằng Notepad → **Save As** → Encoding **UTF-8** |
| `Không tìm thấy file ảnh: ...` | Đường dẫn ảnh sai hoặc dùng `\` đơn | Đổi sang `/` hoặc `\\` |
| Script chạy chậm | Bình thường — mỗi dòng phải mở lại PSD | Có thể tắt các panel History, Layers preview để tăng tốc nhẹ |

## 6. Tuỳ biến nâng cao

- **Đổi format export sang PNG**: thay `JPEGSaveOptions` bằng `PNGSaveOptions` trong hàm `exportAsJPG`.
- **Thêm cột mới** (vd `Ngay_Het_Han`): thêm vào header CSV, thêm `idxXxx = indexOfArr(...)` rồi gọi `updateTextLayer(doc, "layer_xxx", row[idxXxx])`.
- **Đổi quy tắc đặt tên file**: sửa biến `fileName` trong vòng lặp ở hàm `main()`.
