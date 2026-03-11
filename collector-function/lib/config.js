/**
 * config.js – centralised environment variable reader for the collector.
 *
 * All required / optional settings come from environment variables so the
 * same code runs locally (via local.settings.json) and on Azure (via
 * Application Settings of the Function App).
 */

"use strict";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, defaultValue) {
  return process.env[name] || defaultValue;
}

module.exports = {
  /** AQICN API token – https://aqicn.org/data-platform/token/ */
  aqicnApiKey: () => required("AQICN_API_KEY"),

  /** Latitude of the monitoring location (e.g. "21.0152" for Hanoi) */
  lat: () => required("COLLECTOR_LAT"),

  /** Longitude of the monitoring location (e.g. "105.7999" for Hanoi) */
  lon: () => required("COLLECTOR_LON"),

  /** Azure Storage connection string */
  storageConnectionString: () => required("AZURE_STORAGE_CONNECTION_STRING"),

  /** Blob container name (default: "aqi-datalake") */
  containerName: () => optional("AZURE_STORAGE_CONTAINER_NAME", "aqi-datalake"),

  /** Root path prefix inside the container (default: "aqi-history") */
  dataRootPath: () => optional("AQI_DATA_ROOT_PATH", "aqi-history"),
};
