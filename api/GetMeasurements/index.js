const fetch = require("node-fetch");

module.exports = async function (context, req) {
  try {
    const token = process.env.AQICN_API_KEY;
    if (!token) {
      context.res = { status: 500, body: { error: "Missing AQICN_API_KEY" } };
      return;
    }

    const lat = req.query.lat || 21.0152;
    const lon = req.query.lon || 105.7999;

    const url = `https://api.waqi.info/feed/geo:${lat};${lon}/?token=${token}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`AQICN HTTP ${res.status}`);
    }
    const data = await res.json();

    if (data.status !== "ok") {
      throw new Error(JSON.stringify(data));
    }

    const iaqi = data.data.iaqi || {};

    const measurements = Object.keys(iaqi).map(key => ({
      parameter: key,
      value: iaqi[key].v
    }));

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        message: "Measurements fetched 🚀",
        location: {
          lat,
          lon,
          city: data.data.city?.name
        },
        measurementsCount: measurements.length,
        measurements
      }
    };
  } catch (err) {
    context.log("Measurements error:", err);
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
