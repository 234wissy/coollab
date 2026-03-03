const express = require("express");
const router = express.Router();

const Teacher = require("../models/Teacher");
const Attendance = require("../models/Attendance");
const adminOnly = require("../middleware/adminOnly");

// ===============================
// CONFIG
// ===============================

// SCHOOL CONFIG
const SCHOOL_LAT = 6.6000;
const SCHOOL_LNG = 3.3500;
const ALLOWED_RADIUS = 150; // meters

// TIME CONFIG (Nigeria - Africa/Lagos)
const EARLY_BEFORE_MIN = 13 * 60; // before 06:00 => early
const LATE_FROM_MIN = 14 * 60;    // 08:00+ => late
const CLOSE_AT_MIN = 15 * 60;     // 09:00+ => closed (no check-in)

// ===============================
// AUTH
// ===============================
function teacherOnly(req, res, next) {
  if (req.session && req.session.teacherId) return next();
  return res.status(401).json({ message: "Unauthorized" });
}

// ===============================
// HELPERS
// ===============================
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Nigeria date key (YYYY-MM-DD) stable on Render
function getTodayKeyLagos() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  const d = parts.find((p) => p.type === "day").value;
  return `${y}-${m}-${d}`;
}

// Current time in Lagos -> total minutes since midnight
function getNowMinutesLagos() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hh = Number(parts.find((p) => p.type === "hour").value);
  const mm = Number(parts.find((p) => p.type === "minute").value);
  return hh * 60 + mm;
}

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    ""
  );
}

// =========================
// TEACHER CHECK-IN (AUTO)
// POST /attendance/check-in
// =========================
router.post("/check-in", teacherOnly, async (req, res) => {
  try {
    const teacherId = req.session.teacherId;
    const { latitude, longitude, accuracy, deviceId } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: "Missing location (latitude/longitude)" });
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: "Invalid latitude/longitude" });
    }

    // Anti-spoof: reject very bad accuracy
    // if (accuracy !== undefined && Number(accuracy) > 100) {
    //   return res.status(403).json({ message: "Location accuracy too low" });
    // }

    const acc = accuracy !== undefined ? Number(accuracy) : null;

    // Block only if it's really poor (common safe range: 150–300m)
    if (acc !== null && acc > 250) {
      return res.status(403).json({ message: `Location accuracy too low (${Math.round(acc)}m). Move outside / turn on GPS.` });
    }

    // Time rules (Lagos)
    const nowMin = getNowMinutesLagos();

    if (nowMin >= CLOSE_AT_MIN) {
      return res.status(403).json({ message: "Check-in closed" });
    }

    // Optional device binding
    if (deviceId) {
      const teacher = await Teacher.findById(teacherId);
      if (!teacher) return res.status(404).json({ message: "Teacher not found" });

      if (teacher.deviceId && teacher.deviceId !== deviceId) {
        return res.status(403).json({ message: "Unrecognized device" });
      }
      if (!teacher.deviceId) {
        teacher.deviceId = deviceId;
        await teacher.save();
      }
    }

    // GPS radius check
    const distance = calculateDistance(SCHOOL_LAT, SCHOOL_LNG, lat, lng);
    if (distance > ALLOWED_RADIUS) {
      return res.status(403).json({ message: "Outside school premises", distance });
    }

    const dateKey = getTodayKeyLagos();

    // ✅ One record per teacher per day (uses dateKey)
    const existing = await Attendance.findOne({ teacherId, dateKey });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: "Already checked in today",
        attendance: existing,
      });
    }

    // Status: early/present/late
    let status = "present";
    if (nowMin < EARLY_BEFORE_MIN) status = "early";
    else if (nowMin >= LATE_FROM_MIN) status = "late";

    const attendance = await Attendance.create({
      teacherId,
      dateKey,
      checkInTime: new Date(),
      latitude: lat,
      longitude: lng,
      distance,
      accuracy: accuracy !== undefined ? Number(accuracy) : null,
      deviceId: deviceId || null,
      ipAddress: getClientIp(req),
      status,
    });

    return res.json({ success: true, message: "Checked in", attendance });
  } catch (err) {
    // Duplicate key (teacherId + dateKey unique index)
    if (err?.code === 11000) {
      const dateKey = getTodayKeyLagos();
      const existing = await Attendance.findOne({ teacherId: req.session.teacherId, dateKey });
      return res.status(200).json({
        success: true,
        message: "Already checked in today",
        attendance: existing,
      });
    }

    return res.status(500).json({ message: err.message });
  }
});

// =========================
// ADMIN: LIST ATTENDANCE
// GET /attendance
// =========================
router.get("/", adminOnly, async (req, res) => {
  const records = await Attendance.find()
    .populate("teacherId")
    .sort({ createdAt: -1 });

  res.render("attendance/index", { records });
});

// =========================
// ADMIN: RECORD DASHBOARD
// GET /attendance/record_dashboard
//ALso mark attendance 
// =========================

router.get("/record_dashboard", adminOnly, async (req, res) => {
  try {
    const { dateKey = "", teacherId = "", markedAbsent } = req.query;

    const query = {};
    if (dateKey) query.dateKey = dateKey;
    if (teacherId) query.teacherId = teacherId;

    const records = await Attendance.find(query)
      .populate("teacherId")
      .sort({ createdAt: -1 });

    const teachers = await Teacher.find().sort({ name: 1 });

    res.render("attendance/record_dashboard", {
      records,
      teachers,
      filters: { dateKey, teacherId },
      markedAbsent,
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// =========================
// ADMIN: VIEW SINGLE
// GET /attendance/:id
// =========================
router.get("/:id", adminOnly, async (req, res) => {
  const record = await Attendance.findById(req.params.id).populate("teacherId");
  if (!record) return res.status(404).send("Attendance not found");
  res.render("attendance/show", { record });
});

// =========================
// ADMIN: MARK ABSENTEES (button endpoint)
// POST /attendance/mark-absent
// =========================

router.post("/mark-absent", adminOnly, async (req, res) => {
  const dateKey = req.body?.dateKey || getTodayKeyLagos();
  await markAbsenteesForDate(dateKey);
  return res.redirect("/attendance/record_dashboard?dateKey=" + dateKey);
});

// router.post("/mark-absent", adminOnly, async (req, res) => {
//   const dateKey = req.body?.dateKey || getTodayKeyLagos();
//   const result = await markAbsenteesForDate(dateKey);
//   return res.json({ success: true, ...result });
// });

// Helper: mark absentees for a dateKey
async function markAbsenteesForDate(dateKey) {
  const teachers = await Teacher.find({ isActive: true }, { _id: 1 });

  const presentRecords = await Attendance.find(
    { dateKey },
    { teacherId: 1 }
  );

  const presentSet = new Set(presentRecords.map((r) => String(r.teacherId)));
  const toCreate = [];

  for (const t of teachers) {
    const tid = String(t._id);
    if (!presentSet.has(tid)) {
      toCreate.push({
        teacherId: t._id,
        dateKey,
        checkInTime: null,
        latitude: null,
        longitude: null,
        distance: null,
        accuracy: null,
        deviceId: null,
        ipAddress: "",
        status: "absent",
      });
    }
  }

  if (toCreate.length) {
    try {
      await Attendance.insertMany(toCreate, { ordered: false });
    } catch (e) {
      // ignore duplicates if another admin ran it simultaneously
    }
  }

  return { dateKey, markedAbsent: toCreate.length };
}

module.exports = router;