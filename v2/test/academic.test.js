import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent,createSchool,createProgram,enrollStudent,listPrograms,listStudents} from '../src/academic.js';

test('coach can create a student and enroll them in a school cohort',()=>{
  const db=openDatabase(':memory:');
  const student=createStudent(db,{displayName:'Sample Student',currentLevel:500,targetLevel:800});
  const school=createSchool(db,{name:'Sample School'});
  const program=createProgram(db,{schoolId:school.id,name:'Fall 12 Week Chess',programType:'school',plannedWeeks:12});
  enrollStudent(db,{programId:program.id,studentId:student.id,initialLevel:500});
  const students=listStudents(db);
  const programs=listPrograms(db);
  assert.equal(students.length,1);
  assert.equal(students[0].displayName,'Sample Student');
  assert.equal(programs.length,1);
  assert.equal(programs[0].activeStudents,1);
  assert.equal(programs[0].plannedWeeks,12);
  db.close();
});
