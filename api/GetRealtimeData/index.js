const fetch = require("node-fetch");
const { writeRecord } = require("../lib/storage");

module.exports = async function (context, req) {
  try {
    // ===== 1️⃣ ENV =====
    const AQICN_KEY    = process.env.AQICN_API_KEY;
    const STORAGE_CONN = process.env.AZURE_STORAGE_CONNECTION_STRING;

    const lat = req.query.lat;
    const lon = req.query.lon;

    if (!AQICN_KEY || !lat || !lon) {
      context.res = {
        status: 400,
        body: { error: "Missing AQICN_API_KEY or lat/lon" }
      };
      return;
    }

    // ===== 2️⃣ FETCH AQICN REALTIME =====
    const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${AQICN_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`AQICN HTTP ${res.status}`);
    }
    const json = await res.json();

    if (json.status !== "ok") {
      throw new Error("AQICN API returned non-ok status");
    }

    const d    = json.data;
    const iaqi = d.iaqi || {};
    const time = d.time || {};

    // ===== 3️⃣ NORMALISE DATA =====
    const record = {
      aqi:         d.aqi          ?? null,
      dominentpol: d.dominentpol  ?? null,

      pm25:        iaqi.pm25?.v   ?? null,
      temp:        iaqi.t?.v      ?? null,
      humidity:    iaqi.h?.v      ?? null,
      pressure:    iaqi.p?.v      ?? null,
      dew:         iaqi.dew?.v    ?? null,
      wind:        iaqi.w?.v      ?? null,
      windgust:    iaqi.wg?.v     ?? null,

      timeISO:     time.iso       ?? new Date().toISOString(),
      timeUnix:    time.v         ?? Math.floor(Date.now() / 1000),
      timezone:    time.tz        ?? "+07:00",

      lat,
      lon
    };

    // ===== 4️⃣ WRITE TO DATA LAKE (APPEND-ONLY) =====
    if (STORAGE_CONN) {
      const blobName = await writeRecord(record);
      context.log(`Stored record at: ${blobName}`);
    } else {
      context.log("AZURE_STORAGE_CONNECTION_STRING not set – skipping storage write");
    }

    // ===== 5️⃣ REALTIME RESPONSE =====
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        message: "Realtime AQI fetched & stored 🚀",
        location: { lat, lon },
        ...record
      }
    };
  } catch (err) {
    context.log("GetRealtimeData error:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        error: "Internal Server Error",
        detail: err.message
      }
    };
  }
};
