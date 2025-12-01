const express = require("express");
const router = express.Router();
const { auth, allowRoles } = require("../middlewares/authMiddleware");
const teacherCtrl = require("../controllers/teacherController");

router.get("/classes", auth, allowRoles("teacher"), teacherCtrl.myClasses);
router.get("/classes/:classId/students", auth, allowRoles("teacher"), teacherCtrl.myStudents);

module.exports = router;