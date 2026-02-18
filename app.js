const express = require("express");
var methodOverride = require("method-override");
var fs =  require("fs");
const path = require("path");

const app = express();

app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.use("/"/*path name */, express.static("icons" /* images folder name */));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("login");
});

// app.listen(3000, () => {
//     console.log("Server running on port 3000");
// });

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

