import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {createPortalAccount,loginPortalAccount,authenticatePortalSession,regeneratePortalCode} from '../src/student-portal-access.js';

test('family portal uses hashed one-time-visible code and private session',()=>{
  const db=openDatabase(':memory:');
  const student=createStudent(db,{displayName:'Portal Student'});
  const issued=createPortalAccount(db,{studentIds:[student.id],role:'guardian',displayName:'Portal Family',loginName:'portal-family'});
  assert.match(issued.accessCode,/^HC-/);
  const stored=db.prepare('SELECT code_hash FROM portal_access_codes WHERE account_id=?').get(issued.accountId);
  assert.notEqual(stored.code_hash,issued.accessCode);
  const login=loginPortalAccount(db,{loginName:'portal-family',accessCode:issued.accessCode});
  assert.match(login.sessionToken,/^hps_/);
  assert.equal(authenticatePortalSession(db,login.sessionToken).accountId,issued.accountId);
  const rotated=regeneratePortalCode(db,issued.accountId);
  assert.equal(authenticatePortalSession(db,login.sessionToken),null);
  assert.equal(loginPortalAccount(db,{loginName:'portal-family',accessCode:issued.accessCode}),null);
  assert.ok(loginPortalAccount(db,{loginName:'portal-family',accessCode:rotated.accessCode}));
  db.close();
});
