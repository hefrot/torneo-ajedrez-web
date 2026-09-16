import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {recordStudentGameReview} from '../src/training-intelligence.js';
import {studentOpeningProfile} from '../src/opening-trainer.js';

test('opening profile ranks recurring early-game problems without inventing Elo loss',()=>{
  const db=openDatabase(':memory:');const student=createStudent(db,{displayName:'Opening Learner'});
  recordStudentGameReview(db,{studentId:student.id,sourceGameId:'g1',openingName:'Italian Game',openingEco:'C50',result:'loss',summary:{openingAvgCpLoss:180,openingCriticalCount:2,avgCpLoss:140}});
  recordStudentGameReview(db,{studentId:student.id,sourceGameId:'g2',openingName:'Italian Game',openingEco:'C50',result:'win',summary:{openingAvgCpLoss:120,openingCriticalCount:1,avgCpLoss:100}});
  recordStudentGameReview(db,{studentId:student.id,sourceGameId:'g3',openingName:'French Defense',openingEco:'C00',result:'loss',summary:{openingAvgCpLoss:50,openingCriticalCount:0,avgCpLoss:90}});
  const profile=studentOpeningProfile(db,student.id,{locale:'es'});
  assert.equal(profile.gamesAnalyzed,3);assert.equal(profile.focus.openingName,'Italian Game');assert.equal(profile.focus.games,2);assert.equal(profile.focus.criticalOpeningErrors,3);assert.match(profile.focusText,/Italian Game/);assert.equal(Object.hasOwn(profile.focus,'eloLost'),false);db.close();
});
