# 🚀 HƯỚNG DẪN SIÊU NGẮN

## ✅ Chỉ cần làm 4 bước:

### Bước 1: Tạo 1 thư mục mới ở đâu cũng được (vd: Desktop)

### Bước 2: Bỏ TẤT CẢ vào trong thư mục đó:

```
📁 Thư mục của bạn (đặt tên gì cũng được)
  ├── 📄 BatchGeneratePSD.jsx  ← script (tải từ đây)
  ├── 📄 template.psd           ← file PSD bạn thiết kế
  ├── 📄 data.csv               ← danh sách (xuất từ Excel, kiểu UTF-8)
  └── 📁 images
       ├── 🖼️ avatar1.jpg
       ├── 🖼️ avatar2.jpg
       └── ...
```

### Bước 3: Mở Photoshop → `File` → `Scripts` → `Browse...` → chọn `BatchGeneratePSD.jsx`

### Bước 4: Chờ. Xong! Ảnh xuất ra thư mục `Output_Images/` ngay bên cạnh.

---

## 📋 Yêu cầu file PSD

File `template.psd` PHẢI có 3 layer với tên CHÍNH XÁC:
- **Text Layer:** `layer_name` (chứa tên khách)
- **Text Layer:** `layer_code` (chứa mã giảm giá)
- **Smart Object:** `layer_avatar` (chứa ảnh avatar — chuột phải layer ảnh > Convert to Smart Object)

## 📋 Yêu cầu file CSV

- Lưu kiểu **UTF-8** (Excel: Save As > CSV UTF-8)
- 3 cột: `Ten_Khach_Hang`, `Ma_Giam_Gia`, `Duong_Dan_Anh`
- Cột `Duong_Dan_Anh` ghi đường dẫn tương đối: `images/avatar1.jpg`

---

## ⚙️ Không cần sửa code!

Script tự tìm `template.psd` và `data.csv` trong cùng thư mục với chính nó. Không phải sửa đường dẫn gì cả.

Nếu muốn đổi tên 3 layer trong PSD, chỉ cần sửa 3 dòng này ở đầu script:

```javascript
layerNameText:   "layer_name",
layerCodeText:   "layer_code",
layerAvatarSO:   "layer_avatar",
```
