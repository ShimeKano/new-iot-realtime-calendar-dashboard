/**
 * storage.js – Azure Blob Storage data-lake abstraction for the collector.
 *
 * Layout (ADLS Gen2-compatible hierarchical path):
 *   <container>/<root>/year=YYYY/month=MM/day=DD/hour=HH/<timestamp>_<rand>.json
 *
 * Every write produces a unique blob name → records are fully append-only
 * and no existing data is ever overwritten.
 *
 * Required env vars (read via config.js):
 *   AZURE_STORAGE_CONNECTION_STRING
 *   AZURE_STORAGE_CONTAINER_NAME  (optional, default: "aqi-datalake")
 *   AQI_DATA_ROOT_PATH            (optional, default: "aqi-history")
 */

"use strict";

const { BlobServiceClient } = require("@azure/storage-blob");
const config = require("./config");

/**
 * Build the data-lake partition path for a given ISO timestamp.
 * e.g. "aqi-history/year=2026/month=03/day=11/hour=10"
 *
 * @param {string} isoTimestamp
 * @param {string} root – AQI_DATA_ROOT_PATH value
 * @returns {string}
 */
function partitionPrefix(isoTimestamp, root) {
  const d     = new Date(isoTimestamp);
  const year  = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day   = String(d.getUTCDate()).padStart(2, "0");
  const hour  = String(d.getUTCHours()).padStart(2, "0");
  return `${root}/year=${year}/month=${month}/day=${day}/hour=${hour}`;
}

/**
 * Generate a unique blob name for a record.
 * e.g. "aqi-history/year=2026/month=03/day=11/hour=10/2026-03-11T10-05-00.000Z_a3f7.json"
 *
 * @param {string} isoTimestamp
 * @param {string} root
 * @returns {string}
 */
function blobName(isoTimestamp, root) {
  const prefix = partitionPrefix(isoTimestamp, root);
  const ts     = isoTimestamp.replace(/:/g, "-");
  const rand   = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${ts}_${rand}.json`;
}

/**
 * Append-write a single AQI record as a JSON blob.
 * Creates the container if it does not exist (idempotent).
 *
 * @param {object} record – normalised AQI record (must contain `timeISO`)
 * @returns {Promise<string>} the blob path that was written
 */
async function writeRecord(record) {
  const connectionString = config.storageConnectionString();
  const containerName    = config.containerName();
  const root             = config.dataRootPath();

  const serviceClient  = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = serviceClient.getContainerClient(containerName);
  await containerClient.createIfNotExists({ access: "private" });

  const name        = blobName(record.timeISO || new Date().toISOString(), root);
  const blockBlob   = containerClient.getBlockBlobClient(name);
  const content     = JSON.stringify(record);

  await blockBlob.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: "application/json" },
  });

  return name;
}

module.exports = { writeRecord };
