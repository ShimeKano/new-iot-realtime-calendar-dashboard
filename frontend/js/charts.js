const btnFetch   = document.getElementById("btnFetch");
const statusEl   = document.getElementById("status");
const aqiEl      = document.getElementById("aqiValue");
const locationEl = document.getElementById("location");

/* ===== AQI LINE CHART ===== */
const aqiCtx = document.getElementById("aqiChart").getContext("2d");

const aqiChart = new Chart(aqiCtx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "AQI",
      data: [],
      borderColor: "red",
      tension: 0.3
    }]
  },
  options: {
    responsive: true,
    scales: { y: { beginAtZero: true } }
  }
});

/* ===== PARAM BAR CHART ===== */
const paramCtx = document.getElementById("paramChart").getContext("2d");

const paramChart = new Chart(paramCtx, {
  type: "bar",
  data: {
    labels: [],
    datasets: [{
      label: "Giá trị",
      data: [],
      backgroundColor: "#2c7be5"
    }]
  },
  options: { responsive: true }
});

/* ===== UPDATE FUNCTIONS ===== */

function updateAQIChart(aqi) {
  const timeLabel = new Date().toLocaleTimeString();
  aqiChart.data.labels.push(timeLabel);
  aqiChart.data.datasets[0].data.push(aqi);
  if (aqiChart.data.labels.length > 20) {
    aqiChart.data.labels.shift();
    aqiChart.data.datasets[0].data.shift();
  }
  aqiChart.update();
}

function updateParamChart(measurements) {
  paramChart.data.labels = measurements.map(m => m.parameter);
  paramChart.data.datasets[0].data = measurements.map(m => m.value);
  paramChart.update();
}

/* ===== BUTTON EVENT ===== */

btnFetch.addEventListener("click", async () => {
  try {
    statusEl.textContent = "⏳ Đang lấy dữ liệu...";
    const realtime    = await fetchRealtime();
    const measurements = await fetchMeasurements();

    aqiEl.textContent      = realtime.aqi;
    locationEl.textContent = measurements.location.city || "Hà Nội";

    updateAQIChart(realtime.aqi);
    updateParamChart(measurements.measurements);

    statusEl.textContent = "✅ Cập nhật thành công";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "❌ Lỗi lấy dữ liệu";
  }
});
