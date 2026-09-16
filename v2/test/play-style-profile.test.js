import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {linkStudentVerifiedAccount} from '../src/student-platform-link.js';
import {studentPlayStyleProfile} from '../src/play-style-profile.js';

function setup(){
  const db=openDatabase(':memory:');const student=createStudent(db,{displayName:'Style Student'});
  const linked=linkStudentVerifiedAccount(db,student.id,{verified:true,platform:'lichess',username:'styleplayer',usernameNormalized:'styleplayer',verificationSource:'test',verifiedAt:'2026-09-16T10:00:00Z'});
  const accountId=db.prepare("SELECT id FROM player_accounts WHERE player_id=? AND platform='lichess'").get(linked.playerId).id;
  return {db,student,accountId};
}
function addGame(db,{studentId,accountId,index,mode,platform='lichess'}){
  db.prepare(`INSERT INTO academic_external_games(id,student_id,account_id,platform,external_game_id,played_at,time_class,analysis_status)
    VALUES (?,?,?,?,?,?,?,'analyzed')`).run(`G${index}`,studentId,accountId,platform,`ext${index}`,new Date(Date.UTC(2026,8,16,0,index)).toISOString(),mode);
}

test('play-style profile uses only the latest 50 games and detects Bullet dominance',()=>{
  const {db,student,accountId}=setup();
  for(let i=0;i<10;i++)addGame(db,{studentId:student.id,accountId,index:i,mode:'rapid'});
  for(let i=10;i<60;i++)addGame(db,{studentId:student.id,accountId,index:i,mode:i<50?'bullet':'blitz'});
  const p=studentPlayStyleProfile(db,student.id);
  assert.equal(p.sampleSize,50);assert.equal(p.buckets.rapid,0);assert.equal(p.buckets.bullet,40);assert.equal(p.buckets.blitz,10);
  assert.equal(p.style,'bullet');assert.equal(p.percentages.bullet,80);assert.equal(p.confidence,'high');assert.equal(p.targetSample,50);
  db.close();
});
test('play-style profile reports partial samples without pretending there are 50 games',()=>{
  const {db,student,accountId}=setup();
  for(let i=0;i<12;i++)addGame(db,{studentId:student.id,accountId,index:i,mode:i%2?'rapid':'blitz'});
  const p=studentPlayStyleProfile(db,student.id);
  assert.equal(p.sampleSize,12);assert.equal(p.coverage,24);assert.equal(p.sufficient,false);assert.equal(p.confidence,'low');assert.equal(p.style,'mixed');
  db.close();
});
