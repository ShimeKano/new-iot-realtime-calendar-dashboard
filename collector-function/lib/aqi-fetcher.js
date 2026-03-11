/**
 * aqi-fetcher.js – fetch live AQI data from the AQICN geo-feed API.
 *
 * API reference: https://aqicn.org/json-api/doc/
 */

"use strict";

const fetch = require("node-fetch");

/**
 * Fetch the latest AQI reading for a geographic location.
 *
 * @param {string} lat   – latitude string, e.g. "21.0152"
 * @param {string} lon   – longitude string, e.g. "105.7999"
 * @param {string} token – AQICN API token
 * @returns {Promise<object>} – raw AQICN `data` object
 * @throws {Error} if the HTTP request fails or the API returns a non-ok status
 */
async function fetchAQI(lat, lon, token) {
  const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`;
  const res = await fetch(url, { timeout: 20000 });

  if (!res.ok) {
    throw new Error(`AQICN HTTP error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();

  if (json.status !== "ok") {
    throw new Error(`AQICN API returned status: ${json.status}`);
  }

  return json.data;
}

module.exports = { fetchAQI };
