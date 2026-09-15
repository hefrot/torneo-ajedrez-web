import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent,createSchool,createProgram,enrollStudent,listPrograms,listStudents,saveSessionAttendance,studentProfile,addCoachNote} from '../src/academic.js';

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


test('coach can save attendance telemetry and read student profile',()=>{
  const db=openDatabase(':memory:');
  const student=createStudent(db,{displayName:'Telemetry Student',currentLevel:450});
  const program=createProgram(db,{name:'Private Chess',programType:'private',plannedWeeks:8});
  enrollStudent(db,{programId:program.id,studentId:student.id,initialLevel:450});
  db.prepare("INSERT INTO class_sessions(id,program_id,starts_at,week_no) VALUES ('S1',?, '2026-09-15T17:00:00-07:00',1)").run(program.id);
  const rows=saveSessionAttendance(db,'S1',[{studentId:student.id,status:'present',comprehensionScore:4,engagementFlag:'focused',note:'Good calculation'}]);
  assert.equal(rows[0].comprehensionScore,4);
  addCoachNote(db,student.id,{visibility:'coach_only',note:'Review knight forks next class'});
  const profile=studentProfile(db,student.id);
  assert.equal(profile.attendance.present,1);
  assert.equal(profile.attendance.avgComprehension,4);
  assert.equal(profile.notes[0].visibility,'coach_only');
  db.close();
});

test('attendance rejects a student outside the session program',()=>{
  const db=openDatabase(':memory:');
  const student=createStudent(db,{displayName:'Outside Student'});
  const program=createProgram(db,{name:'School Group',programType:'school'});
  db.prepare("INSERT INTO class_sessions(id,program_id,starts_at) VALUES ('S2',?, '2026-09-15T15:00:00-07:00')").run(program.id);
  assert.throws(()=>saveSessionAttendance(db,'S2',[{studentId:student.id,status:'present'}]),/not enrolled/);
  db.close();
});
