import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {listPublicPlayers,publicPlayerIds,isPublicPlayer} from '../src/public-visibility.js';

const hash='0'.repeat(64);

function addPlayer(db,{id,name,status='historical_unconfirmed',platform='lichess',username,accountStatus='historical_unconfirmed',verifiedAt=null}){
  db.prepare('INSERT INTO players(id,name,platform,username,registration_status) VALUES (?,?,?,?,?)').run(id,name,platform,username,status);
  db.prepare('INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,verification_source,verified_at,source_sha256) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run('A-'+id,id,platform,username,username.toLowerCase(),accountStatus,'test',verifiedAt?'test_api':null,verifiedAt,hash);
}

test('public roster contains only registered players with API-verified accounts',()=>{
  const db=openDatabase(':memory:');
  addPlayer(db,{id:'OLD',name:'Old Player',username:'old',status:'historical_unconfirmed'});
  addPlayer(db,{id:'PENDING',name:'Pending Player',username:'pending',status:'registered',accountStatus:'historical_unconfirmed'});
  addPlayer(db,{id:'OK',name:'Verified Player',username:'verified',status:'registered',accountStatus:'verified',verifiedAt:'2026-08-10T20:00:00Z'});

  const players=listPublicPlayers(db);
  assert.equal(players.length,1);
  assert.equal(players[0].id,'OK');
  assert.deepEqual(publicPlayerIds(db),['OK']);
  assert.equal(isPublicPlayer(db,'OK'),true);
  assert.equal(isPublicPlayer(db,'OLD'),false);
  assert.equal(isPublicPlayer(db,'PENDING'),false);
  db.close();
});
