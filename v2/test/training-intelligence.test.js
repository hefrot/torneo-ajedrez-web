import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {seedHmenaFramework} from '../src/hmena-curriculum.js';
import {seedCurriculumLocalizations} from '../src/curriculum-localization.js';
import {seedHmenaCourse0800} from '../src/hmena-course.js';
import {studentTrainingIntelligence,recordPuzzleAttempt,recordStudentGameReview} from '../src/training-intelligence.js';

const finding=(db,id,studentId,skillCode,severity=4)=>{
  const skill=db.prepare('SELECT id FROM curriculum_skills WHERE code=?').get(skillCode);
  db.prepare(`INSERT INTO student_game_findings(id,student_id,source_type,source_game_id,skill_id,finding_type,severity,fen_before,move_played,best_move,note) VALUES (?,?, 'external',?,?,?,?,?,?,?,?)`).run(id,studentId,`game-${id}`,skill.id,'missed_tactic',severity,'8/8/8/8/8/8/8/K6k w - - 0 1','a1a2','a1b1','test');
};

test('recurring findings become ranked leaks and mistake puzzles',()=>{
  const db=openDatabase(':memory:');seedHmenaFramework(db);seedCurriculumLocalizations(db);seedHmenaCourse0800(db);
  const student=createStudent(db,{displayName:'Tactical Student'});
  finding(db,'F1',student.id,'DEV-PIN',5);finding(db,'F2',student.id,'DEV-PIN',4);finding(db,'F3',student.id,'DEV-FORK',2);
  const intel=studentTrainingIntelligence(db,student.id,{locale:'es'});
  assert.equal(intel.topLeaks[0].skillTitle,'Clavadas');
  assert.equal(intel.topLeaks[0].occurrences,2);
  assert.match(intel.topLeaks[0].recommendedLesson.title,/Clavadas/);
  assert.equal(intel.activePuzzles,3);
  db.close();
});
test('three correct puzzle attempts mark the puzzle mastered',()=>{
  const db=openDatabase(':memory:');seedHmenaFramework(db);seedHmenaCourse0800(db);
  const student=createStudent(db,{displayName:'Puzzle Student'});finding(db,'P1',student.id,'DEV-FORK',4);
  const intel=studentTrainingIntelligence(db,student.id,{locale:'en'});const puzzle=intel.puzzles[0];
  assert.equal(Object.hasOwn(puzzle,'bestMove'),false);
  recordPuzzleAttempt(db,{studentId:student.id,puzzleId:puzzle.id,answerMove:'a1b1',now:new Date('2026-09-10T10:00:00Z')});
  recordPuzzleAttempt(db,{studentId:student.id,puzzleId:puzzle.id,answerMove:'a1b1',now:new Date('2026-09-11T10:01:00Z')});
  const third=recordPuzzleAttempt(db,{studentId:student.id,puzzleId:puzzle.id,answerMove:'a1b1',now:new Date('2026-09-12T10:02:00Z')});
  assert.equal(third.mastered,true);
  assert.equal(db.prepare('SELECT status FROM training_puzzles WHERE id=?').get(puzzle.id).status,'mastered');
  db.close();
});

test('game reviews retain opening context independently of external provider',()=>{
  const db=openDatabase(':memory:');const student=createStudent(db,{displayName:'Opening Student'});
  recordStudentGameReview(db,{studentId:student.id,sourceType:'external',sourceGameId:'abc123',platform:'lichess',playedAt:'2026-09-15T20:00:00Z',result:'win',openingName:'Italian Game',openingEco:'C50'});
  const intel=studentTrainingIntelligence(db,student.id,{locale:'en'});
  assert.equal(intel.reviews[0].openingName,'Italian Game');
  assert.equal(intel.openings[0].games,1);
  db.close();
});

test('repeating the same puzzle immediately does not create mastery',()=>{
  const db=openDatabase(':memory:');seedHmenaFramework(db);seedHmenaCourse0800(db);
  const student=createStudent(db,{displayName:'Spaced Puzzle Student'});finding(db,'P2',student.id,'DEV-FORK',4);
  const puzzle=studentTrainingIntelligence(db,student.id,{locale:'en'}).puzzles[0];
  for(let i=0;i<3;i++)recordPuzzleAttempt(db,{studentId:student.id,puzzleId:puzzle.id,answerMove:'a1b1',now:new Date(`2026-09-10T10:0${i}:00Z`)});
  assert.equal(db.prepare('SELECT status FROM training_puzzles WHERE id=?').get(puzzle.id).status,'active');db.close();
});
