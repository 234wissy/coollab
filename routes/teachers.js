const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const Teacher = require("../models/Teacher");
const adminOnly = require("../middleware/adminOnly");

// ===============================
// LOGIN PAGE (index stays index)
// GET /teachers/index
// ===============================
router.get("/index", (req, res) => {
  if (req.session?.isAdmin) return res.redirect("/admin");
  if (req.session?.teacherId) return res.redirect("/teachers/dashboard");

  return res.render("teachers/index", {
    title: "VERICLOCK Login",
    error: null,
    adminError: null,
  });
});

// always display home page even if admin is login in 
// router.get("/index", (req, res) => {
//   return res.render("teachers/index", {
//     title: "VERICLOCK Login",
//     error: null,
//     adminError: null,
//   });
// });

// ===============================
// TEACHER LOGIN
// POST /teachers/index
// ===============================
router.post("/index", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render("teachers/index", {
        title: "VERICLOCK Login",
        error: "Email and password are required.",
        adminError: null,
      });
    }

    const teacher = await Teacher.findOne({
      email: email.trim().toLowerCase(),
      isActive: true,
    });

    if (!teacher) {
      return res.status(401).render("teachers/index", {
        title: "VERICLOCK Login",
        error: "Invalid email or password.",
        adminError: null,
      });
    }

    const ok = await bcrypt.compare(password, teacher.password);
    if (!ok) {
      return res.status(401).render("teachers/index", {
        title: "VERICLOCK Login",
        error: "Invalid email or password.",
        adminError: null,
      });
    }

    // ✅ Session
    req.session.teacherId = teacher._id.toString();
    req.session.teacherName = teacher.name;

    return res.redirect("/teachers/dashboard");
  } catch (err) {
    return res.status(500).render("teachers/index", {
      title: "VERICLOCK Login",
      error: err.message,
      adminError: null,
    });
  }
});

// ===============================
// TEACHER LIST (ADMIN)
// GET /teachers
// NOTE: you said you don't want to change index; this is separate.
// You MUST have a view for this if you keep it.
// If you don't have teachers/list view, you can remove this route.
// ===============================

router.get("/", adminOnly, async (req, res) => {
  const teachers = await Teacher.find().sort({ createdAt: -1 });
  return res.json(teachers);
});

// router.get("/", adminOnly, async (req, res) => {
//   const teachers = await Teacher.find().sort({ createdAt: -1 });

  // If you DON'T have a teachers list view, change this to res.json(teachers)
  // or create views/teachers/list.ejs.
//   return res.render("teachers/list", { teachers });
// });

// ===============================
// SHOW CREATE TEACHER FORM (ADMIN)
// GET /teachers/new
// ===============================
router.get("/new", adminOnly, (req, res) => {
  return res.render("teachers/new", {
    title: "Add Teacher",
    error: null,
  });
});

// ===============================
// CREATE TEACHER (ADMIN)
// POST /teachers
// ===============================
router.post("/", adminOnly, async (req, res) => {
  try {
    const { name, email, deviceId, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).render("teachers/new", {
        title: "Add Teacher",
        error: "Name, Email, and Password are required.",
      });
    }

    const existing = await Teacher.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).render("teachers/new", {
        title: "Add Teacher",
        error: "Email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Teacher.create({
      name,
      email: email.toLowerCase().trim(),
      deviceId: deviceId || null, // deviceId optional
      password: hashedPassword,
    });

    return res.redirect("/admin");
  } catch (err) {
    return res.status(500).send(err.message);
  }
});

// ===============================
// EDIT TEACHER (ADMIN) - you have teachers/edit.ejs
// GET /teachers/:id/edit
// ===============================
router.get("/:id/edit", adminOnly, async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher) return res.status(404).send("Teacher not found");
  return res.render("teachers/edit", { teacher });
});

// ===============================
// UPDATE TEACHER (ADMIN)
// PUT /teachers/:id
// ===============================
router.put("/:id", adminOnly, async (req, res) => {
  const { name, email, deviceId, isActive } = req.body;

  await Teacher.findByIdAndUpdate(
    req.params.id,
    {
      name,
      email: email?.toLowerCase()?.trim(),
      deviceId: deviceId || null,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    },
    { runValidators: true }
  );

  return res.redirect("/admin");
});

module.exports = router;