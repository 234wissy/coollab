// === TIME CONFIG (Client side display only) ===
const CHECKIN_START = 6;
const LATE_TIME = 8;
const CHECKIN_END = 9;

// Generate device ID
const deviceId =
  localStorage.getItem("deviceId") || crypto.randomUUID();
localStorage.setItem("deviceId", deviceId);

navigator.geolocation.getCurrentPosition(
  (position) => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const accuracy = position.coords.accuracy;

    fetch("/api/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: "YOUR_TEACHER_ID",
        latitude,
        longitude,
        accuracy,
        deviceId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        alert(data.message || data.status);
      })
      .catch((err) => console.error(err));
  },
  (error) => {
    alert("Location permission denied");
  }
);