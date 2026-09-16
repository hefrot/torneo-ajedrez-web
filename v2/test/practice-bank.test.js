import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {seedPracticeBank,studentPracticeBank,recordPracticeBankAttempt,startPracticeStreak,submitPracticeStreakMove} from '../src/practice-bank.js';

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

test('CIS puzzle rating is separate, adaptive, and tracks streak/accuracy',()=>{
  const db=openDatabase(':memory:');seedPracticeBank(db);const student=createStudent(db,{displayName:'Rating Kid'});
  db.prepare("INSERT INTO assignments(id,student_id,title,details,status) VALUES ('A1',?,'CIS Practice · Forks',?,'assigned')").run(student.id,JSON.stringify({kind:'external_practice',resourceKey:'fork'}));
  const first=studentPracticeBank(db,student.id,{limit:1}).puzzles[0],solution=db.prepare('SELECT best_move AS bestMove FROM practice_bank_puzzles WHERE id=?').get(first.id).bestMove;
  const start=studentPracticeBank(db,student.id,{limit:1}).profile;assert.equal(start.attempts,0);assert.equal(start.seedSource,'default');
  const good=recordPracticeBankAttempt(db,{studentId:student.id,puzzleId:first.id,answerMove:solution});assert.equal(good.correct,true);assert.ok(good.ratingAfter>good.ratingBefore);assert.equal(good.streak,1);
  const second=studentPracticeBank(db,student.id,{limit:1}).puzzles[0];const bad=recordPracticeBankAttempt(db,{studentId:student.id,puzzleId:second.id,answerMove:'a1a1'});assert.equal(bad.correct,false);assert.ok(bad.ratingAfter<bad.ratingBefore);assert.equal(bad.streak,0);
  const profile=studentPracticeBank(db,student.id,{limit:1}).profile;assert.equal(profile.attempts,2);assert.equal(profile.correct,1);assert.equal(profile.accuracy,50);assert.equal(profile.bestStreak,1);db.close();
});

test('retrying the same puzzle does not change CIS puzzle rating twice',()=>{
  const db=openDatabase(':memory:');seedPracticeBank(db);const student=createStudent(db,{displayName:'Retry Kid'});
  const first=studentPracticeBank(db,student.id,{limit:1}).puzzles[0],solution=db.prepare('SELECT best_move AS bestMove FROM practice_bank_puzzles WHERE id=?').get(first.id).bestMove;
  const miss=recordPracticeBankAttempt(db,{studentId:student.id,puzzleId:first.id,answerMove:'a1a1'});assert.equal(miss.rated,true);
  const retry=recordPracticeBankAttempt(db,{studentId:student.id,puzzleId:first.id,answerMove:solution});assert.equal(retry.correct,true);assert.equal(retry.rated,false);assert.equal(retry.ratingDelta,0);
  const profile=studentPracticeBank(db,student.id,{limit:1}).profile;assert.equal(profile.attempts,1);assert.equal(profile.correct,0);db.close();
});

test('Puzzle Streak advances on correct answer and ends on first miss',()=>{
  const db=openDatabase(':memory:');seedPracticeBank(db);const student=createStudent(db,{displayName:'Streak Kid'});
  const start=startPracticeStreak(db,{studentId:student.id});assert.equal(start.status,'in_progress');assert.equal(start.score,0);assert.ok(start.puzzle?.id);
  const best=db.prepare('SELECT best_move AS bestMove FROM practice_bank_puzzles WHERE id=?').get(start.puzzle.id).bestMove;
  const good=submitPracticeStreakMove(db,{studentId:student.id,runId:start.id,answerMove:best});assert.equal(good.correct,true);assert.equal(good.ended,false);assert.equal(good.state.score,1);assert.ok(good.state.puzzle?.id);
  const bad=submitPracticeStreakMove(db,{studentId:student.id,runId:start.id,answerMove:'a1a1'});assert.equal(bad.correct,false);assert.equal(bad.ended,true);assert.equal(bad.state.status,'completed');assert.equal(bad.state.score,1);assert.equal(bad.state.best,1);db.close();
});
