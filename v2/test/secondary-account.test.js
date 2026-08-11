import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {linkVerifiedAccount} from '../src/registration.js';
import {listPublicPlayers} from '../src/public-visibility.js';
import {buildSeasonReadiness} from '../src/season-readiness.js';

const ids=values=>()=>values.shift();

test('admin can link a verified second platform without creating a duplicate player',()=>{
  const db=openDatabase(':memory:');
  db.prepare("INSERT INTO players(id,name,platform,username,registration_status) VALUES ('P1','Ana','lichess','anaL','registered')").run();
  db.prepare("INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES ('A1','P1','lichess','anaL','anal','verified','test','r1','test_api','2026-08-10T00:00:00Z',?)").run('0'.repeat(64));
  linkVerifiedAccount(db,'P1',{verified:true,platform:'chesscom',username:'AnaChess',usernameNormalized:'anachess',verificationSource:'chesscom_public_api',verifiedAt:'2026-08-10T01:00:00Z'},{idFactory:ids(['src-123456789','acc-123456789'])});
  const players=listPublicPlayers(db);
  assert.equal(players.length,1);
  assert.deepEqual(players[0].accounts.map(x=>x.platform).sort(),['chesscom','lichess']);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM players').get().n,1);
  db.close();
});

test('second platform can resolve cross-platform readiness',()=>{
  const db=openDatabase(':memory:');
  for(const [id,name,platform,username] of [['P1','Ana','lichess','ana'],['P2','Beto','chesscom','beto']]){
    db.prepare('INSERT INTO players(id,name,platform,username,registration_status) VALUES (?,?,?,?,?)').run(id,name,platform,username,'registered');
    db.prepare("INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES (?,?,?,?,?,'verified','test',?,'test_api','2026-08-10T00:00:00Z',?)").run('A'+id,id,platform,username,username,'R'+id,'0'.repeat(64));
  }
  assert.equal(buildSeasonReadiness(listPublicPlayers(db)).ready,false);
  linkVerifiedAccount(db,'P1',{verified:true,platform:'chesscom',username:'ana2',usernameNormalized:'ana2',verificationSource:'chesscom_public_api',verifiedAt:'2026-08-10T02:00:00Z'},{idFactory:ids(['src-2','acc-2'])});
  assert.equal(buildSeasonReadiness(listPublicPlayers(db)).ready,true);
  db.close();
});
