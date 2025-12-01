const multer = require("multer");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
const { callPythonRegister } = require("../utils/pythonService");

const logFile = path.join(__dirname, "../logs/recognition.log");
function logLine(text) {
  try {
    if (!fs.existsSync(path.dirname(logFile))) {
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
    }
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${text}\n`);
  } catch (e) {
    console.error("Log write failed:", e);
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, `face-${Date.now()}-${file.originalname}`)
});
exports.upload = multer({ storage });

exports.registerStudentFace = async (req, res) => {
  const client = await pool.connect();
  try {
    const { student_id } = req.body;
    const imageUrl = req.body.imageUrl || (req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : null);
    
    if (!student_id) return res.status(400).json({ error: "student_id required" });
    if (!imageUrl && !req.file) return res.status(400).json({ error: "imageUrl or image file required" });

    // Verify student exists
    const studentCheck = await client.query("SELECT id FROM students WHERE id=$1", [student_id]);
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const finalImageUrl = imageUrl || `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    
    try {
      // Call Python ML service
      const mlResult = await callPythonRegister(finalImageUrl, parseInt(student_id));
      
      if (mlResult.success && mlResult.embedding) {
        // Get existing embeddings array
        const existingQuery = await client.query(
          "SELECT embeddings FROM students WHERE id=$1",
          [student_id]
        );
        
        let embeddings = [];
        if (existingQuery.rows[0]?.embeddings && Array.isArray(existingQuery.rows[0].embeddings)) {
          embeddings = existingQuery.rows[0].embeddings;
        }
        
        // Append new embedding to array
        embeddings.push(mlResult.embedding);
        
        // Update student with embeddings array and photo URL
        await client.query(
          "UPDATE students SET embeddings = $1, photo_url = $2, updated_at = NOW() WHERE id = $3",
          [JSON.stringify(embeddings), finalImageUrl, student_id]
        );
        
        logLine(`REGISTER_FACE OK: student ${student_id}, total embeddings: ${embeddings.length}`);
        
        // Delete uploaded image after processing
        if (req.file && req.file.path) {
          try {
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
              console.log(`🗑️ Deleted registration image: ${req.file.filename}`);
            }
          } catch (deleteErr) {
            console.warn(`⚠️ Failed to delete image ${req.file.filename}:`, deleteErr.message);
          }
        }
        
        res.status(201).json({ 
          message: "Face registered successfully", 
          success: true,
          student_id: parseInt(student_id),
          embeddings_count: embeddings.length
        });
      } else {
        throw new Error("Failed to extract embedding");
      }
    } catch (mlError) {
      logLine(`REGISTER_FACE ERR: ${mlError.message}`);
      
      if (mlError.message.includes("unavailable")) {
        return res.status(503).json({ 
          error: "ML service unavailable. Please try again later.",
          success: false
        });
      }
      
      return res.status(500).json({ 
        error: "Face registration failed: " + mlError.message,
        success: false
      });
    }
  } catch (err) {
    logLine(`REGISTER_FACE ERR: ${err.message}`);
    res.status(500).json({ error: "Face registration failed: " + err.message });
  } finally {
    client.release();
  }
};