CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  player_id TEXT UNIQUE REFERENCES players(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','inactive','archived')),
  age_band TEXT,
  school_grade TEXT,
  current_level INTEGER,
  target_level INTEGER,
  preferred_locale TEXT CHECK(preferred_locale IN ('en','es')),
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
  instruction_locale TEXT NOT NULL DEFAULT 'en' CHECK(instruction_locale IN ('en','es','bilingual')),
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
  cohort_tier TEXT,
  UNIQUE(program_id,student_id)
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  week_no INTEGER,
  title TEXT,
  instruction_locale TEXT CHECK(instruction_locale IN ('en','es','bilingual')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled','no_show')),
  coach_note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  session_id TEXT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')),
  note TEXT,
  comprehension_score INTEGER CHECK(comprehension_score BETWEEN 1 AND 5),
  engagement_flag TEXT CHECK(engagement_flag IN ('focused','distracted','disruptive')),
  PRIMARY KEY(session_id,student_id)
);

CREATE TABLE IF NOT EXISTS curriculum_frameworks (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  version TEXT,
  description TEXT,
  canonical INTEGER NOT NULL DEFAULT 0 CHECK(canonical IN (0,1)),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS curriculum_tracks (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  stage TEXT,
  age_range TEXT,
  lesson_count INTEGER,
  default_duration_minutes INTEGER,
  main_focus TEXT,
  sequence_no INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  framework_id TEXT REFERENCES curriculum_frameworks(id) ON DELETE SET NULL,
  rating_min INTEGER,
  rating_max INTEGER,
  track_kind TEXT NOT NULL DEFAULT 'legacy' CHECK(track_kind IN ('legacy','band','specialty'))
);

CREATE TABLE IF NOT EXISTS curriculum_skills (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  track_id TEXT REFERENCES curriculum_tracks(id) ON DELETE SET NULL,
  domain TEXT NOT NULL CHECK(domain IN ('fundamentals','tactics','calculation','strategy','openings','endgames','thinking','competition')),
  rating_min INTEGER,
  rating_max INTEGER,
  prerequisites_json TEXT NOT NULL DEFAULT '[]',
  mastery_criteria TEXT,
  sequence_no INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);



CREATE TABLE IF NOT EXISTS curriculum_skill_dependencies (
  skill_id TEXT NOT NULL REFERENCES curriculum_skills(id) ON DELETE CASCADE,
  prerequisite_skill_id TEXT NOT NULL REFERENCES curriculum_skills(id) ON DELETE CASCADE,
  dependency_type TEXT NOT NULL DEFAULT 'required' CHECK(dependency_type IN ('required','recommended')),
  PRIMARY KEY(skill_id,prerequisite_skill_id),
  CHECK(skill_id <> prerequisite_skill_id)
);

CREATE TABLE IF NOT EXISTS curriculum_skill_mappings (
  source_skill_id TEXT NOT NULL REFERENCES curriculum_skills(id) ON DELETE CASCADE,
  target_skill_id TEXT NOT NULL REFERENCES curriculum_skills(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'covers' CHECK(relation_type IN ('covers','reinforces','prerequisite')),
  weight REAL NOT NULL DEFAULT 1.0 CHECK(weight > 0 AND weight <= 1.0),
  PRIMARY KEY(source_skill_id,target_skill_id)
);

CREATE TABLE IF NOT EXISTS student_curriculum_placements (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  framework_id TEXT NOT NULL REFERENCES curriculum_frameworks(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES curriculum_tracks(id) ON DELETE RESTRICT,
  placement_source TEXT NOT NULL DEFAULT 'manual' CHECK(placement_source IN ('manual','assessment','rating','legacy_mapping','import')),
  confidence INTEGER CHECK(confidence BETWEEN 0 AND 100),
  note TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(student_id,framework_id)
);

CREATE TABLE IF NOT EXISTS student_skills (
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES curriculum_skills(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unseen' CHECK(status IN ('unseen','introduced','practicing','drill_mastered','applied_in_game','regressed')),
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
  delivery_stage TEXT NOT NULL DEFAULT 'theory_only' CHECK(delivery_stage IN ('theory_only','solved_exercises','practice_games','assessment_applied')),
  PRIMARY KEY(session_id,lesson_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
  program_id TEXT REFERENCES programs(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES class_sessions(id) ON DELETE SET NULL,
  skill_id TEXT REFERENCES curriculum_skills(id) ON DELETE SET NULL,
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
  visibility TEXT NOT NULL DEFAULT 'coach_only' CHECK(visibility IN ('coach_only','guardian_visible','school_visible')),
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
  fen_before TEXT,
  move_played TEXT,
  best_move TEXT,
  coach_annotation TEXT,
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

CREATE INDEX IF NOT EXISTS idx_skill_dependencies_prereq ON curriculum_skill_dependencies(prerequisite_skill_id);
CREATE INDEX IF NOT EXISTS idx_assignments_skill ON assignments(skill_id);




CREATE TABLE IF NOT EXISTS curriculum_localizations (
  entity_type TEXT NOT NULL CHECK(entity_type IN ('framework','track','skill','lesson')),
  entity_id TEXT NOT NULL,
  locale TEXT NOT NULL CHECK(locale IN ('en','es')),
  title TEXT,
  objective TEXT,
  description TEXT,
  content_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(entity_type,entity_id,locale)
);
CREATE INDEX IF NOT EXISTS idx_curriculum_localizations_locale ON curriculum_localizations(locale,entity_type,entity_id);

CREATE TABLE IF NOT EXISTS portal_accounts (
  id TEXT PRIMARY KEY,
  login_name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('guardian','student')),
  preferred_locale TEXT NOT NULL DEFAULT 'en' CHECK(preferred_locale IN ('en','es')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS portal_account_students (
  account_id TEXT NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY(account_id,student_id)
);
CREATE TABLE IF NOT EXISTS portal_access_codes (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, expires_at TEXT, last_used_at TEXT, revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS portal_sessions (
  id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, expires_at TEXT NOT NULL, last_used_at TEXT, revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS external_rating_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL REFERENCES player_accounts(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK(platform IN ('lichess','chesscom')),
  rating_type TEXT NOT NULL, rating INTEGER NOT NULL, games_count INTEGER,
  snapshot_date TEXT NOT NULL, captured_at TEXT NOT NULL,
  UNIQUE(account_id,rating_type,snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_portal_students_student ON portal_account_students(student_id);
CREATE INDEX IF NOT EXISTS idx_portal_sessions_account ON portal_sessions(account_id,revoked_at,expires_at);
CREATE INDEX IF NOT EXISTS idx_external_ratings_player_time ON external_rating_snapshots(player_id,rating_type,captured_at);

CREATE TABLE IF NOT EXISTS diagnostic_blueprints (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  min_rating INTEGER,
  max_rating INTEGER,
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE TABLE IF NOT EXISTS diagnostic_items (
  id TEXT PRIMARY KEY,
  blueprint_id TEXT NOT NULL REFERENCES diagnostic_blueprints(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES curriculum_skills(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK(stage IN ('foundations','development')),
  sequence_no INTEGER NOT NULL,
  correct_answer TEXT NOT NULL CHECK(correct_answer IN ('A','B','C','D')),
  active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  UNIQUE(blueprint_id,sequence_no)
);
CREATE TABLE IF NOT EXISTS diagnostic_item_localizations (
  item_id TEXT NOT NULL REFERENCES diagnostic_items(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK(locale IN ('en','es')),
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL,
  PRIMARY KEY(item_id,locale)
);CREATE TABLE IF NOT EXISTS diagnostic_attempts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  blueprint_id TEXT NOT NULL REFERENCES diagnostic_blueprints(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK(locale IN ('en','es')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','completed','abandoned')),
  stage TEXT NOT NULL DEFAULT 'foundations' CHECK(stage IN ('foundations','development','completed')),
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  foundations_score INTEGER,
  development_score INTEGER,
  placement_band_code TEXT,
  summary_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS diagnostic_responses (
  attempt_id TEXT NOT NULL REFERENCES diagnostic_attempts(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES diagnostic_items(id) ON DELETE CASCADE,
  answer_key TEXT NOT NULL CHECK(answer_key IN ('A','B','C','D')),
  correct INTEGER NOT NULL CHECK(correct IN (0,1)),
  answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(attempt_id,item_id)
);
CREATE INDEX IF NOT EXISTS idx_diagnostic_attempts_student ON diagnostic_attempts(student_id,status,started_at);
CREATE INDEX IF NOT EXISTS idx_diagnostic_items_stage ON diagnostic_items(blueprint_id,stage,sequence_no);
CREATE TABLE IF NOT EXISTS lesson_skills (
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES curriculum_skills(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'primary' CHECK(role IN ('primary','supporting','review')),
  sequence_no INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(lesson_id,skill_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_skills_skill ON lesson_skills(skill_id,lesson_id);
CREATE TABLE IF NOT EXISTS student_game_reviews (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK(source_type IN ('official','historical','external')),
  source_game_id TEXT NOT NULL,
  platform TEXT,
  played_at TEXT,
  result TEXT,
  opening_name TEXT,
  opening_eco TEXT,
  status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('pending','ready','reviewed')),
  summary_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id,source_type,source_game_id)
);
CREATE TABLE IF NOT EXISTS training_puzzles (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  finding_id TEXT NOT NULL UNIQUE REFERENCES student_game_findings(id) ON DELETE CASCADE,
  skill_id TEXT REFERENCES curriculum_skills(id) ON DELETE SET NULL,
  fen TEXT NOT NULL,
  move_played TEXT,
  best_move TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','mastered','archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS training_puzzle_attempts (
  id TEXT PRIMARY KEY,
  puzzle_id TEXT NOT NULL REFERENCES training_puzzles(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  answer_move TEXT,
  correct INTEGER NOT NULL CHECK(correct IN (0,1)),
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_game_reviews_student_time ON student_game_reviews(student_id,played_at);
CREATE INDEX IF NOT EXISTS idx_training_puzzles_student_status ON training_puzzles(student_id,status);
CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_student_time ON training_puzzle_attempts(student_id,attempted_at);
