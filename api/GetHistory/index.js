const { readDay } = require("../lib/storage");

module.exports = async function (context, req) {
  try {
    const STORAGE_CONN = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (!STORAGE_CONN) {
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: { error: "Missing AZURE_STORAGE_CONNECTION_STRING" }
      };
      return;
    }

    // date param: YYYY-MM-DD  (defaults to today in UTC)
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    /* ===============================
       1️⃣ READ FROM DATA LAKE
       =============================== */
    const records = await readDay(date);

    /* ===============================
       2️⃣ FORMAT FOR FRONTEND
       =============================== */
    const data = records.map(r => ({
      time:     r.timeISO  ?? null,
      aqi:      r.aqi      ?? null,
      pm25:     r.pm25     ?? null,
      temp:     r.temp     ?? null,
      humidity: r.humidity ?? null,
      pressure: r.pressure ?? null,
      wind:     r.wind     ?? null
    }));

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        message: "AQI history fetched 📈",
        date,
        count: data.length,
        data
      }
    };
  } catch (err) {
    context.log("GetHistory error:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        error: "Failed to read history",
        detail: err.message
      }
    };
  }
};
