const express = require("express");
const router = express.Router();
const { auth, allowRoles } = require("../middlewares/authMiddleware");
const reportCtrl = require("../controllers/reportController");

router.get("/student/attendance", auth, allowRoles("student"), reportCtrl.studentReport);
router.get("/gov/attendance", auth, allowRoles("gov"), reportCtrl.govReport);

module.exports = router;