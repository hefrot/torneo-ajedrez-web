import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {submitRegistration,submitVerifiedRegistration} from '../src/registration.js';
import {listPublicPlayers} from '../src/public-visibility.js';

const ids=values=>()=>values.shift();
const verified=(platform,username)=>({verified:true,platform,username,usernameNormalized:username.toLowerCase(),verificationSource:platform==='lichess'?'lichess_public_api':'chesscom_public_api',verifiedAt:'2026-08-10T20:00:00.000Z'});

test('exact platform username creates a review candidate without enrolling history in recovery workflow',()=>{
  const db=openDatabase(':memory:');
  db.prepare("INSERT INTO players(id,name,platform,username,registration_status) VALUES ('LEGACY-1','Ana','lichess','AnaExact','historical_unconfirmed')").run();
  db.prepare("INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_sha256) VALUES ('A1','LEGACY-1','lichess','AnaExact','anaexact','historical_unconfirmed','legacy_tms',?)").run('0'.repeat(64));
  const result=submitRegistration(db,{name:'Ana Nueva',platform:'lichess',username:'ANAEXACT',whatsapp:'optional'},{idFactory:ids(['request-123456789'])});
  assert.equal(result.status,'pending_review');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM players').get().n,1);
  const request=db.prepare('SELECT matched_player_id,match_basis,status FROM registration_requests').get();
  assert.deepEqual(request,{matched_player_id:'LEGACY-1',match_basis:'EXACT_PLATFORM_USERNAME',status:'pending_exact_candidate'});
  assert.equal(db.prepare("SELECT registration_status FROM players WHERE id='LEGACY-1'").get().registration_status,'historical_unconfirmed');
  db.close();
});

test('name match alone never links a historical identity',()=>{
  const db=openDatabase(':memory:');
  db.prepare("INSERT INTO players(id,name,platform,username,registration_status) VALUES ('LEGACY-1','Same Name','lichess','olduser','historical_unconfirmed')").run();
  const result=submitRegistration(db,{name:'Same Name',platform:'lichess',username:'newexactuser'},{idFactory:ids(['request-123456789','player-123456789','account-123456789'])});
  assert.equal(result.status,'pending_review');
  const request=db.prepare('SELECT matched_player_id,match_basis FROM registration_requests').get();
  assert.notEqual(request.matched_player_id,'LEGACY-1');
  assert.equal(request.match_basis,'NEW_PLATFORM_USERNAME');
  db.close();
});

test('API-verified exact username confirms historical player and makes them public',()=>{
  const db=openDatabase(':memory:');
  db.prepare("INSERT INTO players(id,name,platform,username,registration_status) VALUES ('LEGACY-1','Ana','lichess','AnaExact','historical_unconfirmed')").run();
  db.prepare("INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_sha256) VALUES ('A1','LEGACY-1','lichess','AnaExact','anaexact','historical_unconfirmed','legacy_tms',?)").run('0'.repeat(64));
  const result=submitVerifiedRegistration(db,{name:'Ana',platform:'lichess',username:'AnaExact'},verified('lichess','AnaExact'),{idFactory:ids(['request-123456789'])});
  assert.equal(result.status,'verified');
  assert.equal(result.matchedHistory,true);
  assert.equal(db.prepare("SELECT registration_status FROM players WHERE id='LEGACY-1'").get().registration_status,'registered');
  const account=db.prepare("SELECT account_status,verification_source,verified_at FROM player_accounts WHERE id='A1'").get();
  assert.equal(account.account_status,'verified');
  assert.equal(account.verification_source,'lichess_public_api');
  assert.equal(listPublicPlayers(db).length,1);
  db.close();
});

test('API-verified new username creates a registered public player',()=>{
  const db=openDatabase(':memory:');
  const result=submitVerifiedRegistration(db,{name:'New Player',platform:'chesscom',username:'NewUser'},verified('chesscom','NewUser'),{idFactory:ids(['request-123456789','player-123456789','account-123456789'])});
  assert.equal(result.status,'verified');
  assert.equal(result.matchedHistory,false);
  const publicPlayers=listPublicPlayers(db);
  assert.equal(publicPlayers.length,1);
  assert.equal(publicPlayers[0].username,'NewUser');
  assert.equal(publicPlayers[0].platform,'chesscom');
  db.close();
});
