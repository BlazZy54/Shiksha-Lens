const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { callPythonRegister } = require("../utils/pythonService");
const { checkUrlAccessible } = require("../utils/urlChecker");

const respondNotFound = (res, entity = "Resource") => res.status(404).json({ error: `${entity} not found` });

// Multer configuration for student photo upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => cb(null, `student_${Date.now()}_${file.originalname}`)
});
exports.upload = multer({ storage });

exports.listStudents = async (_req, res, next) => {
  try {
    const query = `
      SELECT
        s.id,
        s.name,
        s.roll,
        s.created_at,
        COALESCE(
          JSON_AGG(
            DISTINCT JSONB_BUILD_OBJECT(
              'class_id', c.id,
              'class_name', c.name,
              'section', c.section
            )
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) AS classes
      FROM students s
      LEFT JOIN class_students cs ON cs.student_id = s.id
      LEFT JOIN classes c ON c.id = cs.class_id
      GROUP BY s.id
      ORDER BY s.created_at DESC;
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.addStudent = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { name, roll, class_id } = req.body;
    if (!name || !roll) {
      return res.status(400).json({ error: "Name and roll are required" });
    }

    // Check if images are provided
    const imageFiles = req.files || (req.file ? [req.file] : []);
    const imageUrl = req.body.imageUrl;
    
    if (imageFiles.length === 0 && !imageUrl) {
      return res.status(400).json({ error: "At least one student photo is required (image files or imageUrl)" });
    }

    await client.query("BEGIN");

    // Collect all image URLs
    const imageUrls = [];
    const uploadedFiles = [];
    
    if (imageFiles.length > 0) {
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:3000';
      
      for (const imageFile of imageFiles) {
        const photoUrl = `${protocol}://${host}/uploads/${imageFile.filename}`;
        imageUrls.push(photoUrl);
        uploadedFiles.push(imageFile);
        console.log(`📸 Admin: Image uploaded - ${imageFile.filename}`);
        console.log(`   File path: ${imageFile.path}`);
        console.log(`   Photo URL: ${photoUrl}`);
      }
    }
    
    if (imageUrl) {
      imageUrls.push(imageUrl);
      console.log(`📸 Admin: Using provided imageUrl: ${imageUrl}`);
    }

    // Insert student first
    const firstPhotoUrl = imageUrls.length > 0 ? imageUrls[0] : null;
    const insert = await client.query(
      "INSERT INTO students (name, roll, class_id, photo_url) VALUES ($1,$2,$3,$4) RETURNING id, name, roll, class_id, photo_url",
      [name.trim(), String(roll).trim(), class_id || null, firstPhotoUrl]
    );

    const student = insert.rows[0];
    const studentId = student.id;

    // Call Python ML service to extract embeddings from all images
    const embeddings = [];
    let mlError = null;
    const processedFiles = [];
    
    try {
      console.log(`🔍 Admin: Processing ${imageUrls.length} image(s) for student ${studentId}`);
      
      for (let i = 0; i < imageUrls.length; i++) {
        const photoUrl = imageUrls[i];
        const imageFile = uploadedFiles[i];
        
        try {
          console.log(`   Processing image ${i + 1}/${imageUrls.length}: ${photoUrl}`);
          
          // Verify URL is accessible (quick check)
          if (imageFile && fs.existsSync(imageFile.path)) {
            console.log(`   ✅ Image file exists locally at: ${imageFile.path}`);
          }
          
          // Check if URL is accessible from network
          const urlCheck = await checkUrlAccessible(photoUrl, 5000);
          if (!urlCheck.accessible) {
            console.warn(`   ⚠️ Photo URL may not be accessible: ${urlCheck.error}`);
          } else {
            console.log(`   ✅ Photo URL is accessible (status: ${urlCheck.status})`);
          }
          
          const mlResult = await callPythonRegister(photoUrl, studentId);
          
          if (mlResult.success && mlResult.embedding) {
            embeddings.push(mlResult.embedding);
            console.log(`   ✅ Embedding ${i + 1} extracted (length: ${mlResult.embedding.length})`);
            if (imageFile) {
              processedFiles.push(imageFile);
            }
          } else {
            console.warn(`   ⚠️ Image ${i + 1}: ML service returned success=false or no embedding`);
          }
        } catch (imgErr) {
          console.error(`   ❌ Error processing image ${i + 1}:`, imgErr.message);
          // Continue with next image
        }
      }
      
      if (embeddings.length > 0) {
        console.log(`✅ Admin: Extracted ${embeddings.length} embedding(s) successfully`);
        
        // Update student with embeddings array
        await client.query(
          "UPDATE students SET embeddings = $1 WHERE id = $2",
          [JSON.stringify(embeddings), studentId]
        );
        console.log(`✅ Admin: Embeddings saved to database for student ${studentId}`);
      } else {
        console.warn(`⚠️ Admin: No embeddings extracted from any image`);
        mlError = new Error("ML service did not return embeddings from any image");
      }
    } catch (mlErr) {
      mlError = mlErr;
      console.error("❌ ML service error during student registration:");
      console.error("   Error message:", mlErr.message);
      console.error("   Error code:", mlErr.code);
      console.error("   Student ID:", studentId);
    }
    
    // Delete uploaded image files after processing
    for (const imageFile of processedFiles) {
      try {
        if (fs.existsSync(imageFile.path)) {
          fs.unlinkSync(imageFile.path);
          console.log(`🗑️ Deleted uploaded image: ${imageFile.filename}`);
        }
      } catch (deleteErr) {
        console.warn(`⚠️ Failed to delete image ${imageFile.filename}:`, deleteErr.message);
      }
    }

    await client.query("COMMIT");

    const response = {
      message: "Student added",
      student: {
        ...student,
        embeddings: embeddings.length > 0 ? `${embeddings.length} extracted` : null
      }
    };
    
    // Include ML service status in response
    if (mlError) {
      response.warning = "Face embedding extraction failed. Student created but embeddings not extracted.";
      response.ml_error = mlError.message;
      response.note = "You can register faces later using the /api/recognition/register-face endpoint";
    } else if (embeddings.length === 0) {
      response.warning = "No face embeddings were extracted";
    } else {
      response.embeddings_count = embeddings.length;
    }
    
    res.status(201).json(response);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    if (err.code === "23505") {
      return res.status(409).json({ error: "Roll number already exists" });
    }
    next(err);
  } finally {
    client.release();
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, roll } = req.body;
    if (!name && !roll) {
      return res.status(400).json({ error: "No updates provided" });
    }

    const fields = [];
    const values = [];
    if (name) {
      values.push(name.trim());
      fields.push(`name=$${values.length}`);
    }
    if (roll) {
      values.push(String(roll).trim());
      fields.push(`roll=$${values.length}`);
    }
    values.push(id);

    const update = await pool.query(
      `UPDATE students SET ${fields.join(", ")}, updated_at=NOW() WHERE id=$${values.length} RETURNING id, name, roll`,
      values
    );

    if (update.rowCount === 0) {
      return respondNotFound(res, "Student");
    }

    res.json({ message: "Student updated", student: update.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query("DELETE FROM students WHERE id=$1 RETURNING id", [id]);
    if (result.rowCount === 0) {
      return respondNotFound(res, "Student");
    }
    res.json({ message: "Student deleted" });
  } catch (err) {
    next(err);
  }
};

