import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {seedSeedsCurriculum,listCurriculum,recordStudentLessonEvidence,recommendNextSeedsLesson,assignLessonToSession} from '../src/curriculum.js';
import {createStudent,createProgram,enrollStudent} from '../src/academic.js';

test('Seeds curriculum seeds idempotently in lesson order',()=>{
  const db=openDatabase(':memory:');
  seedSeedsCurriculum(db); seedSeedsCurriculum(db);
  const data=listCurriculum(db);
  const seeds=data.lessons.filter(x=>x.trackCode==='seeds');
  assert.equal(seeds.length,10);
  assert.match(seeds[0].title,/L1/);
  assert.match(seeds[9].title,/L10/);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM curriculum_skill_dependencies').get().n,9);
  db.close();
});

test('completed teaching evidence advances next Seeds recommendation without claiming mastery',()=>{
  const db=openDatabase(':memory:'); seedSeedsCurriculum(db);
  const student=createStudent(db,{displayName:'Louie Test'});
  for(let n=1;n<=7;n++)recordStudentLessonEvidence(db,{studentId:student.id,lessonNumber:n,status:'introduced',evidence:{classStatus:'completed'}});
  const next=recommendNextSeedsLesson(db,student.id);
  assert.match(next.title,/L8/);
  assert.equal(db.prepare("SELECT status FROM student_skills WHERE student_id=? AND skill_id='SKILL-SEEDS-L7'").get(student.id).status,'introduced');
  db.close();
});
test('lesson can be attached to a scheduled session',()=>{
  const db=openDatabase(':memory:'); seedSeedsCurriculum(db);
  const student=createStudent(db,{displayName:'Session Student'});
  const program=createProgram(db,{name:'Private',programType:'private'});
  enrollStudent(db,{programId:program.id,studentId:student.id});
  db.prepare("INSERT INTO class_sessions(id,program_id,starts_at) VALUES ('CURR-S1',?,'2026-09-16T16:30:00-07:00')").run(program.id);
  assignLessonToSession(db,{sessionId:'CURR-S1',lessonId:'LESSON-SEEDS-L8'});
  const row=db.prepare('SELECT lesson_id AS lessonId,delivery_stage AS deliveryStage FROM session_lessons WHERE session_id=?').get('CURR-S1');
  assert.equal(row.lessonId,'LESSON-SEEDS-L8');
  assert.equal(row.deliveryStage,'theory_only');
  db.close();
});