import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {createPortalAccount} from '../src/student-portal-access.js';
import {seedAllCurriculum} from '../src/curriculum.js';
import {seedHmenaFramework,mapLegacyToHmena} from '../src/hmena-curriculum.js';
import {seedDiagnostic0800,startDiagnostic0800,submitDiagnosticAnswer,diagnosticEntryPoint,diagnosticState} from '../src/diagnostic.js';
import {linkStudentVerifiedAccount} from '../src/student-platform-link.js';
import {saveDailyRatings} from '../src/rating-tracking.js';

function setup(){
  const db=openDatabase(':memory:');
  seedAllCurriculum(db);seedHmenaFramework(db);mapLegacyToHmena(db);seedDiagnostic0800(db);
  const student=createStudent(db,{displayName:'Evidence Student'});
  const portal=createPortalAccount(db,{studentIds:[student.id],displayName:'Family'});
  return {db,student,portal};
}
test('diagnostic correct answers create practice evidence, never mastery',()=>{
  const {db,student,portal}=setup();
  const {attemptId}=startDiagnostic0800(db,{accountId:portal.accountId,studentId:student.id,locale:'en'});
  const items=db.prepare("SELECT id,correct_answer AS correctAnswer FROM diagnostic_items WHERE stage='foundations' ORDER BY sequence_no").all();
  for(const item of items)submitDiagnosticAnswer(db,{accountId:portal.accountId,attemptId,itemId:item.id,answerKey:item.correctAnswer});
  const rows=db.prepare(`SELECT ss.status,ss.confidence,ss.evidence_json AS evidenceJson FROM student_skills ss JOIN curriculum_skills cs ON cs.id=ss.skill_id WHERE ss.student_id=? AND cs.code LIKE 'FND-%'`).all(student.id);
  assert.ok(rows.length>=10);assert.ok(rows.every(r=>r.status==='practicing'));
  assert.ok(rows.every(r=>r.confidence===60));
  assert.ok(rows.every(r=>JSON.parse(r.evidenceJson).diagnostic?.correct===true));
  db.close();
});

test('diagnostic does not downgrade stronger prior evidence',()=>{
  const {db,student,portal}=setup();
  const skill=db.prepare("SELECT id FROM curriculum_skills WHERE code='FND-BOARD'").get();
  db.prepare("INSERT INTO student_skills(student_id,skill_id,status,confidence,evidence_json) VALUES (?,?,'drill_mastered',95,'{}')").run(student.id,skill.id);
  const {attemptId}=startDiagnostic0800(db,{accountId:portal.accountId,studentId:student.id});
  const items=db.prepare("SELECT id,correct_answer AS correctAnswer FROM diagnostic_items WHERE stage='foundations' ORDER BY sequence_no").all();
  for(const item of items)submitDiagnosticAnswer(db,{accountId:portal.accountId,attemptId,itemId:item.id,answerKey:item.correctAnswer==='A'?'B':'A'});
  const row=db.prepare('SELECT status,confidence FROM student_skills WHERE student_id=? AND skill_id=?').get(student.id,skill.id);
  assert.equal(row.status,'drill_mastered');assert.equal(row.confidence,95);
  db.close();
});


function linkRated(db,student,platform,username,rating){
  const linked=linkStudentVerifiedAccount(db,student.id,{verified:true,platform,username,usernameNormalized:username.toLowerCase(),verificationSource:'test',verifiedAt:'2026-09-15T20:00:00Z'});
  const account=db.prepare('SELECT id FROM player_accounts WHERE player_id=? AND platform=? AND username_normalized=?').get(linked.playerId,platform,username.toLowerCase());
  saveDailyRatings(db,{accountId:account.id,playerId:linked.playerId,platform},[{ratingType:'rapid',rating,gamesCount:100,ratingDeviation:platform==='lichess'?80:null,provisional:platform==='lichess'?false:null}],{now:new Date('2026-09-15T21:00:00Z')});
}

test('1200 Lichess and 1000 Chess.com seed diagnostic at Development, not Foundations',()=>{
  const {db,student,portal}=setup();
  linkRated(db,student,'lichess','ratedkid',1200);linkRated(db,student,'chesscom','ratedkidcc',1000);
  const entry=diagnosticEntryPoint(db,student.id);assert.equal(entry.stage,'development');assert.equal(entry.basis,'rating_seed');assert.equal(entry.signals.filter(x=>x.qualifies).length,2);
  const start=startDiagnostic0800(db,{accountId:portal.accountId,studentId:student.id});assert.equal(start.stage,'development');assert.equal(start.entryBasis,'rating_seed');
  const items=db.prepare("SELECT id,correct_answer AS correctAnswer FROM diagnostic_items WHERE is_anchor=1 OR stage='development' ORDER BY is_anchor DESC,sequence_no").all();
  let result;for(const item of items)result=submitDiagnosticAnswer(db,{accountId:portal.accountId,attemptId:start.attemptId,itemId:item.id,answerKey:item.correctAnswer});
  assert.equal(result.placementBandCode,'hmena-800-1200');assert.equal(result.summary.foundations.skipped,true);assert.equal(result.summary.development.percent,100);
  db.close();
});

