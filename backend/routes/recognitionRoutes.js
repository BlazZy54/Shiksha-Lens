const express = require("express");
const router = express.Router();
const { auth, allowRoles } = require("../middlewares/authMiddleware");
const recognitionCtrl = require("../controllers/recognitionController");

router.post("/register-face", auth, allowRoles("admin"), recognitionCtrl.upload.single("image"), recognitionCtrl.registerStudentFace);

module.exports = router;