import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent,createProgram,enrollStudent} from '../src/academic.js';
import {coachDashboard} from '../src/coach-dashboard.js';

test('coach dashboard uses Pacific local date and shows next 7 days',()=>{
  const db=openDatabase(':memory:');
  const student=createStudent(db,{displayName:'Future Student'});
  const program=createProgram(db,{name:'Private Future',programType:'private',plannedWeeks:8});
  db.prepare("UPDATE programs SET status='active' WHERE id=?").run(program.id);
  enrollStudent(db,{programId:program.id,studentId:student.id});
  db.prepare("INSERT INTO class_sessions(id,program_id,starts_at,title) VALUES ('NEXT',?,'2026-09-16T16:30:00-07:00','Next lesson')").run(program.id);
  const data=coachDashboard(db,{now:new Date('2026-09-16T01:00:00Z')});
  assert.equal(data.date,'2026-09-15');
  assert.equal(data.todaySessions.length,0);
  assert.equal(data.upcomingSessions.length,1);
  assert.equal(data.upcomingSessions[0].roster_count,1);
  db.close();
});