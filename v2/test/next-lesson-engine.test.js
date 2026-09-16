import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent,createProgram,enrollStudent} from '../src/academic.js';
import {seedHmenaFramework,placeStudentInHmena,setHmenaSkillStatus} from '../src/hmena-curriculum.js';
import {seedCurriculumLocalizations} from '../src/curriculum-localization.js';
import {seedHmenaCourse0800} from '../src/hmena-course.js';
import {seedHmenaCourse1200} from '../src/hmena-course-1200.js';
import {nextLessonRecommendation,recordCoachLessonDecision,latestApprovedPlan} from '../src/next-lesson-engine.js';

function setup(band='hmena-400-800'){
  const db=openDatabase(':memory:');seedHmenaFramework(db);seedCurriculumLocalizations(db);seedHmenaCourse0800(db);seedHmenaCourse1200(db);
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
test('manual 400-800 placement does not force unproven lower-band skills to the front',()=>{
  const {db,student}=setup('hmena-400-800');
  const rec=nextLessonRecommendation(db,student.id,{locale:'en'});
  assert.equal(rec.recommendation.skill.code,'DEV-HANGING');
  assert.notEqual(rec.recommendation.skill.code,'FND-BOARD');db.close();
});

test('introduced prerequisites allow progression while remaining visible for later reinforcement',()=>{
  const {db,student}=setup('hmena-0-400');
  for(const code of ['FND-BOARD','FND-PIECES','FND-PAWNS','FND-LEGAL','FND-CHECK','FND-CBR','FND-MATE1'])setHmenaSkillStatus(db,{studentId:student.id,skillCode:code,status:'introduced',confidence:50});
  const rec=nextLessonRecommendation(db,student.id,{locale:'en'});
  assert.equal(rec.recommendation.skill.code,'FND-OPENING');db.close();
});
test('coach can approve and explicitly assign the plan to the next private session',()=>{
  const {db,student}=setup('hmena-0-400');
  const program=createProgram(db,{name:'Private Chess',programType:'private'});enrollStudent(db,{programId:program.id,studentId:student.id});
  db.prepare("INSERT INTO class_sessions(id,program_id,starts_at,duration_minutes,status) VALUES ('SES-NEXT',?,'2099-01-10T17:00:00',60,'scheduled')").run(program.id);
  setHmenaSkillStatus(db,{studentId:student.id,skillCode:'FND-BOARD',status:'practicing'});
  const decision=recordCoachLessonDecision(db,{studentId:student.id,decision:'accepted',assignToNextPrivateSession:true,locale:'en'});
  assert.equal(decision.assignment.assigned,true);assert.equal(decision.assignment.id,'SES-NEXT');
  const planned=db.prepare("SELECT lesson_id AS lessonId FROM session_lessons WHERE session_id='SES-NEXT'").get();assert.equal(planned.lessonId,decision.selected.lesson.id);db.close();
});

function addModeFinding(db,student,code,{id,timeClass='rapid',playedAt='2026-09-15T18:00:00Z',severity=4}={}){
  const pid=`P-${student.id}`,aid=`A-${student.id}`;
  db.prepare("INSERT OR IGNORE INTO players(id,name,platform,username,registration_status) VALUES (?,?,?,?, 'academic_only')").run(pid,student.displayName,'lichess',`u-${student.id}`);
  db.prepare("INSERT OR IGNORE INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES (?,?,?,?,?,'verified','test',?,'test','2026-01-01T00:00:00Z','x')").run(aid,pid,'lichess',`u-${student.id}`,`u-${student.id}`,`src-${student.id}`);
  db.prepare('UPDATE students SET player_id=? WHERE id=?').run(pid,student.id);
  const gid=id||`GM-${code}-${timeClass}-${Math.random()}`,skill=db.prepare('SELECT id FROM curriculum_skills WHERE code=?').get(code);
  db.prepare("INSERT INTO academic_external_games(id,student_id,account_id,platform,external_game_id,played_at,student_color,student_result,time_class,analysis_status) VALUES (?,?,?,?,?,?, 'white','loss',?,'analyzed')").run(`AG-${gid}`,student.id,aid,'lichess',gid,playedAt,timeClass);
  db.prepare("INSERT INTO student_game_findings(id,student_id,source_type,source_game_id,skill_id,finding_type,severity,created_at) VALUES (?,?, 'external',?,?, 'missed_tactic',?,?)").run(`F-${gid}`,student.id,gid,skill.id,severity,playedAt);
}

test('Bullet volume cannot outweigh a recent Rapid weakness',()=>{
  const {db,student}=setup();for(const code of ['FND-BOARD','FND-PIECES','FND-PAWNS','FND-LEGAL','FND-THINK','DEV-HANGING','DEV-THREATS'])master(db,student,code);
  setHmenaSkillStatus(db,{studentId:student.id,skillCode:'DEV-FORK',status:'practicing'});setHmenaSkillStatus(db,{studentId:student.id,skillCode:'DEV-PIN',status:'practicing'});
  for(let i=0;i<12;i++)addModeFinding(db,student,'DEV-FORK',{id:`bullet-${i}`,timeClass:'bullet',playedAt:'2026-09-15T17:00:00Z'});
  addModeFinding(db,student,'DEV-PIN',{id:'rapid-one',timeClass:'rapid',playedAt:'2026-09-15T18:00:00Z'});
  const rec=nextLessonRecommendation(db,student.id,{locale:'en',now:new Date('2026-09-15T20:00:00Z')});assert.equal(rec.recommendation.skill.code,'DEV-PIN');db.close();
});

test('old game mistakes decay below recent evidence',()=>{
  const {db,student}=setup();for(const code of ['FND-BOARD','FND-PIECES','FND-PAWNS','FND-LEGAL','FND-THINK','DEV-HANGING','DEV-THREATS'])master(db,student,code);
  setHmenaSkillStatus(db,{studentId:student.id,skillCode:'DEV-FORK',status:'practicing'});setHmenaSkillStatus(db,{studentId:student.id,skillCode:'DEV-PIN',status:'practicing'});
  for(let i=0;i<3;i++)addModeFinding(db,student,'DEV-FORK',{id:`old-${i}`,timeClass:'rapid',playedAt:'2026-06-15T18:00:00Z',severity:5});
  addModeFinding(db,student,'DEV-PIN',{id:'new-one',timeClass:'rapid',playedAt:'2026-09-15T18:00:00Z',severity:4});
  const rec=nextLessonRecommendation(db,student.id,{locale:'en',now:new Date('2026-09-15T20:00:00Z')});assert.equal(rec.recommendation.skill.code,'DEV-PIN');db.close();
});

test('two repeated coach selections rotate the next recommendation toward a parallel branch',()=>{
  const {db,student}=setup();recordCoachLessonDecision(db,{studentId:student.id,decision:'accepted',locale:'en'});recordCoachLessonDecision(db,{studentId:student.id,decision:'accepted',locale:'en'});
  const rec=nextLessonRecommendation(db,student.id,{locale:'en'});assert.notEqual(rec.recommendation.skill.code,'DEV-HANGING');assert.ok(rec.recommendation.reasons.some(r=>r.code==='parallel'));db.close();
});

test('800-1200 placement resolves to a real competitive fundamentals lesson',()=>{
  const {db,student}=setup('hmena-800-1200');
  const rec=nextLessonRecommendation(db,student.id,{locale:'es'});
  assert.ok(rec.recommendation.lesson);assert.match(rec.recommendation.lesson.id,/LESSON-HMENA-1200-/);assert.ok(rec.recommendation.skill.code.startsWith('CMP-'));db.close();
});
