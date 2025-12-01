const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pool = require("../config/db");
const { callPythonRecognize } = require("../utils/pythonService");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, Date.now() + "-" + file.originalname)
});
exports.upload = multer({ storage });

exports.createSession = async (req, res) => {
  const client = await pool.connect();
  try {
    const teacherId = req.user?.id;
    if (!teacherId) return res.status(401).json({ error: "Unauthorized" });
    const classId = parseInt(req.params.classId, 10);
    const imageUrl = req.body.imageUrl || null;
    const photoPath = req.file ? req.file.path : null;
    
    console.log(`📸 Teacher attendance upload - Class: ${classId}, Teacher: ${teacherId}`);
    console.log(`   Image file: ${req.file ? req.file.filename : 'none'}`);
    console.log(`   Image URL: ${imageUrl || 'none'}`);
    
    if (!classId || isNaN(classId)) {
      return res.status(400).json({ error: "Invalid classId" });
    }
    
    if (!imageUrl && !photoPath) {
      console.error("❌ No image provided - neither file nor imageUrl");
      return res.status(400).json({ error: "Image file or imageUrl is required" });
    }

    // Build photo URL for ML service
    let photoUrl = imageUrl;
    if (!photoUrl && photoPath) {
      photoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    // Load all student embeddings for this class
    const studentsQuery = await client.query(
      `SELECT s.id, s.embeddings 
       FROM students s
       JOIN class_students cs ON cs.student_id = s.id
       WHERE cs.class_id = $1 AND s.embeddings IS NOT NULL`,
      [classId]
    );

    const knownEmbeddings = studentsQuery.rows
      .filter(row => row.embeddings && Array.isArray(row.embeddings) && row.embeddings.length > 0)
      .map(row => ({
        student_id: row.id,
        embeddings: row.embeddings // Array of embeddings
      }));

    if (knownEmbeddings.length === 0) {
      await client.release();
      return res.status(400).json({ 
        error: "No students with face embeddings found in this class. Please register student faces first." 
      });
    }

    // Call Python ML service for recognition
    let pythonResponse = null;
    let candidates = [];
    
    try {
      const mlResult = await callPythonRecognize(photoUrl, knownEmbeddings, 0.35);
      if (mlResult.success) {
        pythonResponse = {
          success: true,
          candidates: mlResult.candidates,
          total_faces_detected: mlResult.total_faces_detected
        };
        candidates = mlResult.candidates || [];
      } else {
        pythonResponse = {
          success: false,
          error: mlResult.error || "Recognition failed"
        };
      }
    } catch (mlError) {
      console.error("ML service error:", mlError.message);
      // Store error in response but continue
      pythonResponse = {
        success: false,
        error: mlError.message
      };
      
      // If service is unavailable, return error
      if (mlError.message.includes("unavailable")) {
        await client.release();
        return res.status(503).json({ 
          error: "ML recognition service unavailable. Please try again later." 
        });
      }
    }

    await client.query("BEGIN");
    const ins = `
      INSERT INTO attendance_sessions (class_id, photo_path, photo_url, python_response, status, created_by_teacher_id)
      VALUES ($1,$2,$3,$4,'pending',$5) RETURNING id
    `;
    const r = await client.query(ins, [
      classId, 
      photoPath, 
      photoUrl, 
      JSON.stringify(pythonResponse), 
      teacherId
    ]);
    const sessionId = r.rows[0].id;
    await client.query("COMMIT");
    
    // Delete uploaded attendance image after processing
    if (req.file && req.file.path) {
      try {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log(`🗑️ Deleted attendance image: ${req.file.filename}`);
        }
      } catch (deleteErr) {
        console.warn(`⚠️ Failed to delete attendance image ${req.file.filename}:`, deleteErr.message);
      }
    }

    res.status(201).json({ 
      message: "Session created", 
      sessionId, 
      candidates: candidates.map(c => ({
        student_id: c.student_id,
        confidence: c.confidence
      }))
    });
  } catch (e) {
    await client.query("ROLLBACK").catch(()=>{});
    console.error("Error creating attendance session:", e);
    res.status(500).json({ error: "Failed to create session: " + e.message });
  } finally {
    client.release();
  }
};

exports.getSession = async (req, res) => {
  try {
    const id = parseInt(req.params.sessionId,10);
    const r = await pool.query("SELECT * FROM attendance_sessions WHERE id=$1", [id]);
    if (r.rows.length === 0) return res.status(404).json({ error: "Session not found" });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to fetch session" });
  }
};

exports.confirmSession = async (req, res) => {
  const client = await pool.connect();
  try {
    const teacherId = req.user?.id;
    if (!teacherId) return res.status(401).json({ error: "Unauthorized" });
    const sessionId = parseInt(req.params.sessionId, 10);
    const { confirmations } = req.body;
    
    if (!Array.isArray(confirmations) || confirmations.length === 0) {
      return res.status(400).json({ error: "Confirmations array required" });
    }

    await client.query("BEGIN");
    
    // Get session and lock it
    const sess = await client.query(
      "SELECT status, class_id FROM attendance_sessions WHERE id=$1 FOR UPDATE", 
      [sessionId]
    );
    
    if (sess.rows.length === 0) { 
      await client.query("ROLLBACK"); 
      return res.status(404).json({ error: "Session not found" }); 
    }
    
    if (sess.rows[0].status === "saved") { 
      await client.query("ROLLBACK"); 
      return res.status(409).json({ error: "Session already saved" }); 
    }

    const classId = sess.rows[0].class_id;

    // Get all students in the class to mark absent those not in confirmations
    const allStudentsQuery = await client.query(
      `SELECT s.id FROM students s
       JOIN class_students cs ON cs.student_id = s.id
       WHERE cs.class_id = $1`,
      [classId]
    );
    
    const allStudentIds = allStudentsQuery.rows.map(r => r.id);
    const confirmedStudentIds = confirmations.map(c => c.student_id);
    const absentStudentIds = allStudentIds.filter(id => !confirmedStudentIds.includes(id));

    // Insert/update attendance records
    const ins = `
      INSERT INTO attendance (session_id, student_id, status, confidence, confirmed_by_teacher_id, updated_at)
      VALUES ($1,$2,$3,$4,$5,NOW())
      ON CONFLICT (session_id, student_id) DO UPDATE
      SET status=EXCLUDED.status, 
          confidence=EXCLUDED.confidence, 
          confirmed_by_teacher_id=EXCLUDED.confirmed_by_teacher_id,
          updated_at=NOW()
    `;
    
    // Insert present students
    for (const c of confirmations) {
      await client.query(ins, [
        sessionId, 
        c.student_id, 
        c.status || 'present', 
        c.confidence || null, 
        teacherId
      ]);
    }
    
    // Insert absent students
    for (const studentId of absentStudentIds) {
      await client.query(ins, [
        sessionId, 
        studentId, 
        'absent', 
        null, 
        teacherId
      ]);
    }
    
    await client.query("UPDATE attendance_sessions SET status='saved' WHERE id=$1", [sessionId]);
    await client.query("COMMIT");
    
    res.json({ 
      message: "Attendance saved", 
      sessionId,
      present: confirmations.length,
      absent: absentStudentIds.length
    });
  } catch (e) {
    await client.query("ROLLBACK").catch(()=>{});
    console.error("Error confirming attendance:", e);
    res.status(500).json({ error: "Failed to save attendance: " + e.message });
  } finally {
    client.release();
  }
};