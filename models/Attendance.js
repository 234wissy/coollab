const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
      index: true,
    },

    // ✅ Use dateKey for daily uniqueness (YYYY-MM-DD in Africa/Lagos)
    dateKey: {
      type: String,
      required: true,
      index: true,
    },

    // ✅ when the check-in happened (null for absent)
    checkInTime: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["early", "present", "late", "absent"],
      default: "present",
      index: true,
    },

    // ✅ Optional: store GPS for present/late/early
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },

    // Optional: distance from school in meters
    distance: { type: Number, default: null },

    // Optional: anti-spoof info
    accuracy: { type: Number, default: null },
    deviceId: { type: String, default: null },
    ipAddress: { type: String, default: null },
  },
  { timestamps: true }
);

// ✅ Ensure only ONE attendance per teacher per day
attendanceSchema.index({ teacherId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);