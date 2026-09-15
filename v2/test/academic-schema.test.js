import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';

const expectedTables=[
  'students','guardians','student_guardians','schools','programs','enrollments',
  'class_sessions','attendance','curriculum_tracks','curriculum_skills','student_skills','lessons',
  'session_lessons','assignments','assessments','coach_notes','student_game_findings'
];

test('academic schema loads alongside league schema',()=>{
  const db=openDatabase(':memory:');
  const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row=>row.name));
  for(const name of expectedTables)assert.ok(tables.has(name),`missing table ${name}`);
  assert.ok(tables.has('players'));
  db.close();
});

test('student can belong to a school program without a platform account',()=>{
  const db=openDatabase(':memory:');
  db.prepare("INSERT INTO students(id,display_name,current_level) VALUES ('S1','Student One',400)").run();
  db.prepare("INSERT INTO schools(id,name) VALUES ('SC1','Example School')").run();
  db.prepare("INSERT INTO programs(id,school_id,name,program_type,planned_weeks) VALUES ('P1','SC1','Fall Chess','school',12)").run();
  db.prepare("INSERT INTO enrollments(id,program_id,student_id) VALUES ('E1','P1','S1')").run();
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM enrollments').get().n,1);
  assert.equal(db.prepare('SELECT player_id FROM students WHERE id=?').get('S1').player_id,null);
  db.close();
});

test('academic telemetry and curriculum graph constraints are available',()=>{
  const db=openDatabase(':memory:');
  const columns=table=>new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(row=>row.name));
  assert.ok(columns('enrollments').has('cohort_tier'));
  assert.ok(columns('attendance').has('comprehension_score'));
  assert.ok(columns('attendance').has('engagement_flag'));
  assert.ok(columns('session_lessons').has('delivery_stage'));
  assert.ok(columns('assignments').has('skill_id'));
  assert.ok(columns('student_game_findings').has('fen_before'));
  assert.ok(columns('student_game_findings').has('move_played'));
  assert.ok(columns('student_game_findings').has('best_move'));
  assert.ok(columns('coach_notes').has('visibility'));
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name='curriculum_skill_dependencies'").get().n,1);
  db.close();
});

test('academic migrations are idempotent and add curriculum track linkage',()=>{
  const db=openDatabase(':memory:');
  const columns=db.prepare("PRAGMA table_info(curriculum_skills)").all().map(row=>row.name);
  assert.ok(columns.includes('track_id'));
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM schema_migrations WHERE id='academic-tracks-v1'").get().n,1);
  db.close();
});
