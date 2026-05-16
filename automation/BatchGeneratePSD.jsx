// ============================================================================
// SCRIPT: Tự động tạo hàng loạt ảnh từ PSD template + CSV
// CÁCH DÙNG SIÊU ĐƠN GIẢN:
//   1. Để file này, template.psd, data.csv vào CÙNG 1 thư mục
//   2. Mở Photoshop > File > Scripts > Browse... > chọn file này
//   3. Xong! Ảnh xuất ra thư mục "Output_Images" ngay bên cạnh
// ============================================================================

#target photoshop
app.bringToFront();

// ============================================================================
// TỰ ĐỘNG: Lấy thư mục chứa script này (KHÔNG CẦN SỬA GÌ!)
// ============================================================================
var SCRIPT_FOLDER = new File($.fileName).parent;

var CONFIG = {
    // Tự tìm 3 file trong CÙNG thư mục với script
    templatePath: SCRIPT_FOLDER + "/template.psd",
    csvPath:      SCRIPT_FOLDER + "/data.csv",
    outputDir:    SCRIPT_FOLDER + "/Output_Images",

    // Tên các layer trong PSD (PHẢI khớp chính xác với file PSD của bạn)
    layerNameText:   "layer_name",
    layerCodeText:   "layer_code",
    layerAvatarSO:   "layer_avatar",

    // Chất lượng JPG: 12 = cao nhất
    jpgQuality: 12,

    // Tiền tố tên file: Anh_Chuc_Mung_<Ten>.jpg
    outputPrefix: "Anh_Chuc_Mung_"
};

// ============================================================================
// CÁC HÀM TIỆN ÍCH
// ============================================================================
function trim(s) {
    if (s === null || s === undefined) return "";
    return String(s).replace(/^\s+|\s+$/g, "");
}

function indexOfArr(arr, value) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] === value) return i;
    }
    return -1;
}

