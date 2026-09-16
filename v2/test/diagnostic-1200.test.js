import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {seedHmenaFramework,placeStudentInHmena} from '../src/hmena-curriculum.js';
import {createStudent} from '../src/academic.js';
import {createPortalAccount} from '../src/student-portal-access.js';
import {seedDiagnostic1200,startDiagnostic1200,diagnostic1200State,submitDiagnostic1200Answer} from '../src/diagnostic-1200.js';

function setup(){const db=openDatabase(':memory:');seedHmenaFramework(db);seedDiagnostic1200(db);const student=createStudent(db,{displayName:'Competitive Student'});placeStudentInHmena(db,{studentId:student.id,bandCode:'hmena-800-1200'});const portal=createPortalAccount(db,{studentIds:[student.id],displayName:'Family'});return {db,student,portal};}
function run(db,portal,student,correct=true){const start=startDiagnostic1200(db,{accountId:portal.accountId,studentId:student.id,locale:'en'});let result;while(true){const state=diagnostic1200State(db,{accountId:portal.accountId,attemptId:start.attemptId,locale:'en'});if(state.status==='completed')break;const item=db.prepare('SELECT correct_answer AS a FROM diagnostic_items WHERE id=?').get(state.item.id);const answer=correct?item.a:(item.a==='A'?'B':'A');result=submitDiagnostic1200Answer(db,{accountId:portal.accountId,attemptId:start.attemptId,itemId:state.item.id,answerKey:answer});if(result?.completed)break;}return result;}
test('passing 800-1200 diagnostic advances placement to 1200-1600',()=>{
  const {db,student,portal}=setup();const result=run(db,portal,student,true);
  assert.equal(result.completed,true);assert.equal(result.placementBandCode,'hmena-1200-1600');assert.equal(result.summary.competitiveFundamentals.percent,100);
  const placement=db.prepare(`SELECT t.code FROM student_curriculum_placements p JOIN curriculum_tracks t ON t.id=p.track_id WHERE p.student_id=?`).get(student.id);assert.equal(placement.code,'hmena-1200-1600');
  const mastered=db.prepare(`SELECT COUNT(*) AS n FROM student_skills ss JOIN curriculum_skills cs ON cs.id=ss.skill_id WHERE ss.student_id=? AND cs.code LIKE 'CMP-%' AND ss.status='practicing'`).get(student.id).n;assert.equal(mastered,12);db.close();
});

test('failing 800-1200 diagnostic keeps student in band with targeted gaps',()=>{
  const {db,student,portal}=setup();const result=run(db,portal,student,false);
  assert.equal(result.completed,true);assert.equal(result.placementBandCode,'hmena-800-1200');assert.equal(result.summary.gaps.length,12);
  const placement=db.prepare(`SELECT t.code FROM student_curriculum_placements p JOIN curriculum_tracks t ON t.id=p.track_id WHERE p.student_id=?`).get(student.id);assert.equal(placement.code,'hmena-800-1200');db.close();
});
