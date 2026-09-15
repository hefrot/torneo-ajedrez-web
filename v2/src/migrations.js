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
