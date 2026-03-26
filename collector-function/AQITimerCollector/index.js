/**
 * AQITimerCollector/index.js
 *
 * Azure Functions Timer Trigger that runs every 5 minutes.
 * It fetches the latest AQI reading from AQICN, normalises the record,
 * and appends it to Azure Blob Storage using a data-lake-style path.
 *
 * Schedule: "0 */5 * * * *"  (every 5 minutes, on the 0-second mark)
 * See function.json for the binding declaration.
 *
 * Environment variables (set in Azure Function App → Configuration):
 *   AQICN_API_KEY                   – your AQICN token
 *   COLLECTOR_LAT                   – latitude of the monitoring location
 *   COLLECTOR_LON                   – longitude of the monitoring location
 *   AZURE_STORAGE_CONNECTION_STRING – storage account connection string
 *   AZURE_STORAGE_CONTAINER_NAME    – blob container (default: aqi-datalake)
 *   AQI_DATA_ROOT_PATH              – path prefix (default: aqi-history)
 */

"use strict";

const config      = require("../lib/config");
const { fetchAQI }   = require("../lib/aqi-fetcher");
const { mapRecord }  = require("../lib/record-mapper");
const { writeRecord } = require("../lib/storage");

module.exports = async function (context, myTimer) {
  if (myTimer.isPastDue) {
    context.log.warn("AQITimerCollector: timer is past due – running now anyway");
  }

  try {
    const lat   = config.lat();
    const lon   = config.lon();
    const token = config.aqicnApiKey();

    context.log(`AQITimerCollector: fetching AQI for lat=${lat} lon=${lon}`);

    const rawData = await fetchAQI(lat, lon, token);
    const record  = mapRecord(rawData, lat, lon);

    const blobPath = await writeRecord(record);

    context.log(`AQITimerCollector: stored record → ${blobPath}`);
    context.log(`AQITimerCollector: AQI=${record.aqi} PM2.5=${record.pm25} at ${record.timeISO}`);
  } catch (err) {
    // Log and rethrow so Azure Functions marks the invocation as failed,
    // enabling retry policies and alerting if configured.
    context.log.error(`AQITimerCollector: error – ${err.message}`);
    throw err;
  }
};
