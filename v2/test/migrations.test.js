import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import Database from 'better-sqlite3';
import {openDatabase} from '../src/db.js';

test('legacy academic database upgrades before track index is created',()=>{
  const dir=mkdtempSync(join(tmpdir(),'chess-migrate-'));
  const path=join(dir,'legacy.sqlite');
  const legacy=new Database(path);
  legacy.exec(`CREATE TABLE curriculum_skills (
    id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
    domain TEXT NOT NULL, rating_min INTEGER, rating_max INTEGER,
    prerequisites_json TEXT NOT NULL DEFAULT '[]', mastery_criteria TEXT,
    active INTEGER NOT NULL DEFAULT 1
  )`);
  legacy.close();
  const db=openDatabase(path);
  const columns=db.prepare('PRAGMA table_info(curriculum_skills)').all().map(r=>r.name);
  assert.ok(columns.includes('track_id'));
  const indexes=db.prepare("PRAGMA index_list(curriculum_skills)").all().map(r=>r.name);
  assert.ok(indexes.includes('idx_curriculum_skills_track'));
  db.close(); rmSync(dir,{recursive:true,force:true});
});
