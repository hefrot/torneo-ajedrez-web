import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {seedHmenaFramework,placeStudentInHmena} from '../src/hmena-curriculum.js';
import {seedCisBots,cisBotCatalog,startCisBotChallenge,startCisBotGame,playCisBotMove} from '../src/cis-bot-arena.js';

function setup(){const db=openDatabase(':memory:');seedHmenaFramework(db);seedCisBots(db);const student=createStudent(db,{displayName:'Bot Student'});return {db,student};}

test('new student starts CIS Bot Ladder at Pawn Scout',()=>{
  const {db,student}=setup();const catalog=cisBotCatalog(db,student.id,{locale:'en'});
  assert.equal(catalog.recommendedCode,'pawn-scout');assert.equal(catalog.bots.find(b=>b.code==='pawn-scout').unlocked,true);assert.equal(catalog.bots.find(b=>b.code==='knight-rookie').unlocked,false);db.close();
});

test('800-1200 placement unlocks a suitable higher CIS bot',()=>{
  const {db,student}=setup();placeStudentInHmena(db,{studentId:student.id,bandCode:'hmena-800-1200'});
  const catalog=cisBotCatalog(db,student.id,{locale:'es'});assert.equal(catalog.bots.find(b=>b.code==='queen-tactician').unlocked,true);assert.equal(catalog.bots.find(b=>b.code==='king-strategist').unlocked,true);db.close();
});
test('three-game CIS bot challenge can pass and unlock the next rung',async()=>{
  const {db,student}=setup();
  const challenge=startCisBotChallenge(db,{studentId:student.id,botCode:'pawn-scout'});
  let calls=0;
  const fakeBot=async payload=>{calls++;if(!payload.studentMove)return {ok:true,fen:payload.fen,botMove:'e2e4',botMoveSan:'e4',gameOver:false,result:null};return {ok:true,fen:payload.fen,botMove:null,gameOver:true,result:'1-0',termination:'checkmate'};};
  const fakeAnalysis=async()=>({avgCpLoss:120,criticalCount:1,critical:[],analysisVersion:'test'});
  let final=null;
  for(let i=0;i<3;i++){
    const game=await startCisBotGame(db,{studentId:student.id,challengeId:challenge.id,botMove:fakeBot});
    final=await playCisBotMove(db,{studentId:student.id,gameId:game.id,moveUci:'a2a3',botMove:fakeBot,analyzeGame:fakeAnalysis});
  }
  assert.equal(final.challenge.status,'passed');assert.equal(final.challenge.summary.points,2);assert.equal(final.challenge.summary.practicalStrength,200);
  const catalog=cisBotCatalog(db,student.id,{locale:'en'});assert.equal(catalog.bots.find(b=>b.code==='knight-rookie').unlocked,true);assert.equal(catalog.bots.find(b=>b.code==='pawn-scout').passed,true);assert.ok(calls>=3);db.close();
});
