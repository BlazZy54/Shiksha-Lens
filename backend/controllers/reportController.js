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
    result.rows.forEach((r) => sheet.addRow(r));
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=attendance.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("studentReport error:", e);
    res
      .status(500)
      .json({ success: false, error: "Failed to generate report" });
  }
};

exports.govReport = async (req, res) => {
  try {
    const classId = req.query.classId || null;
    const from = req.query.from;
    const to = req.query.to;

    // If no date range is provided, fall back to an empty report
    if (!from || !to) {
      const workbook = new excelJS.Workbook();
      const sheet = workbook.addWorksheet("GovReport");
      sheet.columns = [
        { header: "Class", key: "class", width: 20 },
        { header: "Section", key: "section", width: 10 },
        { header: "Total Days", key: "totalDays", width: 14 },
        { header: "Avg Attendance %", key: "avgAttendance", width: 18 },
        { header: "Suspicious Entries", key: "suspiciousEntries", width: 18 },
        { header: "Status", key: "status", width: 14 },
      ];
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=gov_attendance.xlsx"
      );
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    // Aggregate attendance analytics per class over the requested period.
    // Suspicious entries heuristic:
    //   - If a row is marked manual_present OR has NULL confidence, treat it as suspicious.


    const q = `
      SELECT
        c.id AS class_id,
        c.name AS class_name,
        c.section AS section,
        COUNT(DISTINCT s.id) AS total_days,
        COUNT(a.id) AS total_marks,
        COALESCE(SUM(CASE WHEN a.status IN ('present','manual_present') THEN 1 ELSE 0 END), 0) AS present_marks,
        COALESCE(SUM(CASE WHEN (a.status = 'manual_present' OR a.confidence IS NULL) THEN 1 ELSE 0 END), 0) AS suspicious_entries
      FROM classes c
      JOIN attendance_sessions s ON s.class_id = c.id
      JOIN attendance a ON a.session_id = s.id
      WHERE s.session_time BETWEEN $1 AND $2
        AND ($3::int IS NULL OR c.id = $3)
      GROUP BY c.id, c.name, c.section
      ORDER BY c.name, c.section
    `;

    const result = await pool.query(q, [from, to, classId]);

    const workbook = new excelJS.Workbook();
    const sheet = workbook.addWorksheet("GovReport");

    // Match the dummy/monthly report structure used on the Officer dashboard and CSV export.
    sheet.columns = [
      { header: "Class", key: "class", width: 20 },
      { header: "Section", key: "section", width: 10 },
      { header: "Total Days", key: "totalDays", width: 14 },
      { header: "Avg Attendance %", key: "avgAttendance", width: 18 },
      { header: "Suspicious Entries", key: "suspiciousEntries", width: 18 },
      { header: "Status", key: "status", width: 14 },
    ];

    // If there is no data, return an empty sheet (headers only), not an error.
    if (result.rowCount === 0) {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=gov_attendance.xlsx"
      );
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    result.rows.forEach((row) => {
      const totalDays = Number(row.total_days) || 0;
      const totalMarks = Number(row.total_marks) || 0;
      const presentMarks = Number(row.present_marks) || 0;
      const suspiciousEntries = Number(row.suspicious_entries) || 0;

      const avgAttendance =
        totalMarks > 0 ? (presentMarks / totalMarks) * 100 : 0;
      const roundedAvg = Number(avgAttendance.toFixed(1));

      const status = roundedAvg < 75 ? "Needs Review" : "Valid";

      sheet.addRow({
        class: row.class_name,
        section: row.section || "A",
        totalDays,
        avgAttendance: roundedAvg,
        suspiciousEntries,
        status,
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=gov_attendance.xlsx"
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("govReport error:", e);
    res
      .status(500)
      .json({ success: false, error: "Failed to generate government report" });
  }
};

// JSON analytics endpoint for Officer dashboard - per-class monthly stats
exports.govSummary = async (req, res) => {
  try {
    const classId = req.query.classId || null;
    const from = req.query.from;
    const to = req.query.to;

    if (!from || !to) {
      return res.json({ success: true, data: [] });
    }

    const q = `
      SELECT
        c.id AS class_id,
        c.name AS class_name,
        c.section AS section,
        COUNT(DISTINCT s.id) AS total_days,
        COUNT(a.id) AS total_marks,
        COALESCE(SUM(CASE WHEN a.status IN ('present','manual_present') THEN 1 ELSE 0 END), 0) AS present_marks,
        COALESCE(SUM(CASE WHEN (a.status = 'manual_present' OR a.confidence IS NULL) THEN 1 ELSE 0 END), 0) AS suspicious_entries
      FROM classes c
      JOIN attendance_sessions s ON s.class_id = c.id
      JOIN attendance a ON a.session_id = s.id
      WHERE s.session_time BETWEEN $1 AND $2
        AND ($3::int IS NULL OR c.id = $3)
      GROUP BY c.id, c.name, c.section
      ORDER BY c.name, c.section
    `;

    const result = await pool.query(q, [from, to, classId]);

    const data = result.rows.map((row) => {
      const totalDays = Number(row.total_days) || 0;
      const totalMarks = Number(row.total_marks) || 0;
      const presentMarks = Number(row.present_marks) || 0;
      const suspiciousEntries = Number(row.suspicious_entries) || 0;

      const avgAttendance =
        totalMarks > 0 ? (presentMarks / totalMarks) * 100 : 0;
      const roundedAvg = Number(avgAttendance.toFixed(1));
      const status = roundedAvg < 75 ? "Needs Review" : "Valid";

      return {
        class: row.class_name,
        section: row.section || "A",
        totalDays,
        avgAttendance: roundedAvg,
        suspiciousEntries,
        status,
      };
    });

    return res.json({ success: true, data });
  } catch (e) {
    console.error("govSummary error:", e);
    return res
      .status(500)
      .json({ success: false, error: "Failed to fetch government summary" });
  }
};