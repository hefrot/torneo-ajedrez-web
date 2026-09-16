import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {createPortalAccount} from '../src/student-portal-access.js';
import {seedAllCurriculum} from '../src/curriculum.js';
import {seedHmenaFramework,mapLegacyToHmena} from '../src/hmena-curriculum.js';
import {seedDiagnostic0800,startDiagnostic0800,submitDiagnosticAnswer} from '../src/diagnostic.js';

function setup(){
  const db=openDatabase(':memory:');
  seedAllCurriculum(db);seedHmenaFramework(db);mapLegacyToHmena(db);seedDiagnostic0800(db);
  const student=createStudent(db,{displayName:'Evidence Student'});
  const portal=createPortalAccount(db,{studentIds:[student.id],displayName:'Family'});
  return {db,student,portal};
}
test('diagnostic correct answers create practice evidence, never mastery',()=>{
  const {db,student,portal}=setup();
  const {attemptId}=startDiagnostic0800(db,{accountId:portal.accountId,studentId:student.id,locale:'en'});
  const items=db.prepare("SELECT id,correct_answer AS correctAnswer FROM diagnostic_items WHERE stage='foundations' ORDER BY sequence_no").all();
  for(const item of items)submitDiagnosticAnswer(db,{accountId:portal.accountId,attemptId,itemId:item.id,answerKey:item.correctAnswer});
  const rows=db.prepare(`SELECT ss.status,ss.confidence,ss.evidence_json AS evidenceJson FROM student_skills ss JOIN curriculum_skills cs ON cs.id=ss.skill_id WHERE ss.student_id=? AND cs.code LIKE 'FND-%'`).all(student.id);
  assert.ok(rows.length>=10);assert.ok(rows.every(r=>r.status==='practicing'));
  assert.ok(rows.every(r=>r.confidence===60));
  assert.ok(rows.every(r=>JSON.parse(r.evidenceJson).diagnostic?.correct===true));
  db.close();
});

test('diagnostic does not downgrade stronger prior evidence',()=>{
  const {db,student,portal}=setup();
  const skill=db.prepare("SELECT id FROM curriculum_skills WHERE code='FND-BOARD'").get();
  db.prepare("INSERT INTO student_skills(student_id,skill_id,status,confidence,evidence_json) VALUES (?,?,'drill_mastered',95,'{}')").run(student.id,skill.id);
  const {attemptId}=startDiagnostic0800(db,{accountId:portal.accountId,studentId:student.id});
  const items=db.prepare("SELECT id,correct_answer AS correctAnswer FROM diagnostic_items WHERE stage='foundations' ORDER BY sequence_no").all();
  for(const item of items)submitDiagnosticAnswer(db,{accountId:portal.accountId,attemptId,itemId:item.id,answerKey:item.correctAnswer==='A'?'B':'A'});
  const row=db.prepare('SELECT status,confidence FROM student_skills WHERE student_id=? AND skill_id=?').get(student.id,skill.id);
  assert.equal(row.status,'drill_mastered');assert.equal(row.confidence,95);
  db.close();
});
