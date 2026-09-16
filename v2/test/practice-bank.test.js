import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {seedPracticeBank,studentPracticeBank,recordPracticeBankAttempt} from '../src/practice-bank.js';

test('curated Lichess bank seeds and never exposes solutions to family payload',()=>{
  const db=openDatabase(':memory:');const seeded=seedPracticeBank(db);assert.ok(seeded.seeded>=250);
  const student=createStudent(db,{displayName:'Puzzle Kid'});
  db.prepare("INSERT INTO assignments(id,student_id,title,details,status) VALUES ('A1',?,'CIS Practice · Forks',?,'assigned')").run(student.id,JSON.stringify({kind:'external_practice',resourceKey:'fork'}));
  const set=studentPracticeBank(db,student.id,{limit:3});assert.equal(set.puzzles.length,3);assert.ok(set.puzzles.every(p=>p.themes.includes('fork')));
  assert.ok(set.puzzles.every(p=>!Object.hasOwn(p,'bestMove')&&!Object.hasOwn(p,'solutionMoves')));db.close();
});

test('practice bank records deterministic first-move answers and rotates solved puzzles',()=>{
  const db=openDatabase(':memory:');seedPracticeBank(db);const student=createStudent(db,{displayName:'Puzzle Kid'});
  db.prepare("INSERT INTO assignments(id,student_id,title,details,status) VALUES ('A1',?,'CIS Practice · Hanging',?,'assigned')").run(student.id,JSON.stringify({kind:'external_practice',resourceKey:'hanging'}));
  const first=studentPracticeBank(db,student.id,{limit:3}).puzzles[0];const solution=db.prepare('SELECT best_move AS bestMove FROM practice_bank_puzzles WHERE id=?').get(first.id).bestMove;
  const wrong=recordPracticeBankAttempt(db,{studentId:student.id,puzzleId:first.id,answerMove:'a1a1'});assert.equal(wrong.correct,false);
  const right=recordPracticeBankAttempt(db,{studentId:student.id,puzzleId:first.id,answerMove:solution});assert.equal(right.correct,true);
  const next=studentPracticeBank(db,student.id,{limit:3});assert.ok(!next.puzzles.some(p=>p.id===first.id));db.close();
});
