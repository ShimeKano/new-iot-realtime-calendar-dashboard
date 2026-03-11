/**
 * storage.js – Azure Blob Storage data-lake abstraction
 *
 * Layout (ADLS Gen2-compatible hierarchical namespace):
 *   <container>/aqi-history/year=YYYY/month=MM/day=DD/hour=HH/<timestamp>_<rand>.json
 *
 * Required env vars:
 *   AZURE_STORAGE_CONNECTION_STRING  – connection string for the storage account
 *   AZURE_STORAGE_CONTAINER_NAME     – blob container name (default: "aqi-datalake")
 *   AQI_DATA_ROOT_PATH               – root prefix inside container (default: "aqi-history")
 */

const { BlobServiceClient } = require("@azure/storage-blob");

const CONTAINER = process.env.AZURE_STORAGE_CONTAINER_NAME || "aqi-datalake";
const ROOT = process.env.AQI_DATA_ROOT_PATH || "aqi-history";

/**
 * Build the data-lake partition prefix for a given ISO timestamp.
 * e.g. "aqi-history/year=2026/month=03/day=11/hour=10"
 */
function partitionPrefix(isoTimestamp) {
  const d = new Date(isoTimestamp);
  const year  = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day   = String(d.getUTCDate()).padStart(2, "0");
  const hour  = String(d.getUTCHours()).padStart(2, "0");
  return `${ROOT}/year=${year}/month=${month}/day=${day}/hour=${hour}`;
}

/**
 * Build the day-level prefix for reading all records of a day.
 * e.g. "aqi-history/year=2026/month=03/day=11"
 */
function dayPrefix(dateStr) {
  // dateStr: YYYY-MM-DD
  const [year, month, day] = dateStr.split("-");
  return `${ROOT}/year=${year}/month=${month}/day=${day}`;
}

/**
 * Generate a unique blob name for a record.
 * e.g. "aqi-history/year=2026/month=03/day=11/hour=10/2026-03-11T10-05-00Z_a3f7.json"
 */
function blobName(isoTimestamp) {
  const prefix = partitionPrefix(isoTimestamp);
  // replace colons so the name is filesystem-friendly
  const ts = isoTimestamp.replace(/:/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${ts}_${rand}.json`;
}

/**
 * Return a BlobServiceClient using the connection string.
 * Throws if the env var is missing.
 */
function getClient() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!conn) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is not set");
  }
  return BlobServiceClient.fromConnectionString(conn);
}

/**
 * Append-write a single AQI record as a JSON blob.
 * Creates the container if it does not exist (idempotent).
 *
 * @param {object} record – normalised AQI record
 */
async function writeRecord(record) {
  const client      = getClient();
  const container   = client.getContainerClient(CONTAINER);
  await container.createIfNotExists({ access: "private" });

  const name        = blobName(record.timeISO || new Date().toISOString());
  const blockBlob   = container.getBlockBlobClient(name);
  const content     = JSON.stringify(record);

  await blockBlob.upload(content, Buffer.byteLength(content), {
    blobHTTPHeaders: { blobContentType: "application/json" }
  });

  return name;
}

/**
 * Read all AQI records for a given date (YYYY-MM-DD).
 * Lists every blob whose path starts with the day prefix and
 * downloads + parses each JSON file.
 *
 * Returns an array of records sorted ascending by timeISO.
 *
 * @param {string} dateStr – "YYYY-MM-DD"
 * @returns {Promise<object[]>}
 */
async function readDay(dateStr) {
  const client    = getClient();
  const container = client.getContainerClient(CONTAINER);

  const prefix  = dayPrefix(dateStr) + "/";
  const records = [];

  for await (const item of container.listBlobsFlat({ prefix })) {
    try {
      const blockBlob = container.getBlockBlobClient(item.name);
      const download  = await blockBlob.download(0);
      const chunks    = [];
      for await (const chunk of download.readableStreamBody) {
        chunks.push(chunk);
      }
      const text   = Buffer.concat(chunks).toString("utf-8");
      const parsed = JSON.parse(text);
      records.push(parsed);
    } catch (_err) {
      // skip corrupt blobs – log only
    }
  }

  records.sort((a, b) => {
    const ta = a.timeISO || "";
    const tb = b.timeISO || "";
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });

  return records;
}

module.exports = { writeRecord, readDay };
