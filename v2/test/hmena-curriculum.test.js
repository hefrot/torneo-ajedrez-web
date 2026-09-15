import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {seedAllCurriculum,recordLegacyLessonEvidence,recommendNextLegacyLesson} from '../src/curriculum.js';
import {seedHmenaFramework,mapLegacyToHmena,syncLegacyEvidenceToHmena,placeStudentInHmena,recommendLearningPriorities,hmenaOverview,setHmenaSkillStatus} from '../src/hmena-curriculum.js';

test('HMENA 0-2500 seeds seven canonical bands',()=>{
  const db=openDatabase(':memory:');
  seedHmenaFramework(db); seedHmenaFramework(db);
  const overview=hmenaOverview(db);
  assert.equal(overview.bands.length,7);
  assert.equal(overview.bands[0].bandCode,undefined);
  assert.equal(overview.bands[0].code,'hmena-0-400');
  assert.equal(overview.bands.at(-1).code,'hmena-2300-2500');
  assert.ok(overview.bands.reduce((n,b)=>n+b.skills,0)>=70);
  db.close();
});

test('legacy lesson evidence maps to HMENA without claiming mastery',()=>{
  const db=openDatabase(':memory:');
  seedAllCurriculum(db); mapLegacyToHmena(db);
  const student=createStudent(db,{displayName:'Louie HMENA'});
  for(let n=1;n<=7;n++)recordLegacyLessonEvidence(db,{studentId:student.id,trackCode:'seeds',lessonNumber:n,status:'introduced',evidence:{classStatus:'completed'}});
  syncLegacyEvidenceToHmena(db,student.id);
  const mapped=db.prepare("SELECT status FROM student_skills WHERE student_id=? AND skill_id='SKILL-HMENA-FND-MATE1'").get(student.id);
  assert.equal(mapped.status,'introduced');
  assert.match(recommendNextLegacyLesson(db,student.id,'seeds').title,/L8/);
  db.close();
});
test('placement and learning priorities are separate from next legacy lesson',()=>{
  const db=openDatabase(':memory:');
  seedAllCurriculum(db); mapLegacyToHmena(db);
  const student=createStudent(db,{displayName:'Herbert HMENA'});
  recordLegacyLessonEvidence(db,{studentId:student.id,trackCode:'builders',lessonNumber:1,status:'introduced',evidence:{classStatus:'completed'}});
  syncLegacyEvidenceToHmena(db,student.id);
  placeStudentInHmena(db,{studentId:student.id,bandCode:'hmena-400-800',source:'legacy_mapping',confidence:70});
  const result=recommendLearningPriorities(db,student.id,{limit:3});
  assert.equal(result.placement.bandCode,'hmena-400-800');
  assert.equal(result.needsAssessment,false);
  assert.ok(result.priorities.length>0);
  assert.match(recommendNextLegacyLesson(db,student.id,'builders').title,/L2/);
  db.close();
});

test('student without placement is flagged for assessment',()=>{
  const db=openDatabase(':memory:');
  seedHmenaFramework(db);
  const student=createStudent(db,{displayName:'Unplaced'});
  const result=recommendLearningPriorities(db,student.id);
  assert.equal(result.needsAssessment,true);
  assert.deepEqual(result.priorities,[]);
  db.close();
});
test('coach can update canonical HMENA skill status without touching legacy evidence',()=>{
  const db=openDatabase(':memory:');
  seedAllCurriculum(db); mapLegacyToHmena(db);
  const student=createStudent(db,{displayName:'Manual Progress'});
  placeStudentInHmena(db,{studentId:student.id,bandCode:'hmena-0-400'});
  setHmenaSkillStatus(db,{studentId:student.id,skillCode:'FND-BOARD',status:'drill_mastered',confidence:90,evidence:{note:'Coach check'}});
  const result=recommendLearningPriorities(db,student.id,{limit:3});
  assert.equal(result.priorities.some(p=>p.code==='FND-BOARD'&&p.status==='drill_mastered'),true);
  const legacyCount=db.prepare("SELECT COUNT(*) AS n FROM student_skills ss JOIN curriculum_skills cs ON cs.id=ss.skill_id WHERE ss.student_id=? AND cs.code LIKE 'SEEDS-%'").get(student.id).n;
  assert.equal(legacyCount,0);
  db.close();
});