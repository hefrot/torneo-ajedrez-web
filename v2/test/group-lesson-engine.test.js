import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent,createProgram,enrollStudent} from '../src/academic.js';
import {seedHmenaFramework,placeStudentInHmena,setHmenaSkillStatus} from '../src/hmena-curriculum.js';
import {seedCurriculumLocalizations} from '../src/curriculum-localization.js';
import {seedHmenaCourse0800} from '../src/hmena-course.js';
import {programLessonRecommendation,assignProgramLesson} from '../src/group-lesson-engine.js';

function setup(){const db=openDatabase(':memory:');seedHmenaFramework(db);seedCurriculumLocalizations(db);seedHmenaCourse0800(db);const program=createProgram(db,{name:'School Chess',programType:'school'});db.prepare("UPDATE programs SET status='active' WHERE id=?").run(program.id);db.prepare("INSERT INTO class_sessions(id,program_id,starts_at,duration_minutes,status) VALUES ('GROUP-NEXT',?,'2099-01-10T15:00:00',60,'scheduled')").run(program.id);return {db,program};}
function add(db,program,name,band,tier){const s=createStudent(db,{displayName:name});const e=enrollStudent(db,{programId:program.id,studentId:s.id});db.prepare('UPDATE enrollments SET cohort_tier=? WHERE id=?').run(tier,e.id);placeStudentInHmena(db,{studentId:s.id,bandCode:band});return s;}
test('group engine prioritizes the lesson covering the most students',()=>{
  const {db,program}=setup();
  const a=add(db,program,'A','hmena-0-400','Seeds'),b=add(db,program,'B','hmena-0-400','Seeds'),c=add(db,program,'C','hmena-0-400','Seeds');
  for(const s of [a,b,c])setHmenaSkillStatus(db,{studentId:s.id,skillCode:'FND-BOARD',status:'practicing'});
  const rec=programLessonRecommendation(db,program.id,{locale:'es'});
  assert.equal(rec.rosterCount,3);assert.equal(rec.suggestion.studentCount,3);assert.equal(rec.suggestion.lesson.id,'LESSON-HMENA-0400-L01');assert.equal(rec.suggestion.coverage,1);
  db.close();
});

test('mixed school group keeps tier-specific recommendations inside one program',()=>{
  const {db,program}=setup();
  const seed=add(db,program,'Seed Kid','hmena-0-400','Seeds');setHmenaSkillStatus(db,{studentId:seed.id,skillCode:'FND-BOARD',status:'practicing'});
  add(db,program,'Builder Kid','hmena-400-800','Builders');
  const rec=programLessonRecommendation(db,program.id,{locale:'en'});assert.equal(rec.differentiated,true);assert.equal(rec.byTier.length,2);
  const builders=rec.byTier.find(x=>x.cohortTier==='Builders');assert.equal(builders.suggestion.skill.code,'DEV-HANGING');
  const assigned=assignProgramLesson(db,{programId:program.id,lessonId:builders.suggestion.lesson.id,cohortTier:'Builders'});assert.equal(assigned.sessionId,'GROUP-NEXT');assert.equal(assigned.cohortTier,'Builders');
  const row=db.prepare("SELECT cohort_tier AS tier FROM session_lessons WHERE session_id='GROUP-NEXT' AND lesson_id=?").get(builders.suggestion.lesson.id);assert.equal(row.tier,'Builders');db.close();
});

test('tier lessons share one session and repeated assignment is idempotent',()=>{
  const db=openDatabase(':memory:');seedHmenaFramework(db);seedHmenaCourse0800(db);
  const program=createProgram(db,{name:'Mixed School',programType:'school'});
  db.prepare("INSERT INTO class_sessions(id,program_id,starts_at,status) VALUES ('S-MIX',?,'2099-02-01T15:00:00','scheduled')").run(program.id);
  const first=assignProgramLesson(db,{programId:program.id,lessonId:'LESSON-HMENA-0400-L01',cohortTier:'Seeds'});
  const second=assignProgramLesson(db,{programId:program.id,lessonId:'LESSON-HMENA-0800-L01',cohortTier:'Builders'});
  const repeat=assignProgramLesson(db,{programId:program.id,lessonId:'LESSON-HMENA-0400-L01',cohortTier:'Seeds'});
  const rows=db.prepare('SELECT lesson_id AS lessonId,cohort_tier AS cohortTier FROM session_lessons WHERE session_id=? ORDER BY sequence_no').all('S-MIX');
  assert.equal(first.sessionId,'S-MIX');assert.equal(second.sessionId,'S-MIX');assert.equal(repeat.idempotent,true);
  assert.deepEqual(rows,[{lessonId:'LESSON-HMENA-0400-L01',cohortTier:'Seeds'},{lessonId:'LESSON-HMENA-0800-L01',cohortTier:'Builders'}]);
  db.close();
});
