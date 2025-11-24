const { Pool } = require("pg");

const isProd = process.env.NODE_ENV === "production";
const connectionString = process.env.DATABASE_URL;

const pool = new Pool(
  connectionString
    ? { connectionString, ssl: isProd ? { rejectUnauthorized: false } : false }
    : {
        user: process.env.PGUSER || "postgres",
        host: process.env.PGHOST || "localhost",
        database: process.env.PGDATABASE || "schooldata",
        password: process.env.PGPASSWORD || "postgres",
        port: parseInt(process.env.PGPORT || "5432", 10)
      }
);

pool.on("connect", () => console.log("📦 PostgreSQL connected"));

module.exports = pool;