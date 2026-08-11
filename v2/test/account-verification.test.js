import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPlatformAccount,AccountNotFoundError,AccountVerificationUnavailableError} from '../src/account-verification.js';

test('Lichess account verification returns canonical username',async()=>{
  const result=await verifyPlatformAccount('lichess','mixedCASE',{lichessClient:{getUser:async()=>({id:'mixedcase',username:'MixedCase'})},now:new Date('2026-08-10T20:00:00Z')});
  assert.equal(result.verified,true);
  assert.equal(result.username,'MixedCase');
  assert.equal(result.usernameNormalized,'mixedcase');
  assert.equal(result.verificationSource,'lichess_public_api');
});

test('Chess.com account verification uses public profile',async()=>{
  const result=await verifyPlatformAccount('chesscom','PlayerOne',{lichessClient:{},chessComClient:{getProfile:async()=>({username:'PlayerOne'})},now:new Date('2026-08-10T20:00:00Z')});
  assert.equal(result.verified,true);
  assert.equal(result.username,'PlayerOne');
  assert.equal(result.verificationSource,'chesscom_public_api');
});

test('404 becomes account not found and does not look verified',async()=>{
  const error=Object.assign(new Error('not found'),{status:404});
  await assert.rejects(
    verifyPlatformAccount('lichess','missing',{lichessClient:{getUser:async()=>{throw error;}}}),
    AccountNotFoundError,
  );
});

test('provider outage is reported separately from missing account',async()=>{
  const error=Object.assign(new Error('upstream'),{status:500});
  await assert.rejects(
    verifyPlatformAccount('chesscom','player',{lichessClient:{},chessComClient:{getProfile:async()=>{throw error;}}}),
    AccountVerificationUnavailableError,
  );
});
