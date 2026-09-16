import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {createPortalAccount} from '../src/student-portal-access.js';
import {seedHmenaFramework,placeStudentInHmena,setHmenaSkillStatus} from '../src/hmena-curriculum.js';
import {seedHmenaCourse0800} from '../src/hmena-course.js';
import {recordCoachLessonDecision} from '../src/next-lesson-engine.js';
import {studentPortalDashboard} from '../src/student-portal.js';

test('family portal receives approved plan but not private coach decision note',()=>{
  const db=openDatabase(':memory:');seedHmenaFramework(db);seedHmenaCourse0800(db);
  const student=createStudent(db,{displayName:'Portal Plan Student'});placeStudentInHmena(db,{studentId:student.id,bandCode:'hmena-0-400'});
  setHmenaSkillStatus(db,{studentId:student.id,skillCode:'FND-BOARD',status:'practicing'});
  const portal=createPortalAccount(db,{studentIds:[student.id],displayName:'Family',preferredLocale:'en'});
  recordCoachLessonDecision(db,{studentId:student.id,decision:'accepted',coachNote:'PRIVATE COACH NOTE',locale:'en'});
  const data=studentPortalDashboard(db,portal.accountId);assert.ok(data.students[0].nextPlan);assert.equal('coachNote' in data.students[0].nextPlan,false);assert.equal(JSON.stringify(data).includes('PRIVATE COACH NOTE'),false);db.close();
});
