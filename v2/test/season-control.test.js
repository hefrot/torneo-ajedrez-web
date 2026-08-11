import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {getSeasonControl,registrationIsOpen,closeRegistration,openRegistration,markSeasonStarted} from '../src/season-control.js';

test('registration lifecycle opens, closes and starts without deleting roster',()=>{
  const db=openDatabase(':memory:');
  assert.equal(registrationIsOpen(db),true);
  closeRegistration(db,{now:new Date('2026-08-11T00:00:00Z')});
  assert.equal(registrationIsOpen(db),false);
  assert.equal(getSeasonControl(db).registration_state,'CLOSED');
  openRegistration(db,{now:new Date('2026-08-11T01:00:00Z')});
  assert.equal(registrationIsOpen(db),true);
  closeRegistration(db,{now:new Date('2026-08-11T02:00:00Z')});
  markSeasonStarted(db,{now:new Date('2026-08-11T03:00:00Z')});
  const state=getSeasonControl(db);
  assert.equal(state.registration_state,'CLOSED');
  assert.equal(state.season_status,'STARTED');
  db.close();
});
