module.exports = (err, req, res, next) => {
  console.error("❌ Error:", err.message);
  const status = err.statusCode || 500;
  res.status(status).json({ success: false, error: err.message || "Server error" });
};