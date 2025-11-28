const pool = require("../config/db");

exports.myClasses = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const r = await pool.query("SELECT * FROM classes WHERE teacher_id=$1", [teacherId]);
    res.json(r.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch classes" });
  }
};

exports.myStudents = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const classId = req.params.classId;
    const owns = await pool.query("SELECT 1 FROM classes WHERE id=$1 AND teacher_id=$2", [classId, teacherId]);
    if (owns.rows.length === 0) return res.status(403).json({ error: "Forbidden" });
    const q = `
      SELECT s.id, s.name, s.roll
      FROM class_students cs
      JOIN students s ON s.id = cs.student_id
      WHERE cs.class_id=$1
      ORDER BY s.id
    `;
    const r = await pool.query(q, [classId]);
    res.json(r.rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch students" });
  }
};