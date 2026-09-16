import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {familyJourney} from '../src/family-journey.js';

const setup=()=>{const db=openDatabase(':memory:');const student=createStudent(db,{displayName:'Pilot Kid'});return {db,student};};

test('family journey starts with assessment and advances from real evidence',()=>{
  const {db,student}=setup();
  let j=familyJourney(db,student.id);assert.equal(j.completed,0);assert.equal(j.mission.kind,'assessment');
  db.prepare("INSERT INTO diagnostic_blueprints(id,code,title,min_rating,max_rating) VALUES ('B1','b1','B1',0,800)").run();
  db.prepare("INSERT INTO diagnostic_attempts(id,student_id,blueprint_id,locale,status,stage,entry_stage,entry_basis,completed_at) VALUES ('D1',?,'B1','en','completed','completed','foundations','standard',CURRENT_TIMESTAMP)").run(student.id);
  j=familyJourney(db,student.id);assert.equal(j.mission.kind,'practice');
  db.prepare("INSERT INTO assignments(id,student_id,title,status) VALUES ('A1',?,'CIS Practice · Forks','submitted')").run(student.id);
  j=familyJourney(db,student.id);assert.equal(j.mission.kind,'bot');
  db.prepare("INSERT INTO cis_bot_profiles(id,code,name_en,name_es,target_level,sequence_no) VALUES ('BOT1','pilot','Pilot','Piloto',400,1)").run();
  db.prepare("INSERT INTO cis_bot_challenges(id,student_id,bot_id,status,completed_at) VALUES ('C1',?,'BOT1','failed',CURRENT_TIMESTAMP)").run(student.id);
  j=familyJourney(db,student.id);assert.equal(j.mission.kind,'coach');
  db.prepare("INSERT INTO coach_lesson_decisions(id,student_id,algorithm_version,decision) VALUES ('CL1',?,'test','accepted')").run(student.id);
  j=familyJourney(db,student.id);assert.equal(j.mission.kind,'report');
  db.prepare("INSERT INTO progress_reports(id,student_id,period_start,period_end,status,snapshot_json,published_at) VALUES ('R1',?,'2026-09-01','2026-09-30','published','{}',CURRENT_TIMESTAMP)").run(student.id);
  j=familyJourney(db,student.id);assert.equal(j.completed,5);assert.equal(j.percent,100);assert.equal(j.mission.kind,'done');
  db.close();
});

test('family journey localizes mission copy',()=>{
  const {db,student}=setup();
  const j=familyJourney(db,student.id,{locale:'es'});
  assert.match(j.mission.title,/nivel/i);assert.equal(j.total,5);db.close();
});
