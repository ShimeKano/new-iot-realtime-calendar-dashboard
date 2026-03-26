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

Repo này chứa **hai dự án Azure riêng biệt**:

| Thư mục | Loại | Mô tả |
|---|---|---|
| `frontend/` + `api/` | **Azure Static Web App** | Frontend dashboard + HTTP API (GetHistory, GetMeasurements, GetRealtimeData) |
| `collector-function/` | **Azure Function App** | Timer Trigger collector – thu thập AQI mỗi 5 phút, triển khai độc lập |

```
[AQICN API]
      ↓
[Azure Function App – AQITimerCollector]   ← collector-function/ (triển khai riêng)
      │  Timer Trigger: mỗi 5 phút
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
[Azure Static Web App – api/ + frontend/]  ← triển khai qua GitHub Actions
      ↓
[Chart.js Dashboard – tự refresh 5 phút]
```

> **Lưu ý:** Sau khi xác nhận Azure Timer Trigger collector đang hoạt động ổn định,
> bạn nên tắt hoặc xoá `.github/workflows/collector.yml` để tránh ghi trùng dữ liệu.

---

## 🧩 Công nghệ sử dụng

### ☁️ Cloud & Backend

| Thành phần | Mô tả |
|---|---|
| **Azure Static Web Apps** | Hosting frontend + API proxy |
| **Azure Functions (Node.js)** | Backend serverless (API + Timer Trigger collector) |
| **Azure Blob Storage / ADLS Gen2** | Lưu trữ Big Data phân tán |
| **GitHub Actions** | CI/CD deploy (collector có thể chuyển sang Azure Timer) |

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

### Static Web App (`api/`)

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
| `COLLECTOR_API_URL` | URL của Static Web App (dùng cho GitHub Actions collector – không cần nếu đã dùng Azure Timer) |

### collector-function (`collector-function/`)

Cài đặt trong **Azure Function App → Configuration → Application settings**:

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `AQICN_API_KEY` | ✅ | API key từ [https://aqicn.org/data-platform/token/](https://aqicn.org/data-platform/token/) |
| `COLLECTOR_LAT` | ✅ | Vĩ độ trạm quan trắc (ví dụ: `21.0152` cho Hà Nội) |
| `COLLECTOR_LON` | ✅ | Kinh độ trạm quan trắc (ví dụ: `105.7999` cho Hà Nội) |
| `AZURE_STORAGE_CONNECTION_STRING` | ✅ | Connection string của Azure Storage account |
| `AZURE_STORAGE_CONTAINER_NAME` | ❌ | Tên container (mặc định: `aqi-datalake`) |
| `AQI_DATA_ROOT_PATH` | ❌ | Root prefix trong container (mặc định: `aqi-history`) |

Dùng chung cùng Storage account với Static Web App để dữ liệu được đọc bởi cả hai.
Xem `collector-function/local.settings.json.example` và `.env.example` để biết cú pháp chi tiết.

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

### 4. Deploy Static Web App

Push lên nhánh `main` – GitHub Actions sẽ tự động build và deploy.

---

## 🕐 Triển khai Azure Timer Trigger Collector (`collector-function/`)

Collector chạy mỗi 5 phút trên **Azure Functions** (độc lập với Static Web App).
Đây là cách đáng tin cậy hơn GitHub Actions `schedule` vì Azure Functions đảm bảo
thực thi đúng giờ mà không bị ảnh hưởng bởi tải của GitHub.

### 1. Cài đặt Azure Functions Core Tools (dev local)

```bash
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### 2. Cài đặt dependencies

```bash
cd collector-function
npm install
```

### 3. Cấu hình local

```bash
cp local.settings.json.example local.settings.json
# Chỉnh sửa local.settings.json với các giá trị thực
```

### 4. Chạy local

```bash
cd collector-function
func start
```

Timer sẽ tự động chạy theo lịch. Bạn cũng có thể trigger thủ công:

```bash
curl -X POST http://localhost:7071/admin/functions/AQITimerCollector \
  -H "Content-Type: application/json" -d "{}"
```

### 5. Tạo Azure Function App và deploy

```bash
# Tạo Function App trên Azure
az functionapp create \
  --name <your-function-app-name> \
  --resource-group <your-rg> \
  --storage-account <your-storage-account> \
  --consumption-plan-location <your-region> \
  --runtime node \
  --runtime-version 18 \
  --functions-version 4

# Deploy
cd collector-function
func azure functionapp publish <your-function-app-name>
```

### 6. Cấu hình Application Settings trên Azure

Vào **Azure Portal → Function App → Configuration → Application settings** và thêm:

- `AQICN_API_KEY`
- `COLLECTOR_LAT`
- `COLLECTOR_LON`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER_NAME` (tuỳ chọn)
- `AQI_DATA_ROOT_PATH` (tuỳ chọn)

### 7. Vô hiệu hoá GitHub Actions collector

Sau khi xác nhận Azure Timer Trigger đang hoạt động ổn định (kiểm tra logs trong
**Azure Portal → Function App → Functions → AQITimerCollector → Monitor**),
hãy tắt `.github/workflows/collector.yml` để tránh ghi trùng dữ liệu:

```bash
# Đổi tên file để tắt workflow
mv .github/workflows/collector.yml .github/workflows/collector.yml.disabled
```

hoặc xoá trigger `schedule` trong file đó và chỉ giữ `workflow_dispatch`.

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
