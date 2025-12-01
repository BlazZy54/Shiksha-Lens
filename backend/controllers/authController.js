const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields required" });
    }
    const hashed = await bcrypt.hash(password, 10);
    
    // Check if admin already exists when registering as admin
    let isAuthorized;
    if (role === 'admin') {
      const adminCheck = await pool.query(
        "SELECT id FROM users WHERE role='admin' AND is_authorized=true LIMIT 1"
      );
      // If an authorized admin exists, new admin needs approval
      isAuthorized = adminCheck.rowCount === 0;
    } else if (role === 'student') {
      // Students are auto-authorized
      isAuthorized = true;
    } else {
      // Teacher and gov need admin approval
      isAuthorized = false;
    }
    
    await pool.query(
      "INSERT INTO users (name, email, password, role, is_authorized) VALUES ($1,$2,$3,$4,$5)",
      [name, email, hashed, role, isAuthorized]
    );
    
    const requiresApproval = !isAuthorized;
    res.status(201).json({ 
      message: requiresApproval
        ? "Registered. Waiting for admin approval." 
        : "Registered",
      requires_approval: requiresApproval
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const q = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
    if (q.rows.length === 0) return res.status(404).json({ error: "User not found" });
    const user = q.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    
    // Check authorization for teacher, gov, and admin roles
    if (!user.is_authorized && (user.role === 'teacher' || user.role === 'gov' || user.role === 'admin')) {
      return res.status(403).json({ error: "Account pending admin approval. Please wait for authorization." });
    }
    
    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );
    res.json({ token });
  } catch (err) {
    next(err);
  }
};