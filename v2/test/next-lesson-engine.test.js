import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {seedHmenaFramework,placeStudentInHmena,setHmenaSkillStatus} from '../src/hmena-curriculum.js';
import {seedCurriculumLocalizations} from '../src/curriculum-localization.js';
import {seedHmenaCourse0800} from '../src/hmena-course.js';
import {nextLessonRecommendation,recordCoachLessonDecision,latestApprovedPlan} from '../src/next-lesson-engine.js';

function setup(band='hmena-400-800'){
  const db=openDatabase(':memory:');seedHmenaFramework(db);seedCurriculumLocalizations(db);seedHmenaCourse0800(db);
  const student=createStudent(db,{displayName:'Next Lesson Student'});if(band)placeStudentInHmena(db,{studentId:student.id,bandCode:band});
  return {db,student};
}
const master=(db,student,code)=>setHmenaSkillStatus(db,{studentId:student.id,skillCode:code,status:'drill_mastered',confidence:90});
const find=(db,student,code,n=1,severity=4)=>{const skill=db.prepare('SELECT id FROM curriculum_skills WHERE code=?').get(code);for(let i=0;i<n;i++)db.prepare(`INSERT INTO student_game_findings(id,student_id,source_type,source_game_id,skill_id,finding_type,severity,created_at) VALUES (?,?, 'external',?,?, 'missed_tactic',?,CURRENT_TIMESTAMP)`).run(`F-${code}-${i}`,student.id,`G-${code}-${i}`,skill.id,severity);};
test('student without placement is routed to diagnostic first',()=>{
  const {db,student}=setup(null);const rec=nextLessonRecommendation(db,student.id,{locale:'es'});
  assert.equal(rec.kind,'diagnostic');assert.equal(rec.recommendation,null);db.close();
});

test('unmet prerequisite outranks a more advanced repeated mistake',()=>{
  const {db,student}=setup();
  for(const code of ['FND-BOARD','FND-PIECES','FND-PAWNS','FND-LEGAL','FND-THINK','DEV-HANGING'])master(db,student,code);
  find(db,student,'DEV-FORK',3,5);
  const rec=nextLessonRecommendation(db,student.id,{locale:'en'});
  assert.equal(rec.recommendation.skill.code,'DEV-THREATS');
  assert.notEqual(rec.recommendation.skill.code,'DEV-FORK');db.close();
});

test('recurring game mistakes can make a ready skill the top lesson',()=>{
  const {db,student}=setup();
  for(const code of ['FND-BOARD','FND-PIECES','FND-PAWNS','FND-LEGAL','FND-THINK','DEV-HANGING','DEV-THREATS'])master(db,student,code);
  setHmenaSkillStatus(db,{studentId:student.id,skillCode:'DEV-PIN',status:'practicing',confidence:60});find(db,student,'DEV-PIN',3,4);
  const rec=nextLessonRecommendation(db,student.id,{locale:'es'});
  assert.equal(rec.recommendation.skill.code,'DEV-PIN');assert.match(rec.recommendation.lesson.title,/Clavadas/);assert.ok(rec.recommendation.reasons.some(r=>r.code==='games'));db.close();
});
test('family plan only appears after coach accepts or overrides recommendation',()=>{
  const {db,student}=setup();
  for(const code of ['FND-BOARD','FND-PIECES','FND-PAWNS','FND-LEGAL','FND-THINK','DEV-HANGING','DEV-THREATS'])master(db,student,code);
  setHmenaSkillStatus(db,{studentId:student.id,skillCode:'DEV-FORK',status:'practicing',confidence:55});find(db,student,'DEV-FORK',2,4);
  assert.equal(latestApprovedPlan(db,student.id,{locale:'en'}),null);
  const decision=recordCoachLessonDecision(db,{studentId:student.id,decision:'accepted',locale:'en',coachNote:'Use student games first'});
  assert.equal(decision.decision,'accepted');
  const plan=latestApprovedPlan(db,student.id,{locale:'es'});
  assert.equal(plan.skill.code,'DEV-FORK');assert.ok(plan.lesson);assert.equal(plan.coachNote,'Use student games first');db.close();
});
