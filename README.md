# 📊 AQI Big Data – Azure Data Lake Dashboard (v2)

## 🧠 Tên đề tài

**Xây dựng hệ thống giám sát và phân tích chất lượng không khí theo thời gian thực
sử dụng Big Data, Cloud Computing và Azure Data Lake Storage Gen2**

> *Real-time Air Quality Monitoring with Azure Data Lake Storage Gen2 (ADLS Gen2) and Big-Data partitioned layout*

---

> ℹ️ **Backup**: Kho lưu trữ gốc (Azure Table Storage) được giữ nguyên tại
> [`ShimeKano/iot-realtime-calendar-dashboard`](https://github.com/ShimeKano/iot-realtime-calendar-dashboard).
> Repo này (`new-iot-realtime-calendar-dashboard`) là phiên bản nâng cấp.

---

## 📌 Giới thiệu

Hệ thống thu thập dữ liệu AQI (Air Quality Index) từ API AQICN, lưu trữ theo dạng
**Big Data – Data Lake** trên **Azure Blob Storage** (tương thích ADLS Gen2) và
hiển thị biểu đồ lịch sử trên giao diện web.

---

## 🏗️ Kiến trúc hệ thống (v2 – Data Lake)

```
[AQICN API]
      ↓
[GitHub Actions Collector – mỗi 5 phút]
      ↓
[Azure Function – GetRealtimeData]
      ↓
[Azure Blob Storage / ADLS Gen2]
   aqi-datalake/
     aqi-history/
       year=YYYY/
         month=MM/
           day=DD/
             hour=HH/
               <timestamp>_<rand>.json   ← append-only, không bao giờ ghi đè
      ↓
[Azure Function – GetHistory]
      ↓
[Azure Static Web App – Frontend]
      ↓
[Chart.js Dashboard – tự refresh 5 phút]
```

---

## 🧩 Công nghệ sử dụng

### ☁️ Cloud & Backend

| Thành phần | Mô tả |
|---|---|
| **Azure Static Web Apps** | Hosting frontend + API proxy |
| **Azure Functions (Node.js)** | Backend serverless |
| **Azure Blob Storage / ADLS Gen2** | Lưu trữ Big Data phân tán |
| **GitHub Actions** | Collector tự động mỗi 5 phút |

### 🌐 Frontend

* HTML / CSS / JavaScript
* **Chart.js** – vẽ biểu đồ time-series

### 🌍 Nguồn dữ liệu

* **AQICN – World Air Quality Index Project** ([https://aqicn.org](https://aqicn.org))

---

## 📂 Cấu trúc dữ liệu Data Lake

Mỗi bản ghi AQI được lưu thành **1 file JSON riêng biệt**, tổ chức theo phân vùng
Hive-style (tương thích với Apache Spark / Azure Synapse Analytics):

```
aqi-datalake/
  aqi-history/
    year=2026/
      month=03/
        day=11/
          hour=10/
            2026-03-11T10-00-00.000Z_a3f7.json
            2026-03-11T10-05-00.000Z_b9c2.json
```

**Tính năng bảo toàn dữ liệu:**
- Mỗi file có tên duy nhất → **không bao giờ ghi đè dữ liệu cũ**
- Dữ liệu cũ luôn được giữ nguyên (append-only)
- Có thể đọc lại bất kỳ ngày nào trong lịch sử

---

## ⚙️ Biến môi trường

Cài đặt trong **Azure Static Web Apps → Configuration → Application settings**:

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | ✅ | Connection string của Azure Storage account |
| `AZURE_STORAGE_CONTAINER_NAME` | ❌ | Tên container (mặc định: `aqi-datalake`) |
| `AQI_DATA_ROOT_PATH` | ❌ | Root prefix trong container (mặc định: `aqi-history`) |
| `AQICN_API_KEY` | ✅ | API key từ [https://aqicn.org/data-platform/token/](https://aqicn.org/data-platform/token/) |

Cài đặt trong **GitHub Actions Secrets**:

| Secret | Mô tả |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deploy token của Static Web App |
| `COLLECTOR_API_URL` | URL của Static Web App (dùng cho collector) |

Xem file `.env.example` để biết cú pháp chi tiết.

---

## 🚀 Hướng dẫn cài đặt

### 1. Tạo Azure Storage Account

```bash
# Bật hierarchical namespace để dùng ADLS Gen2 đầy đủ (tuỳ chọn)
az storage account create \
  --name <your-storage-account> \
  --resource-group <your-rg> \
  --sku Standard_LRS \
  --kind StorageV2 \
  --enable-hierarchical-namespace true
```

### 2. Lấy Connection String

```bash
az storage account show-connection-string \
  --name <your-storage-account> \
  --resource-group <your-rg>
```

### 3. Cài đặt biến môi trường trên Azure Static Web Apps

Vào **Azure Portal → Static Web App → Configuration → Application settings**
và thêm các biến ở bảng trên.

### 4. Deploy

Push lên nhánh `main` – GitHub Actions sẽ tự động build và deploy.

---

## 🔄 Migration từ v1 (Azure Table Storage)

Dữ liệu cũ trong Azure Table Storage **không bị xoá** – repo gốc
([`ShimeKano/iot-realtime-calendar-dashboard`](https://github.com/ShimeKano/iot-realtime-calendar-dashboard))
vẫn hoạt động độc lập.

Từ v2 trở đi:
- Dữ liệu mới được ghi vào Azure Blob Storage / ADLS Gen2
- Không cần migrate dữ liệu cũ nếu không cần truy vấn lịch sử cũ từ v2

---

## 🛡️ Cải tiến độ tin cậy (v2)

| Vấn đề cũ | Giải pháp v2 |
|---|---|
| Polling chồng chéo | Flag `isLoading` ngăn request mới khi đang tải |
| API lỗi làm crash biểu đồ | Check `res.ok` trước khi parse JSON |
| JSON không hợp lệ làm crash | Try/catch riêng cho `res.json()` |
| Biểu đồ mất khi lỗi | Giữ nguyên chart cũ, chỉ cập nhật notice |
| Timeout không kiểm soát | `AbortController` với timeout 20 giây |

---

## 📊 Các loại dữ liệu thu thập

* AQI, PM2.5, Nhiệt độ, Độ ẩm, Áp suất, Gió, Timestamp

---

## 👨‍🎓 Thông tin sinh viên

* **Họ tên:** Nguyễn Quốc Tuấn (ShimeKano)
* **MSSV:** 22004249
* **Môn học:** Phân Tích Dữ liệu lớn trong IoT

---

> *"From real-time data to Big Data insights – now on Azure Data Lake"* 🌍📊
