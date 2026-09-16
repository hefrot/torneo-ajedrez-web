import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {createPortalAccount} from '../src/student-portal-access.js';
import {seedAllCurriculum} from '../src/curriculum.js';
import {seedHmenaFramework,mapLegacyToHmena} from '../src/hmena-curriculum.js';
import {seedDiagnostic0800,startDiagnostic0800,diagnosticEntryPoint,diagnosticState,submitDiagnosticAnswer} from '../src/diagnostic.js';
import {seedDiagnostic1200,startDiagnostic1200,diagnostic1200State,submitDiagnostic1200Answer} from '../src/diagnostic-1200.js';
import {linkStudentVerifiedAccount} from '../src/student-platform-link.js';
import {saveDailyRatings} from '../src/rating-tracking.js';
import {familyJourney} from '../src/family-journey.js';
import {seedCisBots,cisBotCatalog} from '../src/cis-bot-arena.js';

test('Smayan-like pilot flows from reliable Chess.com rating through assessment to training',()=>{
  const db=openDatabase(':memory:');
  seedAllCurriculum(db);seedHmenaFramework(db);mapLegacyToHmena(db);seedDiagnostic0800(db);seedDiagnostic1200(db);seedCisBots(db);
  const student=createStudent(db,{displayName:'Pilot Student'});
  const portal=createPortalAccount(db,{studentIds:[student.id],displayName:'Pilot Family'});
  const linked=linkStudentVerifiedAccount(db,student.id,{verified:true,platform:'chesscom',username:'pilot1073',usernameNormalized:'pilot1073',verificationSource:'test',verifiedAt:'2026-09-16T10:00:00Z'});
  const account=db.prepare("SELECT id FROM player_accounts WHERE player_id=? AND platform='chesscom'").get(linked.playerId);
  saveDailyRatings(db,{accountId:account.id,playerId:linked.playerId,platform:'chesscom'},[{ratingType:'rapid',rating:1073,gamesCount:870}],{now:new Date('2026-09-16T10:01:00Z')});
  const entry=diagnosticEntryPoint(db,student.id);
  assert.equal(entry.stage,'development');assert.equal(entry.basis,'rating_seed');assert.equal(entry.signals[0].qualifies,true);
  const start=startDiagnostic0800(db,{accountId:portal.accountId,studentId:student.id,locale:'en'});
  assert.equal(start.stage,'development');assert.equal(start.entryBasis,'rating_seed');
  let result=null;
  while(true){
    const state=diagnosticState(db,{accountId:portal.accountId,attemptId:start.attemptId,locale:'en'});
    if(state.status==='completed')break;
    const answer=db.prepare('SELECT correct_answer AS correctAnswer FROM diagnostic_items WHERE id=?').get(state.item.id);
    result=submitDiagnosticAnswer(db,{accountId:portal.accountId,attemptId:start.attemptId,itemId:state.item.id,answerKey:answer.correctAnswer,locale:'en'});
    if(result?.completed)break;
  }
  assert.equal(result.placementBandCode,'hmena-800-1200');assert.equal(result.summary.cleared0800,true);
  let journey=familyJourney(db,student.id,{locale:'en'});assert.equal(journey.mission.kind,'assessment');assert.equal(journey.mission.diagnosticLevel,'1200');assert.equal(journey.completed,0);
  const second=startDiagnostic1200(db,{accountId:portal.accountId,studentId:student.id,locale:'en'});
  let result1200=null;
  while(true){
    const state=diagnostic1200State(db,{accountId:portal.accountId,attemptId:second.attemptId,locale:'en'});
    if(state.status==='completed')break;
    const answer=db.prepare('SELECT correct_answer AS correctAnswer FROM diagnostic_items WHERE id=?').get(state.item.id);
    result1200=submitDiagnostic1200Answer(db,{accountId:portal.accountId,attemptId:second.attemptId,itemId:state.item.id,answerKey:answer.correctAnswer,locale:'en'});
    if(result1200?.completed)break;
  }
  assert.equal(result1200.placementBandCode,'hmena-1200-1600');assert.equal(result1200.summary.cleared1200,true);
  journey=familyJourney(db,student.id,{locale:'en'});assert.equal(journey.mission.kind,'practice');assert.equal(journey.completed,1);
  const catalog=cisBotCatalog(db,student.id,{locale:'en'});assert.equal(catalog.recommendedCode,'king-strategist');
  assert.equal(catalog.bots.find(b=>b.code==='king-strategist').unlocked,true);
  const skills=db.prepare('SELECT status FROM student_skills WHERE student_id=?').all(student.id);
  assert.ok(skills.length>0);assert.ok(skills.every(x=>!['drill_mastered','applied_in_game'].includes(x.status)));
  db.close();
});
