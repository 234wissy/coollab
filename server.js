require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;

const Teacher = require("./models/Teacher");

const teacherRoutes = require("./routes/teachers");
const attendanceRoutes = require("./routes/attendance");
const adminRoutes = require("./routes/admin");

const app = express();

// ===============================
// MIDDLEWARE
// ===============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use("/icons", express.static(path.join(__dirname, "icons")));

// Session
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET || "vericlock_secret_change_me",
//     resave: false,
//     saveUninitialized: false,
//   })
// );

app.use(
  session({
    secret: process.env.SESSION_SECRET || "vericlock_secret_change_me",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

app.use("/admin", adminRoutes);  // ✅ then routes

// Make session values available in EJS
app.use((req, res, next) => {
  res.locals.isAdmin = !!req.session?.isAdmin;
  res.locals.teacherName = req.session?.teacherName || null;
  next();
});

// ===============================
// AUTH HELPERS
// ===============================
function requireTeacher(req, res, next) {
  if (!req.session?.teacherId) return res.redirect("/teachers/index");
  next();
}

// ===============================
// ROUTE MOUNTS
// ===============================
app.use("/teachers", teacherRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/admin", adminRoutes);

// ===============================
// ROOT
// ===============================
// app.get("/", (req, res) => res.redirect("/teachers/index"));

// for home page to always load
app.get("/", (req, res) => {
  return res.render("teachers/index", {
    title: "VERICLOCK Login",
    error: null,
    adminError: null,
  });
});

// ===============================
// TEACHER DASHBOARD
// ===============================
app.get("/teachers/dashboard", requireTeacher, async (req, res) => {
  const teacher = await Teacher.findById(req.session.teacherId);

  if (!teacher) {
    req.session.destroy(() => {});
    return res.redirect("/teachers/index");
  }

  return res.render("teachers/dashboard", { teacher });
});

// ===============================
// LOGOUT
// ===============================
app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/teachers/index"));
});

// ===============================
// DB + SERVER START
// ===============================
// const PORT = process.env.PORT || 5000;

// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log("MongoDB Connected");
//     app.listen(PORT, () =>
//       console.log(`Server running on port ${PORT}`)
//     );
//   })
//   .catch((err) =>
//     console.log("MongoDB Connection Error:", err.message)
//   );
const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing. Set it in Render Environment Variables.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB Connection Error:", err.message);
    process.exit(1);
  });
