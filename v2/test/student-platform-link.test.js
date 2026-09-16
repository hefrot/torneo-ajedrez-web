import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {linkStudentVerifiedAccount} from '../src/student-platform-link.js';
import {listPublicPlayers} from '../src/public-visibility.js';

test('academic platform link creates hidden player identity',()=>{
  const db=openDatabase(':memory:');
  const student=createStudent(db,{displayName:'Academic Child'});
  const linked=linkStudentVerifiedAccount(db,student.id,{verified:true,platform:'lichess',username:'childChess',usernameNormalized:'childchess',verificationSource:'lichess_public_api',verifiedAt:'2026-09-15T00:00:00Z'});
  assert.equal(linked.status,'linked_new_academic_player');
  const row=db.prepare('SELECT player_id AS playerId FROM students WHERE id=?').get(student.id);
  assert.equal(row.playerId,linked.playerId);
  assert.equal(db.prepare('SELECT registration_status FROM players WHERE id=?').get(linked.playerId).registration_status,'academic_only');
  assert.equal(listPublicPlayers(db).some(p=>p.id===linked.playerId),false);
  db.close();
});
