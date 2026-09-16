import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {seedAllCurriculum} from '../src/curriculum.js';
import {seedHmenaFramework,mapLegacyToHmena} from '../src/hmena-curriculum.js';
import {seedCurriculumLocalizations} from '../src/curriculum-localization.js';
import {seedDiagnostic0800,startDiagnostic0800,diagnosticState,submitDiagnosticAnswer} from '../src/diagnostic.js';
import {createStudent} from '../src/academic.js';
import {createPortalAccount} from '../src/student-portal-access.js';

function setup(){
  const db=openDatabase(':memory:');seedAllCurriculum(db);seedHmenaFramework(db);mapLegacyToHmena(db);seedCurriculumLocalizations(db);seedDiagnostic0800(db);
  const student=createStudent(db,{displayName:'Diagnostic Student'});
  const portal=createPortalAccount(db,{studentIds:[student.id],displayName:'Family',preferredLocale:'en'});
  return {db,student,portal};
}
function wrong(correct){return correct==='A'?'B':'A';}
test('diagnostic localizes the same item without duplicating skill identity',()=>{
  const {db,student,portal}=setup();
  const start=startDiagnostic0800(db,{accountId:portal.accountId,studentId:student.id,locale:'en'});
  const en=diagnosticState(db,{accountId:portal.accountId,attemptId:start.attemptId,locale:'en'});
  const es=diagnosticState(db,{accountId:portal.accountId,attemptId:start.attemptId,locale:'es'});
  assert.equal(en.item.id,es.item.id);assert.equal(en.item.skillCode,'FND-BOARD');
  assert.notEqual(en.item.prompt,es.item.prompt);assert.equal(en.item.options[0],'e4');assert.equal(es.item.options[0],'e4');
  db.close();
});

test('diagnostic stops after Foundations when the base is weak',()=>{
  const {db,student,portal}=setup();
  const {attemptId}=startDiagnostic0800(db,{accountId:portal.accountId,studentId:student.id,locale:'en'});
  const items=db.prepare("SELECT id,correct_answer AS correctAnswer FROM diagnostic_items WHERE stage='foundations' ORDER BY sequence_no").all();
  let result=null;for(const item of items)result=submitDiagnosticAnswer(db,{accountId:portal.accountId,attemptId,itemId:item.id,answerKey:wrong(item.correctAnswer),locale:'en'});
  assert.equal(result.completed,true);assert.equal(result.placementBandCode,'hmena-0-400');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM diagnostic_responses WHERE attempt_id=?').get(attemptId).n,11);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM assessments WHERE student_id=? AND kind='initial'").get(student.id).n,1);
  db.close();
});
test('diagnostic advances to Development and marks 800+ readiness when both stages pass',()=>{
  const {db,student,portal}=setup();
  const {attemptId}=startDiagnostic0800(db,{accountId:portal.accountId,studentId:student.id,locale:'es'});
  const all=db.prepare("SELECT id,stage,correct_answer AS correctAnswer FROM diagnostic_items ORDER BY sequence_no").all();
  let result=null;for(const item of all)result=submitDiagnosticAnswer(db,{accountId:portal.accountId,attemptId,itemId:item.id,answerKey:item.correctAnswer,locale:'es'});
  assert.equal(result.completed,true);assert.equal(result.placementBandCode,'hmena-800-1200');assert.equal(result.summary.cleared0800,true);
  const placement=db.prepare(`SELECT t.code,p.placement_source AS source FROM student_curriculum_placements p JOIN curriculum_tracks t ON t.id=p.track_id WHERE p.student_id=?`).get(student.id);
  assert.equal(placement.code,'hmena-800-1200');assert.equal(placement.source,'assessment');
  assert.equal(result.summary.foundations.percent,100);assert.equal(result.summary.development.percent,100);
  db.close();
});
