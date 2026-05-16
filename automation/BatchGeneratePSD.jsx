// ============================================================================
// SCRIPT: Tự động tạo hàng loạt ảnh thẻ/banner từ PSD template + CSV
// Chạy trên: Adobe Photoshop (File > Scripts > Browse... chọn file .jsx này)
// Tác giả: Generated for batch PSD processing
// ============================================================================

#target photoshop
app.bringToFront();

// ============================================================================
// PHẦN 1: CẤU HÌNH (chỉnh sửa các đường dẫn ở đây trước khi chạy)
// ============================================================================
var CONFIG = {
    // Đường dẫn tuyệt đối tới file PSD mẫu (KHÔNG bao giờ bị ghi đè)
    templatePath: "C:/Users/YOUR_USER/Desktop/template.psd",

    // Đường dẫn tuyệt đối tới file CSV (UTF-8, dấu phân tách: ',')
    csvPath:      "C:/Users/YOUR_USER/Desktop/data.csv",

    // Thư mục đầu ra (tự động tạo nếu chưa có)
    outputDir:    "C:/Users/YOUR_USER/Desktop/Output_Images",

    // Tên các layer trong PSD (PHẢI khớp chính xác)
    layerNameText:   "layer_name",     // Text layer chứa tên khách hàng
    layerCodeText:   "layer_code",     // Text layer chứa mã giảm giá
    layerAvatarSO:   "layer_avatar",   // Smart Object layer chứa ảnh đại diện

    // Chất lượng JPG: 0 (thấp) - 12 (cao nhất). Chuẩn yêu cầu: 12
    jpgQuality: 12,

    // Tiền tố tên file xuất ra: Anh_Chuc_Mung_<Ten>.jpg
    outputPrefix: "Anh_Chuc_Mung_"
};

// ============================================================================
// PHẦN 2: HÀM TIỆN ÍCH (Utilities)
// ============================================================================

// Bỏ khoảng trắng đầu/cuối chuỗi (ES3 không có String.trim)
function trim(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/^\s+|\s+$/g, "");
}

// Tìm vị trí phần tử trong mảng (ES3 không có Array.indexOf)
function indexOfArr(arr, value) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) return i;
    }
    return -1;
}

