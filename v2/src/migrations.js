const hasColumn=(db,table,column)=>db.prepare(`PRAGMA table_info(${table})`).all().some(row=>row.name===column);

const migrations=[
  {
    id:'academic-tracks-v1',
    run(db){
      db.exec(`CREATE TABLE IF NOT EXISTS curriculum_tracks (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        stage TEXT,
        age_range TEXT,
        lesson_count INTEGER,
        default_duration_minutes INTEGER,
        main_focus TEXT,
        sequence_no INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
      )`);
      if(!hasColumn(db,'curriculum_skills','track_id')){
        db.exec('ALTER TABLE curriculum_skills ADD COLUMN track_id TEXT REFERENCES curriculum_tracks(id) ON DELETE SET NULL');
      }
      db.exec('CREATE INDEX IF NOT EXISTS idx_curriculum_skills_track ON curriculum_skills(track_id,active)');
    }
  },
  {
    id:'academic-frameworks-v2',
    run(db){
      db.exec(`CREATE TABLE IF NOT EXISTS curriculum_frameworks (
        id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL, version TEXT,
        description TEXT, canonical INTEGER NOT NULL DEFAULT 0 CHECK(canonical IN (0,1)),
        active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
      if(!hasColumn(db,'curriculum_tracks','framework_id')) db.exec('ALTER TABLE curriculum_tracks ADD COLUMN framework_id TEXT REFERENCES curriculum_frameworks(id) ON DELETE SET NULL');
      if(!hasColumn(db,'curriculum_tracks','rating_min')) db.exec('ALTER TABLE curriculum_tracks ADD COLUMN rating_min INTEGER');
      if(!hasColumn(db,'curriculum_tracks','rating_max')) db.exec('ALTER TABLE curriculum_tracks ADD COLUMN rating_max INTEGER');
      if(!hasColumn(db,'curriculum_tracks','track_kind')) db.exec("ALTER TABLE curriculum_tracks ADD COLUMN track_kind TEXT NOT NULL DEFAULT 'legacy' CHECK(track_kind IN ('legacy','band','specialty'))");
      if(!hasColumn(db,'curriculum_skills','sequence_no')) db.exec('ALTER TABLE curriculum_skills ADD COLUMN sequence_no INTEGER NOT NULL DEFAULT 0');
      db.exec(`CREATE TABLE IF NOT EXISTS curriculum_skill_mappings (
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
        confidence INTEGER CHECK(confidence BETWEEN 0 AND 100), note TEXT,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(student_id,framework_id)
      );
      CREATE INDEX IF NOT EXISTS idx_curriculum_tracks_framework ON curriculum_tracks(framework_id,sequence_no);
      CREATE INDEX IF NOT EXISTS idx_curriculum_skills_track_sequence ON curriculum_skills(track_id,sequence_no);
      CREATE INDEX IF NOT EXISTS idx_skill_mappings_target ON curriculum_skill_mappings(target_skill_id);
      CREATE INDEX IF NOT EXISTS idx_student_placements_track ON student_curriculum_placements(track_id);`);
    }
  },
  {
    id:'academic-portal-access-v3',
    run(db){
      db.exec(`CREATE TABLE IF NOT EXISTS portal_accounts (id TEXT PRIMARY KEY,login_name TEXT NOT NULL UNIQUE COLLATE NOCASE,display_name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('guardian','student')),status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS portal_account_students (account_id TEXT NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,PRIMARY KEY(account_id,student_id));
      CREATE TABLE IF NOT EXISTS portal_access_codes (id TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,code_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,expires_at TEXT,last_used_at TEXT,revoked_at TEXT);
      CREATE TABLE IF NOT EXISTS portal_sessions (id TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES portal_accounts(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL,expires_at TEXT NOT NULL,last_used_at TEXT,revoked_at TEXT);
      CREATE TABLE IF NOT EXISTS external_rating_snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT,account_id TEXT NOT NULL REFERENCES player_accounts(id) ON DELETE CASCADE,player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,platform TEXT NOT NULL CHECK(platform IN ('lichess','chesscom')),rating_type TEXT NOT NULL,rating INTEGER NOT NULL,games_count INTEGER,snapshot_date TEXT NOT NULL,captured_at TEXT NOT NULL,UNIQUE(account_id,rating_type,snapshot_date));
      CREATE INDEX IF NOT EXISTS idx_portal_students_student ON portal_account_students(student_id);
      CREATE INDEX IF NOT EXISTS idx_portal_sessions_account ON portal_sessions(account_id,revoked_at,expires_at);
      CREATE INDEX IF NOT EXISTS idx_external_ratings_player_time ON external_rating_snapshots(player_id,rating_type,captured_at);`);
    }
  }
,
  {
    id:'academic-i18n-v4',
    run(db){
      if(!hasColumn(db,'students','preferred_locale')) db.exec("ALTER TABLE students ADD COLUMN preferred_locale TEXT CHECK(preferred_locale IN ('en','es'))");
      if(!hasColumn(db,'programs','instruction_locale')) db.exec("ALTER TABLE programs ADD COLUMN instruction_locale TEXT NOT NULL DEFAULT 'en' CHECK(instruction_locale IN ('en','es','bilingual'))");
      if(!hasColumn(db,'class_sessions','instruction_locale')) db.exec("ALTER TABLE class_sessions ADD COLUMN instruction_locale TEXT CHECK(instruction_locale IN ('en','es','bilingual'))");
      if(!hasColumn(db,'portal_accounts','preferred_locale')) db.exec("ALTER TABLE portal_accounts ADD COLUMN preferred_locale TEXT NOT NULL DEFAULT 'en' CHECK(preferred_locale IN ('en','es'))");
      db.exec(`CREATE TABLE IF NOT EXISTS curriculum_localizations (
        entity_type TEXT NOT NULL CHECK(entity_type IN ('framework','track','skill','lesson')),
        entity_id TEXT NOT NULL,
        locale TEXT NOT NULL CHECK(locale IN ('en','es')),
        title TEXT,objective TEXT,description TEXT,content_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY(entity_type,entity_id,locale)
      );
      CREATE INDEX IF NOT EXISTS idx_curriculum_localizations_locale ON curriculum_localizations(locale,entity_type,entity_id);`);
    }
  },
  {
    id:'academic-diagnostic-v5',
    run(db){
      db.exec(`CREATE TABLE IF NOT EXISTS diagnostic_blueprints (id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,title TEXT NOT NULL,min_rating INTEGER,max_rating INTEGER,active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)));
      CREATE TABLE IF NOT EXISTS diagnostic_items (id TEXT PRIMARY KEY,blueprint_id TEXT NOT NULL REFERENCES diagnostic_blueprints(id) ON DELETE CASCADE,skill_id TEXT NOT NULL REFERENCES curriculum_skills(id) ON DELETE CASCADE,stage TEXT NOT NULL CHECK(stage IN ('foundations','development')),sequence_no INTEGER NOT NULL,correct_answer TEXT NOT NULL CHECK(correct_answer IN ('A','B','C','D')),active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),UNIQUE(blueprint_id,sequence_no));
      CREATE TABLE IF NOT EXISTS diagnostic_item_localizations (item_id TEXT NOT NULL REFERENCES diagnostic_items(id) ON DELETE CASCADE,locale TEXT NOT NULL CHECK(locale IN ('en','es')),prompt TEXT NOT NULL,options_json TEXT NOT NULL,PRIMARY KEY(item_id,locale));
      CREATE TABLE IF NOT EXISTS diagnostic_attempts (id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,blueprint_id TEXT NOT NULL REFERENCES diagnostic_blueprints(id) ON DELETE CASCADE,locale TEXT NOT NULL CHECK(locale IN ('en','es')),status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','completed','abandoned')),stage TEXT NOT NULL DEFAULT 'foundations' CHECK(stage IN ('foundations','development','completed')),started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,completed_at TEXT,foundations_score INTEGER,development_score INTEGER,placement_band_code TEXT,summary_json TEXT NOT NULL DEFAULT '{}');
      CREATE TABLE IF NOT EXISTS diagnostic_responses (attempt_id TEXT NOT NULL REFERENCES diagnostic_attempts(id) ON DELETE CASCADE,item_id TEXT NOT NULL REFERENCES diagnostic_items(id) ON DELETE CASCADE,answer_key TEXT NOT NULL CHECK(answer_key IN ('A','B','C','D')),correct INTEGER NOT NULL CHECK(correct IN (0,1)),answered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY(attempt_id,item_id));
      CREATE INDEX IF NOT EXISTS idx_diagnostic_attempts_student ON diagnostic_attempts(student_id,status,started_at);
      CREATE INDEX IF NOT EXISTS idx_diagnostic_items_stage ON diagnostic_items(blueprint_id,stage,sequence_no);`);
    }
  }
,
  {
    id:'academic-lesson-skills-v6',
    run(db){
      db.exec(`CREATE TABLE IF NOT EXISTS lesson_skills (
        lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        skill_id TEXT NOT NULL REFERENCES curriculum_skills(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'primary' CHECK(role IN ('primary','supporting','review')),
        sequence_no INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY(lesson_id,skill_id)
      );
      CREATE INDEX IF NOT EXISTS idx_lesson_skills_skill ON lesson_skills(skill_id,lesson_id);`);
    }
  }
,
  {
    id:'academic-training-intelligence-v7',
    run(db){
      db.exec(`CREATE TABLE IF NOT EXISTS student_game_reviews (
        id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL CHECK(source_type IN ('official','historical','external')),source_game_id TEXT NOT NULL,
        platform TEXT,played_at TEXT,result TEXT,opening_name TEXT,opening_eco TEXT,
        status TEXT NOT NULL DEFAULT 'ready' CHECK(status IN ('pending','ready','reviewed')),
        summary_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id,source_type,source_game_id));
      CREATE TABLE IF NOT EXISTS training_puzzles (
        id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        finding_id TEXT NOT NULL UNIQUE REFERENCES student_game_findings(id) ON DELETE CASCADE,
        skill_id TEXT REFERENCES curriculum_skills(id) ON DELETE SET NULL,fen TEXT NOT NULL,move_played TEXT,best_move TEXT,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','mastered','archived')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS training_puzzle_attempts (
        id TEXT PRIMARY KEY,puzzle_id TEXT NOT NULL REFERENCES training_puzzles(id) ON DELETE CASCADE,
        student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,answer_move TEXT,
        correct INTEGER NOT NULL CHECK(correct IN (0,1)),attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE INDEX IF NOT EXISTS idx_game_reviews_student_time ON student_game_reviews(student_id,played_at);
      CREATE INDEX IF NOT EXISTS idx_training_puzzles_student_status ON training_puzzles(student_id,status);
      CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_student_time ON training_puzzle_attempts(student_id,attempted_at);`);
    }
  }


  ,
  {
    id:'academic-game-sync-v8',
    run(db){
      db.exec(`CREATE TABLE IF NOT EXISTS academic_external_games (
        id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        account_id TEXT NOT NULL REFERENCES player_accounts(id) ON DELETE CASCADE,
        platform TEXT NOT NULL CHECK(platform IN ('lichess','chesscom')),external_game_id TEXT NOT NULL,url TEXT,played_at TEXT,
        student_color TEXT CHECK(student_color IN ('white','black')),student_result TEXT CHECK(student_result IN ('win','loss','draw','unknown')),
        rated INTEGER CHECK(rated IN (0,1)),time_class TEXT,time_control TEXT,opening_name TEXT,opening_eco TEXT,pgn TEXT,moves_uci TEXT,initial_fen TEXT,
        analysis_status TEXT NOT NULL DEFAULT 'pending' CHECK(analysis_status IN ('pending','analyzed','failed','skipped')),analysis_error TEXT,analysis_version TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(account_id,external_game_id));
      CREATE INDEX IF NOT EXISTS idx_academic_games_student_time ON academic_external_games(student_id,played_at);
      CREATE INDEX IF NOT EXISTS idx_academic_games_analysis ON academic_external_games(analysis_status,played_at);`);
    }
  }

  ,
  {
    id:'academic-finding-evidence-v9',
    run(db){
      if(!hasColumn(db,'student_game_findings','engine_cp_loss')) db.exec('ALTER TABLE student_game_findings ADD COLUMN engine_cp_loss INTEGER');
      if(!hasColumn(db,'student_game_findings','classifier_confidence')) db.exec('ALTER TABLE student_game_findings ADD COLUMN classifier_confidence REAL CHECK(classifier_confidence BETWEEN 0 AND 1)');
      if(!hasColumn(db,'student_game_findings','classifier_source')) db.exec('ALTER TABLE student_game_findings ADD COLUMN classifier_source TEXT');
      if(!hasColumn(db,'student_game_findings','ply')) db.exec('ALTER TABLE student_game_findings ADD COLUMN ply INTEGER');
      if(!hasColumn(db,'student_game_findings','move_number')) db.exec('ALTER TABLE student_game_findings ADD COLUMN move_number INTEGER');
    }
  }

,
  {
    id:'academic-next-lesson-v10',
    run(db){
      db.exec(`CREATE TABLE IF NOT EXISTS coach_lesson_decisions (
        id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        recommended_skill_id TEXT REFERENCES curriculum_skills(id) ON DELETE SET NULL,
        recommended_lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
        selected_skill_id TEXT REFERENCES curriculum_skills(id) ON DELETE SET NULL,
        selected_lesson_id TEXT REFERENCES lessons(id) ON DELETE SET NULL,
        algorithm_version TEXT NOT NULL, recommendation_score REAL, confidence INTEGER CHECK(confidence BETWEEN 0 AND 100),
        reasons_json TEXT NOT NULL DEFAULT '[]', context_json TEXT NOT NULL DEFAULT '{}',
        decision TEXT NOT NULL CHECK(decision IN ('accepted','overridden','dismissed')), coach_note TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_coach_lesson_decisions_student_time ON coach_lesson_decisions(student_id,created_at);`);
    }
  }

,
  {
    id:'academic-session-lesson-tier-v11',
    run(db){
      if(!hasColumn(db,'session_lessons','cohort_tier')) db.exec('ALTER TABLE session_lessons ADD COLUMN cohort_tier TEXT');
      db.exec('CREATE INDEX IF NOT EXISTS idx_session_lessons_tier ON session_lessons(session_id,cohort_tier,sequence_no)');
    }
  }

,
  {
    id:'academic-diagnostic-entry-v12',
    run(db){
      if(!hasColumn(db,'diagnostic_attempts','entry_stage')) db.exec("ALTER TABLE diagnostic_attempts ADD COLUMN entry_stage TEXT NOT NULL DEFAULT 'foundations' CHECK(entry_stage IN ('foundations','development'))");
      if(!hasColumn(db,'diagnostic_attempts','entry_basis')) db.exec("ALTER TABLE diagnostic_attempts ADD COLUMN entry_basis TEXT NOT NULL DEFAULT 'standard' CHECK(entry_basis IN ('standard','rating_seed','coach'))");
      if(!hasColumn(db,'diagnostic_attempts','entry_evidence_json')) db.exec("ALTER TABLE diagnostic_attempts ADD COLUMN entry_evidence_json TEXT NOT NULL DEFAULT '{}'");
    }
  }

,
  {
    id:'academic-review2-safety-v13',
    run(db){
      if(!hasColumn(db,'external_rating_snapshots','rating_deviation')) db.exec('ALTER TABLE external_rating_snapshots ADD COLUMN rating_deviation REAL');
      if(!hasColumn(db,'external_rating_snapshots','provisional')) db.exec('ALTER TABLE external_rating_snapshots ADD COLUMN provisional INTEGER CHECK(provisional IN (0,1))');
      if(!hasColumn(db,'student_game_findings','solution_margin_cp')) db.exec('ALTER TABLE student_game_findings ADD COLUMN solution_margin_cp INTEGER');
      if(!hasColumn(db,'training_puzzles','solution_margin_cp')) db.exec('ALTER TABLE training_puzzles ADD COLUMN solution_margin_cp INTEGER');
      if(!hasColumn(db,'diagnostic_items','is_anchor')) db.exec('ALTER TABLE diagnostic_items ADD COLUMN is_anchor INTEGER NOT NULL DEFAULT 0 CHECK(is_anchor IN (0,1))');
      if(!hasColumn(db,'diagnostic_items','fen')) db.exec('ALTER TABLE diagnostic_items ADD COLUMN fen TEXT');
      db.exec(`DROP VIEW IF EXISTS v_public_league_accounts;
      CREATE VIEW v_public_league_accounts AS
      SELECT p.id,p.name,p.registration_status,p.availability,p.last_activity_at,a.platform,a.username,a.verified_at,a.verification_source
      FROM players p JOIN player_accounts a ON a.player_id=p.id
      WHERE p.registration_status='registered' AND a.account_status='verified' AND a.verified_at IS NOT NULL;`);
    }
  }

,
  {
    id:'academic-progress-reports-v14',
    run(db){
      db.exec(`CREATE TABLE IF NOT EXISTS progress_reports (
        id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        period_start TEXT NOT NULL,period_end TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
        snapshot_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,published_at TEXT);
      CREATE INDEX IF NOT EXISTS idx_progress_reports_student_time ON progress_reports(student_id,status,period_end);`);
    }
  }

,
  {
    id:'cis-bot-arena-v15',
    run(db){
      db.exec(`CREATE TABLE IF NOT EXISTS cis_bot_profiles (
        id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,name_en TEXT NOT NULL,name_es TEXT NOT NULL,target_level INTEGER NOT NULL,sequence_no INTEGER NOT NULL,config_json TEXT NOT NULL DEFAULT '{}',skill_focus_json TEXT NOT NULL DEFAULT '[]',active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)));
      CREATE TABLE IF NOT EXISTS cis_bot_challenges (
        id TEXT PRIMARY KEY,student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,bot_id TEXT NOT NULL REFERENCES cis_bot_profiles(id) ON DELETE RESTRICT,status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','passed','failed','abandoned')),games_required INTEGER NOT NULL DEFAULT 3,points REAL NOT NULL DEFAULT 0,started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,completed_at TEXT,summary_json TEXT NOT NULL DEFAULT '{}');
      CREATE TABLE IF NOT EXISTS cis_bot_games (
        id TEXT PRIMARY KEY,challenge_id TEXT NOT NULL REFERENCES cis_bot_challenges(id) ON DELETE CASCADE,game_no INTEGER NOT NULL,student_color TEXT NOT NULL CHECK(student_color IN ('white','black')),status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','completed','abandoned')),fen TEXT NOT NULL,moves_uci TEXT NOT NULL DEFAULT '',result TEXT,pgn TEXT,analysis_json TEXT NOT NULL DEFAULT '{}',started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,completed_at TEXT,UNIQUE(challenge_id,game_no));
      CREATE INDEX IF NOT EXISTS idx_cis_bot_challenges_student ON cis_bot_challenges(student_id,started_at);
      CREATE INDEX IF NOT EXISTS idx_cis_bot_games_challenge ON cis_bot_games(challenge_id,game_no);`);
    }
  }

,
  {
    id:'staff-auth-v16',
    run(db){
      db.exec(`CREATE TABLE IF NOT EXISTS staff_accounts (
        id TEXT PRIMARY KEY,login_name TEXT NOT NULL UNIQUE COLLATE NOCASE,display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','coach')),password_salt TEXT NOT NULL,password_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS staff_sessions (
        id TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,token_hash TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,expires_at TEXT NOT NULL,last_used_at TEXT,revoked_at TEXT);
      CREATE INDEX IF NOT EXISTS idx_staff_sessions_account ON staff_sessions(account_id,revoked_at,expires_at);`);
    }
  }

];
export function runMigrations(db){
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const applied=db.prepare('SELECT 1 FROM schema_migrations WHERE id=?');
  const mark=db.prepare('INSERT INTO schema_migrations(id) VALUES (?)');
  for(const migration of migrations){
    if(applied.get(migration.id))continue;
    db.transaction(()=>{migration.run(db);mark.run(migration.id);})();
  }
}
