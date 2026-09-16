import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {syncPracticeMissions,submitPracticeMission,setPracticeMissionStatus} from '../src/practice-plan.js';

const training={topLeaks:[
  {skillId:null,skillCode:'DEV-HANGING',findingType:'missed_capture'},
  {skillId:null,skillCode:'DEV-CCT',findingType:'missed_forcing_move'},
  {skillId:null,skillCode:'DEV-FORK',findingType:'missed_fork'},
  {skillId:null,skillCode:'DEV-HANGING',findingType:'engine_blunder'}
]};

test('practice plan creates three idempotent Lichess missions from real leak themes',()=>{
  const db=openDatabase(':memory:');const s=createStudent(db,{displayName:'Kid'});
  const first=syncPracticeMissions(db,s.id,{locale:'en',training});
  const second=syncPracticeMissions(db,s.id,{locale:'en',training});
  assert.equal(first.length,3);assert.equal(second.length,3);
  assert.deepEqual(first.map(x=>x.url).sort(),['https://lichess.org/training/fork','https://lichess.org/training/hangingPiece','https://lichess.org/training/themes'].sort());
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM assignments WHERE student_id=?").get(s.id).n,3);db.close();
});
test('student submission is scoped and coach can confirm completion',()=>{
  const db=openDatabase(':memory:');const a=createStudent(db,{displayName:'A'}),b=createStudent(db,{displayName:'B'});
  const mission=syncPracticeMissions(db,a.id,{locale:'en',training})[0];
  assert.throws(()=>submitPracticeMission(db,{studentId:b.id,assignmentId:mission.id}),/not found/);
  const submitted=submitPracticeMission(db,{studentId:a.id,assignmentId:mission.id});
  assert.equal(submitted.status,'submitted');
  const completed=setPracticeMissionStatus(db,{assignmentId:mission.id,status:'completed'});
  assert.equal(completed.status,'completed');
  assert.equal(db.prepare('SELECT status FROM assignments WHERE id=?').get(mission.id).status,'completed');db.close();
});