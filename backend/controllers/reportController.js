const excelJS = require("exceljs");
const pool = require("../config/db");

exports.studentReport = async (req, res) => {
  try {
    const studentId = req.user.id;
    const q = `
      SELECT a.session_id, a.status, a.confidence, s.session_time, c.name AS class_name
      FROM attendance a
      JOIN attendance_sessions s ON a.session_id = s.id
      JOIN classes c ON c.id = s.class_id
      WHERE a.student_id = $1
      AND s.session_time >= NOW() - INTERVAL '30 days'
      ORDER BY s.session_time DESC
    `;
    const result = await pool.query(q, [studentId]);
    const workbook = new excelJS.Workbook();
    const sheet = workbook.addWorksheet("Attendance");
    sheet.columns = [
      { header: "Session ID", key: "session_id", width: 12 },
      { header: "Class", key: "class_name", width: 20 },
      { header: "Time", key: "session_time", width: 22 },
      { header: "Status", key: "status", width: 14 },
      { header: "Confidence", key: "confidence", width: 12 }
    ];
    result.rows.forEach(r => sheet.addRow(r));
    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition","attachment; filename=attendance.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    res.status(500).json({ error: "Failed to generate report" });
  }
};

exports.govReport = async (req, res) => {
  try {
    const classId = req.query.classId || null;
    const from = req.query.from;
    const to = req.query.to;
    const q = `
      SELECT c.name AS class_name, a.student_id, a.status, s.session_time
      FROM attendance a
      JOIN attendance_sessions s ON a.session_id = s.id
      JOIN classes c ON c.id = s.class_id
      WHERE ($1::int IS NULL OR c.id = $1)
      AND s.session_time BETWEEN $2 AND $3
      ORDER BY s.session_time DESC
    `;
    const result = await pool.query(q, [classId, from, to]);
    const workbook = new excelJS.Workbook();
    const sheet = workbook.addWorksheet("GovReport");
    sheet.columns = [
      { header: "Class", key: "class_name", width: 20 },
      { header: "Student ID", key: "student_id", width: 14 },
      { header: "Status", key: "status", width: 12 },
      { header: "Time", key: "session_time", width: 22 }
    ];
    result.rows.forEach(r => sheet.addRow(r));
    res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition","attachment; filename=gov_attendance.xlsx");
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    res.status(500).json({ error: "Failed to generate government report" });
  }
};