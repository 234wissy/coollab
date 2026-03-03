const express = require("express");
const router = express.Router();

// Admin guard
function adminOnly(req, res, next) {
  if (req.session?.isAdmin) return next();
  return res.redirect("/teachers/index");
}

// ✅ Admin landing (requires admin)
// GET /admin
router.get("/attendance/record_dashboard", adminOnly, (req, res) => {
  // Send admin to your real attendance dashboard
  return res.redirect("/attendance/record_dashboard");
});


// ✅ Admin login
// POST /admin/login
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

  if (!req.session) {
    return res.status(500).send(
      "Session not initialized. Ensure express-session is mounted BEFORE /admin routes."
    );
  }

  // ✅ Use .env credentials
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

  // ✅ Redirect to admin dashboard page that exists
  return res.redirect("/attendance/record_dashboard");
});

// ✅ Admin logout
// POST /admin/logout
router.post("/logout", (req, res) => {
  req.session?.destroy(() => res.redirect("/teachers/index"));
});

module.exports = router;
