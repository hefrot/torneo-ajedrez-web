import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStaffAccount,loginStaffAccount,authenticateStaffSession,revokeStaffSession,resetStaffPassword,listStaffAccounts} from '../src/staff-access.js';

test('staff passwords are hashed and login creates a private session',()=>{
  const db=openDatabase(':memory:');
  const created=createStaffAccount(db,{loginName:'hector',displayName:'Hector',role:'admin',password:'StrongPass-123'});
  assert.equal(created.role,'admin');
  const stored=db.prepare('SELECT password_hash AS hash,password_salt AS salt FROM staff_accounts WHERE id=?').get(created.id);
  assert.notEqual(stored.hash,'StrongPass-123');assert.ok(stored.salt);
  assert.equal(loginStaffAccount(db,{loginName:'hector',password:'wrong'}),null);
  const login=loginStaffAccount(db,{loginName:'hector',password:'StrongPass-123'});assert.ok(login.sessionToken.startsWith('hcs_'));
  const auth=authenticateStaffSession(db,login.sessionToken);assert.equal(auth.role,'admin');assert.equal(auth.loginName,'hector');
  db.close();
});

test('staff reset revokes existing sessions and preserves roles',()=>{
  const db=openDatabase(':memory:');
  const admin=createStaffAccount(db,{loginName:'admin1',displayName:'Admin One',role:'admin',password:'Admin-Pass-123'});
  const coach=createStaffAccount(db,{loginName:'coach1',displayName:'Coach One',role:'coach',password:'Coach-Pass-123'});
  const login=loginStaffAccount(db,{loginName:'coach1',password:'Coach-Pass-123'});assert.equal(authenticateStaffSession(db,login.sessionToken).role,'coach');
  const reset=resetStaffPassword(db,coach.id,{password:'Coach-New-456'});assert.equal(reset.staffId,coach.id);assert.equal(authenticateStaffSession(db,login.sessionToken),null);
  const relogin=loginStaffAccount(db,{loginName:'coach1',password:'Coach-New-456'});assert.equal(authenticateStaffSession(db,relogin.sessionToken).role,'coach');
  assert.equal(revokeStaffSession(db,relogin.account?.sessionId||'missing'),0);
  const rows=listStaffAccounts(db);assert.deepEqual(rows.map(x=>x.role).sort(),['admin','coach']);assert.ok(rows.some(x=>x.id===admin.id));
  db.close();
});
