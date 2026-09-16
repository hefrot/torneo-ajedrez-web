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
