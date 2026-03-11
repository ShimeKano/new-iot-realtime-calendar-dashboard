const REALTIME_API = "/api/GetRealtimeData";
const MEASURE_API  = "/api/GetMeasurements";

async function fetchRealtime() {
  const res = await fetch(`${REALTIME_API}?lat=21.0152&lon=105.7999`);
  if (!res.ok) throw new Error(`Realtime API lỗi: HTTP ${res.status}`);
  return await res.json();
}

async function fetchMeasurements() {
  const res = await fetch(`${MEASURE_API}?lat=21.0152&lon=105.7999`);
  if (!res.ok) throw new Error(`Measurements API lỗi: HTTP ${res.status}`);
  return await res.json();
}