// Làm sạch tên file (loại bỏ các ký tự không hợp lệ trên Windows/macOS)
// LƯU Ý: Vẫn giữ lại ký tự tiếng Việt có dấu (Unicode)
function sanitizeFileName(s) {
    return trim(s).replace(/[\\\/:\*\?"<>\|]/g, "_");
}

// Ghi log ra Console (Window > Show ESTK Console khi debug)
function log(msg) {
    $.writeln("[BatchPSD] " + msg);
}

// ============================================================================
// PHẦN 3: ĐỌC FILE CSV (UTF-8, hỗ trợ trường có dấu nháy kép)
// ============================================================================

// Parse 1 dòng CSV thành mảng các cột, hỗ trợ trường được bao bởi "..."
function parseCSVLine(line) {
    var result = [];
    var current = "";
    var inQuotes = false;

    for (var i = 0; i < line.length; i++) {
        var ch = line.charAt(i);

        if (ch === '"') {
            // "" bên trong "..." => 1 dấu "
            if (inQuotes && i + 1 < line.length && line.charAt(i + 1) === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(trim(current));
            current = "";
        } else {
            current += ch;
        }
    }
    result.push(trim(current));
    return result;
}

// Đọc toàn bộ CSV thành mảng 2 chiều, dòng đầu tiên là header
function readCSV(csvFile) {
    csvFile.encoding = "UTF-8";
    if (!csvFile.open("r")) {
        throw new Error("Không thể mở file CSV: " + csvFile.fsName);
    }

    var rows = [];
    var firstLine = true;

    while (!csvFile.eof) {
        var line = csvFile.readln();
        if (line === null) break;

        // Bỏ ký tự BOM (0xFEFF) nếu có ở đầu file UTF-8
        if (firstLine && line.length > 0 && line.charCodeAt(0) === 0xFEFF) {
            line = line.substring(1);
        }
        firstLine = false;

        if (trim(line).length === 0) continue; // bỏ dòng trống
        rows.push(parseCSVLine(line));
    }

    csvFile.close();
    return rows;
}

// ============================================================================
// PHẦN 4: THAO TÁC VỚI LAYER TRONG PHOTOSHOP
// ============================================================================

// Tìm layer (đệ quy vào cả Group/LayerSet) theo tên chính xác
function findLayerByName(parent, layerName) {
    for (var i = 0; i < parent.layers.length; i++) {
        var layer = parent.layers[i];
        if (layer.name === layerName) return layer;

        // Nếu là Group, tìm tiếp bên trong
        if (layer.typename === "LayerSet") {
            var found = findLayerByName(layer, layerName);
            if (found) return found;
        }
    }
    return null;
}

// Cập nhật nội dung của một Text Layer
function updateTextLayer(doc, layerName, newText) {
    var layer = findLayerByName(doc, layerName);
    if (!layer) {
        throw new Error("Không tìm thấy layer text: '" + layerName + "'");
    }
    if (layer.kind !== LayerKind.TEXT) {
        throw new Error("Layer '" + layerName + "' không phải Text Layer");
    }
    layer.textItem.contents = newText;
    log("  - Đã cập nhật text '" + layerName + "' = " + newText);
}

// Replace Contents của Smart Object bằng file ảnh mới
// (sử dụng Action Descriptor vì DOM của PS không có hàm public cho việc này)
function replaceSmartObjectContents(doc, layerName, imagePath) {
    var layer = findLayerByName(doc, layerName);
    if (!layer) {
        throw new Error("Không tìm thấy Smart Object layer: '" + layerName + "'");
    }

    var imgFile = new File(imagePath);
    if (!imgFile.exists) {
        throw new Error("Không tìm thấy file ảnh: " + imagePath);
    }

    // Chọn layer Smart Object làm active layer
    doc.activeLayer = layer;

    // Gọi action "placedLayerReplaceContents"
    var idReplace = stringIDToTypeID("placedLayerReplaceContents");
    var desc = new ActionDescriptor();
    desc.putPath(charIDToTypeID("null"), imgFile);
    desc.putInteger(charIDToTypeID("PgNm"), 1); // page 1 (cho file PDF/AI nhiều trang)
    executeAction(idReplace, desc, DialogModes.NO);

    log("  - Đã thay thế Smart Object '" + layerName + "' = " + imagePath);
}

// ============================================================================
// PHẦN 5: XUẤT FILE JPG
// ============================================================================
function exportAsJPG(doc, outputFolder, fileName, quality) {
    var outFile = new File(outputFolder.fsName + "/" + fileName);

    var jpgOptions = new JPEGSaveOptions();
    jpgOptions.quality = quality;                              // 0..12
    jpgOptions.embedColorProfile = true;
    jpgOptions.formatOptions = FormatOptions.STANDARDBASELINE; // tương thích cao
    jpgOptions.matte = MatteType.NONE;

    // asCopy = true => xuất ra một bản copy, KHÔNG đụng tới document đang mở
    doc.saveAs(outFile, jpgOptions, true, Extension.LOWERCASE);

    log("  -> Đã xuất: " + outFile.fsName);
}

// ============================================================================
// PHẦN 6: HÀM CHÍNH (Main)
// ============================================================================
function main() {
    // --- Kiểm tra các file/đường dẫn cấu hình ---
    var templateFile = new File(CONFIG.templatePath);
    var csvFile      = new File(CONFIG.csvPath);
    var outputFolder = new Folder(CONFIG.outputDir);

    if (!templateFile.exists) {
        alert("Không tìm thấy file template:\n" + CONFIG.templatePath);
        return;
    }
    if (!csvFile.exists) {
        alert("Không tìm thấy file CSV:\n" + CONFIG.csvPath);
        return;
    }
    if (!outputFolder.exists) {
        if (!outputFolder.create()) {
            alert("Không thể tạo thư mục output: " + CONFIG.outputDir);
            return;
        }
    }

    // --- Đọc CSV ---
    var rows;
    try {
        rows = readCSV(csvFile);
    } catch (e) {
        alert("Lỗi đọc CSV: " + e.message);
        return;
    }

    if (rows.length < 2) {
        alert("File CSV phải có ít nhất 1 dòng header và 1 dòng dữ liệu.");
        return;
    }

    // --- Lấy chỉ số các cột từ header ---
    var header = rows[0];
    var idxName = indexOfArr(header, "Ten_Khach_Hang");
    var idxCode = indexOfArr(header, "Ma_Giam_Gia");
    var idxImg  = indexOfArr(header, "Duong_Dan_Anh");

    if (idxName < 0 || idxCode < 0 || idxImg < 0) {
        alert("CSV phải có đủ 3 cột: Ten_Khach_Hang, Ma_Giam_Gia, Duong_Dan_Anh");
        return;
    }

    // --- Tắt các dialog không cần thiết để chạy mượt ---
    var prevDialogMode = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;

    var totalRows   = rows.length - 1;
    var successCnt  = 0;
    var errorList   = [];

    // --- Vòng lặp xử lý từng dòng dữ liệu ---
    for (var r = 1; r < rows.length; r++) {
        var row = rows[r];

        // Bỏ qua dòng thiếu cột
        if (row.length <= Math.max(idxName, idxCode, idxImg)) {
            errorList.push("Dòng " + (r + 1) + ": thiếu cột.");
            continue;
        }

        var tenKH    = row[idxName];
        var maGG     = row[idxCode];
        var duongDan = row[idxImg];

        log("==> Xử lý dòng " + r + ": " + tenKH);

        var doc = null;
        try {
            // Mở lại file template gốc (KHÔNG ghi đè)
            doc = app.open(templateFile);

            // Bước 1: Cập nhật tên khách hàng
            updateTextLayer(doc, CONFIG.layerNameText, tenKH);

            // Bước 2: Cập nhật mã giảm giá
            updateTextLayer(doc, CONFIG.layerCodeText, maGG);

            // Bước 3: Replace Contents cho Smart Object
            replaceSmartObjectContents(doc, CONFIG.layerAvatarSO, duongDan);

            // Bước 4: Xuất JPG chất lượng 12
            var fileName = CONFIG.outputPrefix + sanitizeFileName(tenKH) + ".jpg";
            exportAsJPG(doc, outputFolder, fileName, CONFIG.jpgQuality);

            successCnt++;
        } catch (err) {
            errorList.push("Dòng " + (r + 1) + " (" + tenKH + "): " + err.message);
            log("  !! LỖI: " + err.message);
        } finally {
            // Đóng document KHÔNG lưu => template gốc không bị thay đổi
            if (doc) {
                try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) {}
            }
        }
    }

    // --- Khôi phục dialog mode ---
    app.displayDialogs = prevDialogMode;

    // --- Báo cáo kết quả ---
    var summary = "HOÀN TẤT!\n" +
        "Tổng số dòng: " + totalRows + "\n" +
        "Thành công:   " + successCnt + "\n" +
        "Lỗi:          " + errorList.length;

    if (errorList.length > 0) {
        summary += "\n\nChi tiết lỗi:\n" + errorList.join("\n");
    }
    alert(summary);
    log(summary);
}

// ============================================================================
// CHẠY SCRIPT
// ============================================================================
try {
    main();
} catch (fatalErr) {
    alert("Lỗi nghiêm trọng: " + fatalErr.message);
}
