const express = require("express");
const router = express.Router();

const adminOnly = require("../middleware/adminOnly");

// ✅ GET /admin/login (show login page)
router.get("/login", (req, res) => {
  if (req.session?.isAdmin) return res.redirect("/admin");
  return res.render("teachers/index", {
    title: "VERICLOCK Login",
    error: null,
    adminError: null,
  });
});

// ✅ GET /admin (admin landing)
router.get("/", adminOnly, (req, res) => {
  return res.redirect("/attendance/record_dashboard");
});

// ✅ POST /admin/login (process login)
router.post("/login", (req, res) => {
  const adminId = req.body?.adminId;
  const adminPassword = req.body?.adminPassword;

  if (!adminId || !adminPassword) {
    return res.status(400).render("teachers/index", {
      title: "VERICLOCK Login",
      error: null,
      adminError: "Admin ID and password are required.",
    });
  }

  const ENV_ADMIN_ID = process.env.ADMIN_ID || "admin";
  const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

  if (adminId !== ENV_ADMIN_ID || adminPassword !== ENV_ADMIN_PASSWORD) {
    return res.status(401).render("teachers/index", {
      title: "VERICLOCK Login",
      error: null,
      adminError: "Invalid admin credentials.",
    });
  }

  req.session.isAdmin = true;
  req.session.adminId = adminId;

  // ✅ CRITICAL: save session before redirect (prevents “redirect but not logged in”)
  return req.session.save((err) => {
    if (err) {
      console.error("Session save error:", err);
      return res.status(500).send("Failed to save session.");
    }
    return res.redirect("/attendance/record_dashboard");
  });
});

// ✅ POST /admin/logout
router.post("/logout", (req, res) => {
  req.session?.destroy(() => res.redirect("/admin/login"));
});

module.exports = router;