function sanitizeFileName(s) {
    return trim(s).replace(/[\\\/:\*\?"<>\|]/g, "_");
}

// ============================================================================
// ĐỌC FILE CSV (UTF-8)
// ============================================================================
function parseCSVLine(line) {
    var result = [];
    var current = "";
    var inQuotes = false;

    for (var i = 0; i < line.length; i++) {
        var ch = line.charAt(i);
        if (ch === '"') {
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

        // Bỏ ký tự BOM nếu có
        if (firstLine && line.length > 0 && line.charCodeAt(0) === 0xFEFF) {
            line = line.substring(1);
        }
        firstLine = false;

        if (trim(line).length === 0) continue;
        rows.push(parseCSVLine(line));
    }

    csvFile.close();
    return rows;
}

// ============================================================================
// THAO TÁC LAYER
// ============================================================================
function findLayerByName(parent, layerName) {
    for (var i = 0; i < parent.layers.length; i++) {
        var layer = parent.layers[i];
        if (layer.name === layerName) return layer;
        if (layer.typename === "LayerSet") {
            var found = findLayerByName(layer, layerName);
            if (found) return found;
        }
    }
    return null;
}

function updateTextLayer(doc, layerName, newText) {
    var layer = findLayerByName(doc, layerName);
    if (!layer) {
        throw new Error("Không tìm thấy layer text: '" + layerName + "'");
    }
    if (layer.kind !== LayerKind.TEXT) {
        throw new Error("Layer '" + layerName + "' không phải Text Layer");
    }
    layer.textItem.contents = newText;
}

function replaceSmartObjectContents(doc, layerName, imagePath) {
    var layer = findLayerByName(doc, layerName);
    if (!layer) {
        throw new Error("Không tìm thấy Smart Object: '" + layerName + "'");
    }

    // Nếu đường dẫn ảnh là tương đối (vd: "images/avatar1.jpg"), 
    // tự ghép với thư mục script
    var imgFile;
    if (imagePath.charAt(0) === '/' || imagePath.charAt(1) === ':' || imagePath.charAt(0) === '\\') {
        // Đường dẫn tuyệt đối
        imgFile = new File(imagePath);
    } else {
        // Đường dẫn tương đối -> ghép với thư mục script
        imgFile = new File(SCRIPT_FOLDER + "/" + imagePath);
    }

    if (!imgFile.exists) {
        throw new Error("Không tìm thấy ảnh: " + imgFile.fsName);
    }

    doc.activeLayer = layer;

    var idReplace = stringIDToTypeID("placedLayerReplaceContents");
    var desc = new ActionDescriptor();
    desc.putPath(charIDToTypeID("null"), imgFile);
    desc.putInteger(charIDToTypeID("PgNm"), 1);
    executeAction(idReplace, desc, DialogModes.NO);
}

// ============================================================================
// XUẤT JPG
// ============================================================================
function exportAsJPG(doc, outputFolder, fileName, quality) {
    var outFile = new File(outputFolder.fsName + "/" + fileName);

    var jpgOptions = new JPEGSaveOptions();
    jpgOptions.quality = quality;
    jpgOptions.embedColorProfile = true;
    jpgOptions.formatOptions = FormatOptions.STANDARDBASELINE;
    jpgOptions.matte = MatteType.NONE;

    // asCopy=true => xuất bản copy, KHÔNG đụng tới template gốc
    doc.saveAs(outFile, jpgOptions, true, Extension.LOWERCASE);
}

// ============================================================================
// MAIN
// ============================================================================
function main() {
    var templateFile = new File(CONFIG.templatePath);
    var csvFile      = new File(CONFIG.csvPath);
    var outputFolder = new Folder(CONFIG.outputDir);

    // --- Kiểm tra file template ---
    if (!templateFile.exists) {
        alert("KHÔNG TÌM THẤY FILE template.psd\n\n" +
              "Hãy đặt file template.psd vào cùng thư mục với script:\n" +
              SCRIPT_FOLDER.fsName);
        return;
    }

    // --- Kiểm tra file CSV ---
    if (!csvFile.exists) {
        alert("KHÔNG TÌM THẤY FILE data.csv\n\n" +
              "Hãy đặt file data.csv vào cùng thư mục với script:\n" +
              SCRIPT_FOLDER.fsName);
        return;
    }

    // --- Tự tạo thư mục output ---
    if (!outputFolder.exists) {
        outputFolder.create();
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
        alert("File CSV phải có ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu!");
        return;
    }

    // --- Lấy chỉ số các cột ---
    var header = rows[0];
    var idxName = indexOfArr(header, "Ten_Khach_Hang");
    var idxCode = indexOfArr(header, "Ma_Giam_Gia");
    var idxImg  = indexOfArr(header, "Duong_Dan_Anh");

    if (idxName < 0 || idxCode < 0 || idxImg < 0) {
        alert("File CSV thiếu cột!\n\nPhải có đủ 3 cột:\n" +
              "  - Ten_Khach_Hang\n" +
              "  - Ma_Giam_Gia\n" +
              "  - Duong_Dan_Anh");
        return;
    }

    var prevDialogMode = app.displayDialogs;
    app.displayDialogs = DialogModes.NO;

    var totalRows  = rows.length - 1;
    var successCnt = 0;
    var errorList  = [];

    // --- Vòng lặp xử lý ---
    for (var r = 1; r < rows.length; r++) {
        var row = rows[r];
        if (row.length <= Math.max(idxName, idxCode, idxImg)) {
            errorList.push("Dòng " + (r + 1) + ": thiếu cột.");
            continue;
        }

        var tenKH    = row[idxName];
        var maGG     = row[idxCode];
        var duongDan = row[idxImg];

        var doc = null;
        try {
            doc = app.open(templateFile);
            updateTextLayer(doc, CONFIG.layerNameText, tenKH);
            updateTextLayer(doc, CONFIG.layerCodeText, maGG);
            replaceSmartObjectContents(doc, CONFIG.layerAvatarSO, duongDan);

            var fileName = CONFIG.outputPrefix + sanitizeFileName(tenKH) + ".jpg";
            exportAsJPG(doc, outputFolder, fileName, CONFIG.jpgQuality);
            successCnt++;
        } catch (err) {
            errorList.push("Dòng " + (r + 1) + " (" + tenKH + "): " + err.message);
        } finally {
            // Đóng KHÔNG lưu => template gốc giữ nguyên
            if (doc) {
                try { doc.close(SaveOptions.DONOTSAVECHANGES); } catch (e2) {}
            }
        }
    }

    app.displayDialogs = prevDialogMode;

    // --- Báo cáo kết quả ---
    var summary = "HOÀN TẤT!\n\n" +
        "Tổng số dòng:  " + totalRows + "\n" +
        "Thành công:    " + successCnt + "\n" +
        "Lỗi:           " + errorList.length + "\n\n" +
        "Ảnh xuất ra ở: " + outputFolder.fsName;

    if (errorList.length > 0) {
        summary += "\n\nChi tiết lỗi:\n" + errorList.join("\n");
    }
    alert(summary);
}

// ============================================================================
// CHẠY
// ============================================================================
try {
    main();
} catch (fatalErr) {
    alert("Lỗi nghiêm trọng: " + fatalErr.message);
}