test('rating-seeded student who fails Development lands in 400-800 instead of repeating 0-400',()=>{
  const {db,student,portal}=setup();linkRated(db,student,'lichess','ratedkid2',1200);
  const start=startDiagnostic0800(db,{accountId:portal.accountId,studentId:student.id});
  const anchors=db.prepare("SELECT id,correct_answer AS correctAnswer FROM diagnostic_items WHERE is_anchor=1 ORDER BY sequence_no").all();
  let result;for(const item of anchors)result=submitDiagnosticAnswer(db,{accountId:portal.accountId,attemptId:start.attemptId,itemId:item.id,answerKey:item.correctAnswer});
  const items=db.prepare("SELECT id,correct_answer AS correctAnswer FROM diagnostic_items WHERE stage='development' AND is_anchor=0 ORDER BY sequence_no").all();
  for(const item of items)result=submitDiagnosticAnswer(db,{accountId:portal.accountId,attemptId:start.attemptId,itemId:item.id,answerKey:item.correctAnswer==='A'?'B':'A'});
  assert.equal(result.placementBandCode,'hmena-400-800');assert.equal(result.summary.foundationCheckRecommended,true);
  db.close();
});

test('provisional or unreliable ratings never skip Foundations',()=>{
  const {db,student}=setup();
  const linked=linkStudentVerifiedAccount(db,student.id,{verified:true,platform:'lichess',username:'provisionalKid',usernameNormalized:'provisionalkid',verificationSource:'test',verifiedAt:'2026-09-15T20:00:00Z'});
  const account=db.prepare("SELECT id FROM player_accounts WHERE player_id=? AND platform='lichess'").get(linked.playerId);
  saveDailyRatings(db,{accountId:account.id,playerId:linked.playerId,platform:'lichess'},[{ratingType:'rapid',rating:1300,gamesCount:5,ratingDeviation:180,provisional:true}],{now:new Date('2026-09-15T21:00:00Z')});
  const entry=diagnosticEntryPoint(db,student.id);assert.equal(entry.stage,'foundations');assert.equal(entry.signals[0].reliable,false);assert.equal(entry.signals[0].qualifies,false);db.close();
});

test('rating-seeded diagnostic presents anchor checks before Development',()=>{
  const {db,student,portal}=setup();linkRated(db,student,'lichess','anchorkid',1200);
  const start=startDiagnostic0800(db,{accountId:portal.accountId,studentId:student.id});assert.equal(start.stage,'development');
  const state=diagnosticState(db,{accountId:portal.accountId,attemptId:start.attemptId,locale:'en'});
  assert.equal(state.item.isAnchor,true);assert.ok(state.item.fen);db.close();
});
test('Bullet-dominant recent play can seed Development but still requires anchor checks',()=>{
  const {db,student,portal}=setup();
  const linked=linkStudentVerifiedAccount(db,student.id,{verified:true,platform:'lichess',username:'bulletkid',usernameNormalized:'bulletkid',verificationSource:'test',verifiedAt:'2026-09-15T20:00:00Z'});
  const account=db.prepare("SELECT id FROM player_accounts WHERE player_id=? AND platform='lichess'").get(linked.playerId);
  saveDailyRatings(db,{accountId:account.id,playerId:linked.playerId,platform:'lichess'},[{ratingType:'bullet',rating:1900,gamesCount:800,ratingDeviation:70,provisional:false}],{now:new Date('2026-09-15T21:00:00Z')});
  for(let i=0;i<50;i++)db.prepare(`INSERT INTO academic_external_games(id,student_id,account_id,platform,external_game_id,played_at,time_class,analysis_status) VALUES (?,?,?,?,?,?,?,'analyzed')`).run(`BG${i}`,student.id,account.id,'lichess',`bext${i}`,new Date(Date.UTC(2026,8,16,0,i)).toISOString(),i<40?'bullet':'blitz');
  const entry=diagnosticEntryPoint(db,student.id);assert.equal(entry.stage,'development');assert.equal(entry.playStyle.style,'bullet');assert.equal(entry.signals[0].signalRole,'style_seed');assert.equal(entry.signals[0].qualifies,true);
  const start=startDiagnostic0800(db,{accountId:portal.accountId,studentId:student.id});const state=diagnosticState(db,{accountId:portal.accountId,attemptId:start.attemptId,locale:'en'});assert.equal(state.item.isAnchor,true);db.close();
});
