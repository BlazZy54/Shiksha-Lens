const express = require("express");
const router = express.Router();
const { auth, allowRoles } = require("../middlewares/authMiddleware");
const attendanceCtrl = require("../controllers/attendanceController");

router.post("/classes/:classId/attendance/upload", auth, allowRoles("teacher"), attendanceCtrl.upload.single("image"), attendanceCtrl.createSession);
router.get("/attendance/:sessionId", auth, allowRoles("teacher"), attendanceCtrl.getSession);
router.post("/attendance/:sessionId/confirm", auth, allowRoles("teacher"), attendanceCtrl.confirmSession);

module.exports = router;