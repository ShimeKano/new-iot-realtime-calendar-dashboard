/**
 * record-mapper.js – normalise a raw AQICN data object into a flat
 * storage record that aligns with the existing API data model used by
 * GetHistory / GetMeasurements / GetRealtimeData.
 */

"use strict";

/**
 * Map a raw AQICN `data` payload to a normalised storage record.
 *
 * @param {object} data  – raw `json.data` from the AQICN API
 * @param {string} lat   – latitude of the monitoring location
 * @param {string} lon   – longitude of the monitoring location
 * @returns {object} normalised record ready for storage
 */
function mapRecord(data, lat, lon) {
  const iaqi = data.iaqi || {};
  const time = data.time || {};

  return {
    aqi:         data.aqi         ?? null,
    dominentpol: data.dominentpol ?? null,

    pm25:        iaqi.pm25?.v     ?? null,
    temp:        iaqi.t?.v        ?? null,
    humidity:    iaqi.h?.v        ?? null,
    pressure:    iaqi.p?.v        ?? null,
    dew:         iaqi.dew?.v      ?? null,
    wind:        iaqi.w?.v        ?? null,
    windgust:    iaqi.wg?.v       ?? null,

    timeISO:     time.iso         ?? new Date().toISOString(),
    timeUnix:    time.v           ?? Math.floor(Date.now() / 1000),
    timezone:    time.tz          ?? "+07:00",

    lat,
    lon,
  };
}

module.exports = { mapRecord };
