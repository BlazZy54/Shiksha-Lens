const express = require("express");
const router = express.Router();
const { auth, allowRoles } = require("../middlewares/authMiddleware");
const adminCtrl = require("../controllers/adminController");

// Students
router.get("/students", auth, allowRoles("admin"), adminCtrl.listStudents);
router.post("/student", auth, allowRoles("admin"), adminCtrl.upload.array("images", 5), adminCtrl.addStudent);
router.put("/student/:id", auth, allowRoles("admin"), adminCtrl.updateStudent);
router.delete("/student/:id", auth, allowRoles("admin"), adminCtrl.deleteStudent);

// Teachers
router.get("/teachers", auth, allowRoles("admin"), adminCtrl.listTeachers);
router.post("/teacher", auth, allowRoles("admin"), adminCtrl.addTeacher);
router.put("/teacher/:id", auth, allowRoles("admin"), adminCtrl.updateTeacher);
router.delete("/teacher/:id", auth, allowRoles("admin"), adminCtrl.deleteTeacher);

// Classes
router.get("/classes", auth, allowRoles("admin"), adminCtrl.listClasses);
router.post("/class", auth, allowRoles("admin"), adminCtrl.addClass);
router.put("/class/:id", auth, allowRoles("admin"), adminCtrl.updateClass);
router.delete("/class/:id", auth, allowRoles("admin"), adminCtrl.deleteClass);
router.post("/class/assign", auth, allowRoles("admin"), adminCtrl.assignStudent);
router.get("/class/:classId/students", auth, allowRoles("admin"), adminCtrl.getClassStudents);
router.get("/class/:classId/count", auth, allowRoles("admin"), adminCtrl.countStudents);

// Attendance overview
router.get("/attendance/sessions", auth, allowRoles("admin"), adminCtrl.listAttendanceSessions);
router.get("/attendance/sessions/:sessionId", auth, allowRoles("admin"), adminCtrl.getAttendanceSessionDetail);

// User Management
router.get("/users", auth, allowRoles("admin"), adminCtrl.listAllUsers);
router.put("/users/:id/authorize", auth, allowRoles("admin"), adminCtrl.authorizeUser);
router.delete("/users/:id", auth, allowRoles("admin"), adminCtrl.deleteUser);

module.exports = router;