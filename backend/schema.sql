
-- Core tables
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','teacher','student','gov')),
  is_authorized BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  roll TEXT UNIQUE NOT NULL,
  class_id INTEGER REFERENCES classes(id),
  embeddings JSONB,
  photo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT DEFAULT 'A',
  teacher_id INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_students (
  id SERIAL PRIMARY KEY,
  class_id INT REFERENCES classes(id) ON DELETE CASCADE,
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id SERIAL PRIMARY KEY,
  class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_time TIMESTAMP NOT NULL DEFAULT NOW(),
  photo_path TEXT,
  photo_url TEXT,
  python_response JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by_teacher_id INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present','absent','manual_present')),
  confidence FLOAT,
  confirmed_by_teacher_id INT NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, student_id)
);

-- Backward compatibility alterations
ALTER TABLE students
  ALTER COLUMN roll TYPE TEXT USING roll::TEXT;

ALTER TABLE classes
  ADD COLUMN IF NOT EXISTS section TEXT DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_authorized BOOLEAN DEFAULT false;

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id),
  ADD COLUMN IF NOT EXISTS embeddings JSONB,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Migration: Rename embedding to embeddings if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE students RENAME COLUMN embedding TO embeddings;
    -- Convert single embedding to array format for backward compatibility
    UPDATE students 
    SET embeddings = jsonb_build_array(embeddings)
    WHERE embeddings IS NOT NULL 
      AND jsonb_typeof(embeddings) != 'array';
  END IF;
END $$;

