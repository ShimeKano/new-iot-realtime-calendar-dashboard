# Dataset Description (v2 – Azure Data Lake)

## 1. Dataset Name
**AQICN – World Air Quality Index**

---

## 2. Dataset Type
- Public Open Dataset
- IoT Environmental / Time-series Data
- Real-time API with historical records

---

## 3. Data Provider & Source
- Provider: **AQICN**
- Official Website: https://aqicn.org
- API Documentation: https://aqicn.org/json-api/doc/
- License: Free for non-commercial use (API token required)

---

## 4. Data Description
Collected fields per record:

| Field | Description |
|---|---|
| `aqi` | Air Quality Index |
| `dominentpol` | Dominant pollutant |
| `pm25` | PM2.5 particulate matter |
| `temp` | Temperature (°C) |
| `humidity` | Relative humidity (%) |
| `pressure` | Atmospheric pressure (hPa) |
| `dew` | Dew point (°C) |
| `wind` | Wind speed |
| `windgust` | Wind gust speed |
| `timeISO` | ISO 8601 timestamp |
| `timeUnix` | Unix epoch timestamp |
| `timezone` | Local timezone offset |

---

## 5. Storage Architecture (v2)

Records are stored in **Azure Blob Storage** using a Hive-style partitioned
path layout compatible with **Azure Data Lake Storage Gen2 (ADLS Gen2)**:

```
aqi-datalake/
  aqi-history/
    year=YYYY/
      month=MM/
        day=DD/
          hour=HH/
            <ISO-timestamp>_<rand>.json
```

Each record is an individual JSON file with a unique name, ensuring:
- **Append-only**: old records are never overwritten or deleted
- **Partition pruning**: queries can target a specific day efficiently
- **ADLS Gen2 compatible**: works with Azure Synapse, Databricks, Spark

---

## 6. Data Access
- **Write**: `api/GetRealtimeData` → calls AQICN API → writes one JSON blob per record
- **Read**: `api/GetHistory?date=YYYY-MM-DD` → lists all blobs under the day partition → returns sorted array

---

## 7. Big Data Characteristics
- Continuous data collection every 5 minutes (≈ 288 records/day)
- Partitioned storage enables efficient range queries
- Can be connected to Azure Synapse Analytics or Apache Spark for large-scale analysis
- Scalable to multiple locations and sensors

---

## 8. Data Schema

```json
{
  "aqi": 42,
  "dominentpol": "pm25",
  "pm25": 15.2,
  "temp": 28.4,
  "humidity": 72,
  "pressure": 1010,
  "dew": 22.1,
  "wind": 2.3,
  "windgust": null,
  "timeISO": "2026-03-11T10:05:00+07:00",
  "timeUnix": 1741669500,
  "timezone": "+07:00",
  "lat": "21.0152",
  "lon": "105.7999"
}
```