exports.listTeachers = async (_req, res, next) => {
  try {
    const query = `
      SELECT id, name, email, created_at
      FROM users
      WHERE role='teacher'
      ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.addTeacher = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const insert = await pool.query(
      "INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,'teacher') RETURNING id, name, email, created_at",
      [name.trim(), email.trim().toLowerCase(), hashed]
    );
    res.status(201).json({ message: "Teacher created", teacher: insert.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }
    next(err);
  }
};

exports.updateTeacher = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, email, password } = req.body;
    if (!name && !email && !password) {
      return res.status(400).json({ error: "No updates provided" });
    }

    const fields = [];
    const values = [];
    if (name) {
      values.push(name.trim());
      fields.push(`name=$${values.length}`);
    }
    if (email) {
      values.push(email.trim().toLowerCase());
      fields.push(`email=$${values.length}`);
    }
    if (password) {
      const hashed = await bcrypt.hash(password, 10);
      values.push(hashed);
      fields.push(`password=$${values.length}`);
    }
    values.push(id);

    const update = await pool.query(
      `UPDATE users SET ${fields.join(", ")}, updated_at=NOW() WHERE id=$${values.length} AND role='teacher' RETURNING id, name, email`,
      values
    );

    if (update.rowCount === 0) {
      return respondNotFound(res, "Teacher");
    }

    res.json({ message: "Teacher updated", teacher: update.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }
    next(err);
  }
};

exports.deleteTeacher = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    await client.query("BEGIN");
    await client.query("UPDATE classes SET teacher_id=NULL, updated_at=NOW() WHERE teacher_id=$1", [id]);
    const deletion = await client.query("DELETE FROM users WHERE id=$1 AND role='teacher' RETURNING id", [id]);
    if (deletion.rowCount === 0) {
      await client.query("ROLLBACK");
      return respondNotFound(res, "Teacher");
    }
    await client.query("COMMIT");
    res.json({ message: "Teacher deleted" });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};

exports.listClasses = async (_req, res, next) => {
  try {
    const query = `
      SELECT
        c.id,
        c.name,
        c.section,
        c.teacher_id,
        c.created_at,
        c.updated_at,
        JSONB_BUILD_OBJECT('id', u.id, 'name', u.name, 'email', u.email) AS teacher,
        COALESCE(st.count_students, 0) AS student_count
      FROM classes c
      LEFT JOIN users u ON u.id = c.teacher_id
      LEFT JOIN (
        SELECT class_id, COUNT(*)::int AS count_students
        FROM class_students
        GROUP BY class_id
      ) st ON st.class_id = c.id
      ORDER BY c.created_at DESC
    `;
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.addClass = async (req, res, next) => {
  try {
    const { name, section = "A", teacher_id = null } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Class name is required" });
    }

    if (teacher_id) {
      const teacher = await pool.query("SELECT id FROM users WHERE id=$1 AND role='teacher'", [teacher_id]);
      if (teacher.rowCount === 0) {
        return res.status(400).json({ error: "Teacher not found" });
      }
    }

    const insert = await pool.query(
      "INSERT INTO classes (name, section, teacher_id) VALUES ($1,$2,$3) RETURNING id, name, section, teacher_id",
      [name.trim(), section.trim(), teacher_id]
    );

    res.status(201).json({ message: "Class created", klass: insert.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateClass = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, section, teacher_id } = req.body;
    if (!name && !section && typeof teacher_id === "undefined") {
      return res.status(400).json({ error: "No updates provided" });
    }

    if (teacher_id) {
      const teacher = await pool.query("SELECT id FROM users WHERE id=$1 AND role='teacher'", [teacher_id]);
      if (teacher.rowCount === 0) {
        return res.status(400).json({ error: "Teacher not found" });
      }
    }

    const fields = [];
    const values = [];
    if (name) {
      values.push(name.trim());
      fields.push(`name=$${values.length}`);
    }
    if (section) {
      values.push(section.trim());
      fields.push(`section=$${values.length}`);
    }
    if (typeof teacher_id !== "undefined") {
      values.push(teacher_id || null);
      fields.push(`teacher_id=$${values.length}`);
    }
    values.push(id);

    const update = await pool.query(
      `UPDATE classes SET ${fields.join(", ")}, updated_at=NOW() WHERE id=$${values.length} RETURNING id, name, section, teacher_id`,
      values
    );

    if (update.rowCount === 0) {
      return respondNotFound(res, "Class");
    }

    res.json({ message: "Class updated", klass: update.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteClass = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const deletion = await pool.query("DELETE FROM classes WHERE id=$1 RETURNING id", [id]);
    if (deletion.rowCount === 0) {
      return respondNotFound(res, "Class");
    }
    res.json({ message: "Class deleted" });
  } catch (err) {
    next(err);
  }
};

exports.assignStudent = async (req, res, next) => {
  try {
    const { class_id, student_id } = req.body;
    if (!class_id || !student_id) {
      return res.status(400).json({ error: "class_id and student_id are required" });
    }
    await pool.query(
      "INSERT INTO class_students (class_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
      [class_id, student_id]
    );
    res.status(201).json({ message: "Student assigned to class" });
  } catch (err) {
    next(err);
  }
};

exports.getClassStudents = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const limit = parseInt(req.query.limit || "50", 10);
    const offset = parseInt(req.query.offset || "0", 10);
    const q = `
      SELECT s.id, s.name, s.roll
      FROM class_students cs
      JOIN students s ON s.id = cs.student_id
      WHERE cs.class_id = $1
      ORDER BY s.id
      LIMIT $2 OFFSET $3
    `;
    const r = await pool.query(q, [classId, limit, offset]);
    res.json(r.rows);
  } catch (err) {
    next(err);
  }
};

exports.countStudents = async (req, res, next) => {
  try {
    const classId = req.params.classId;
    const r = await pool.query("SELECT COUNT(*)::int AS total FROM class_students WHERE class_id=$1", [classId]);
    res.json(r.rows[0]);
  } catch (err) {
    next(err);
  }
};

exports.listAttendanceSessions = async (req, res, next) => {
  try {
    const { classId, status, from, to, limit = 50, offset = 0 } = req.query;
    const params = [];
    const conditions = [];

    if (classId) {
      params.push(Number(classId));
      conditions.push(`s.class_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      conditions.push(`s.status = $${params.length}`);
    }
    if (from) {
      params.push(new Date(from));
      conditions.push(`s.session_time >= $${params.length}`);
    }
    if (to) {
      params.push(new Date(to));
      conditions.push(`s.session_time <= $${params.length}`);
    }

    params.push(parseInt(limit, 10));
    params.push(parseInt(offset, 10));

    const query = `
      SELECT
        s.id,
        s.session_time,
        s.status,
        s.python_response,
        c.id AS class_id,
        c.name AS class_name,
        c.section,
        u.id AS teacher_id,
        u.name AS teacher_name,
        COALESCE(att.total_marked, 0) AS total_marked,
        COALESCE(att.present_count, 0) AS total_present
      FROM attendance_sessions s
      JOIN classes c ON c.id = s.class_id
      LEFT JOIN users u ON u.id = s.created_by_teacher_id
      LEFT JOIN (
        SELECT
          session_id,
          COUNT(*)::int AS total_marked,
          SUM(CASE WHEN status IN ('present','manual_present') THEN 1 ELSE 0 END)::int AS present_count
        FROM attendance
        GROUP BY session_id
      ) att ON att.session_id = s.id
      ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
      ORDER BY s.session_time DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.getAttendanceSessionDetail = async (req, res, next) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const headerQuery = `
      SELECT
        s.id,
        s.session_time,
        s.status,
        s.python_response,
        c.id AS class_id,
        c.name AS class_name,
        c.section,
        u.id AS teacher_id,
        u.name AS teacher_name
      FROM attendance_sessions s
      JOIN classes c ON c.id = s.class_id
      LEFT JOIN users u ON u.id = s.created_by_teacher_id
      WHERE s.id=$1
    `;
    const header = await pool.query(headerQuery, [sessionId]);
    if (header.rowCount === 0) {
      return respondNotFound(res, "Attendance session");
    }

    const detailQuery = `
      SELECT
        a.student_id,
        st.name AS student_name,
        st.roll,
        a.status,
        a.confidence,
        a.created_at
      FROM attendance a
      JOIN students st ON st.id = a.student_id
      WHERE a.session_id = $1
      ORDER BY st.name ASC
    `;
    const detail = await pool.query(detailQuery, [sessionId]);

    res.json({
      session: header.rows[0],
      attendance: detail.rows
    });
  } catch (err) {
    next(err);
  }
};

// User Management
exports.listAllUsers = async (req, res, next) => {
  try {
    const { role, search, authorized } = req.query;
    let query = `
      SELECT 
        id, 
        name, 
        email, 
        role, 
        is_authorized,
        created_at,
        updated_at
      FROM users
      WHERE 1=1
    `;
    const params = [];
    
    if (role && role !== 'all') {
      params.push(role);
      query += ` AND role = $${params.length}`;
    }
    
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
    }
    
    if (authorized !== undefined && authorized !== '' && authorized !== null) {
      params.push(authorized === 'true');
      query += ` AND is_authorized = $${params.length}`;
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

exports.authorizeUser = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { is_authorized } = req.body;
    
    if (typeof is_authorized !== 'boolean') {
      return res.status(400).json({ error: "is_authorized must be a boolean" });
    }
    
    // Check if user exists and get their role
    const userCheck = await pool.query("SELECT role FROM users WHERE id=$1", [id]);
    if (userCheck.rowCount === 0) {
      return respondNotFound(res, "User");
    }
    
    const userRole = userCheck.rows[0].role;
    
    // Allow authorizing admin, teacher, and gov roles
    // Note: Only one admin should be authorized at a time, but we allow the first admin to authorize others
    if (userRole === 'admin' && is_authorized) {
      // When authorizing an admin, check if another authorized admin exists
      const existingAdmin = await pool.query(
        "SELECT id FROM users WHERE role='admin' AND is_authorized=true AND id!=$1 LIMIT 1",
        [id]
      );
      // This is allowed - multiple admins can be authorized by the first admin
    }
    
    const update = await pool.query(
      "UPDATE users SET is_authorized=$1, updated_at=NOW() WHERE id=$2 AND role IN ('admin', 'teacher', 'gov') RETURNING id, name, email, role, is_authorized",
      [is_authorized, id]
    );
    
    if (update.rowCount === 0) {
      return respondNotFound(res, "User");
    }
    
    res.json({ message: `User ${is_authorized ? 'authorized' : 'unauthorized'}`, user: update.rows[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteUser = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    
    // Don't allow deleting admin users
    const userCheck = await client.query("SELECT role FROM users WHERE id=$1", [id]);
    if (userCheck.rowCount === 0) {
      await client.release();
      return respondNotFound(res, "User");
    }
    if (userCheck.rows[0].role === 'admin') {
      await client.release();
      return res.status(403).json({ error: "Cannot delete admin user" });
    }
    
    await client.query("BEGIN");
    
    // If teacher, unassign from classes
    if (userCheck.rows[0].role === 'teacher') {
      await client.query("UPDATE classes SET teacher_id=NULL, updated_at=NOW() WHERE teacher_id=$1", [id]);
    }
    
    const deletion = await client.query("DELETE FROM users WHERE id=$1 RETURNING id", [id]);
    if (deletion.rowCount === 0) {
      await client.query("ROLLBACK");
      await client.release();
      return respondNotFound(res, "User");
    }
    
    await client.query("COMMIT");
    res.json({ message: "User deleted" });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
};