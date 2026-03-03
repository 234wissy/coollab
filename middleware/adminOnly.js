module.exports = function adminOnly(req, res, next) {
  if (req.session?.isAdmin) return next();

  // if someone hits admin pages without login, send them to admin login
  return res.redirect("/admin/login");
};
