CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  player_id TEXT UNIQUE REFERENCES players(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','inactive','archived')),
  age_band TEXT,
  school_grade TEXT,
  current_level INTEGER,
  target_level INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guardians (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  preferred_channel TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_guardians (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id TEXT NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  relationship TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK(is_primary IN (0,1)),
  PRIMARY KEY(student_id,guardian_id)
);

CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address_text TEXT,
  contact_name TEXT,
  contact_email TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  program_type TEXT NOT NULL CHECK(program_type IN ('private','group','school','camp','club')),
  start_date TEXT,
  end_date TEXT,
  planned_weeks INTEGER,
  status TEXT NOT NULL DEFAULT 'planned' CHECK(status IN ('planned','active','completed','cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','withdrawn')),
  joined_at TEXT,
  left_at TEXT,
  initial_level INTEGER,
  current_level INTEGER,
  UNIQUE(program_id,student_id)
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  week_no INTEGER,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled','no_show')),
  coach_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  session_id TEXT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')),
  note TEXT,
  PRIMARY KEY(session_id,student_id)
);

CREATE TABLE IF NOT EXISTS curriculum_skills (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  domain TEXT NOT NULL CHECK(domain IN ('fundamentals','tactics','calculation','strategy','openings','endgames','thinking','competition')),
  rating_min INTEGER,
  rating_max INTEGER,
  prerequisites_json TEXT NOT NULL DEFAULT '[]',
  mastery_criteria TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);

CREATE TABLE IF NOT EXISTS student_skills (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES curriculum_skills(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started','learning','independent','applied')),
  confidence INTEGER CHECK(confidence BETWEEN 0 AND 100),
  evidence_json TEXT NOT NULL DEFAULT '{}',
  last_assessed_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(student_id,skill_id)
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  skill_id TEXT REFERENCES curriculum_skills(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  objective TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  difficulty TEXT,
  content_json TEXT NOT NULL DEFAULT '{}',
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_lessons (
  session_id TEXT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(session_id,lesson_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  program_id TEXT REFERENCES programs(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES class_sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  details TEXT,
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK(status IN ('assigned','submitted','completed','waived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('initial','progress','final','game_review')),
  overall_level INTEGER,
  score_json TEXT NOT NULL DEFAULT '{}',
  coach_note TEXT,
  assessed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coach_notes (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  program_id TEXT REFERENCES programs(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES class_sessions(id) ON DELETE SET NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility IN ('private','guardian')),
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_game_findings (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK(source_type IN ('official','historical','external')),
  source_game_id TEXT NOT NULL,
  skill_id TEXT REFERENCES curriculum_skills(id) ON DELETE SET NULL,
  finding_type TEXT NOT NULL,
  severity INTEGER CHECK(severity BETWEEN 1 AND 5),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id,source_type,source_game_id,skill_id,finding_type)
);

CREATE INDEX IF NOT EXISTS idx_students_player ON students(player_id);
CREATE INDEX IF NOT EXISTS idx_programs_school_status ON programs(school_id,status);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id,status);
CREATE INDEX IF NOT EXISTS idx_sessions_program_start ON class_sessions(program_id,starts_at);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id,status);
CREATE INDEX IF NOT EXISTS idx_student_skills_status ON student_skills(student_id,status);
CREATE INDEX IF NOT EXISTS idx_assessments_student_time ON assessments(student_id,assessed_at);
CREATE INDEX IF NOT EXISTS idx_game_findings_student ON student_game_findings(student_id,created_at);
