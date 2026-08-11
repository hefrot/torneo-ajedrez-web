import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSeasonReadiness,sharedPlatforms} from '../src/season-readiness.js';

const player=(id,name,platforms)=>({id,name,accounts:platforms.map((platform,index)=>({platform,username:`${id}-${index}`}))});

test('readiness blocks pairs with no shared platform',()=>{
  const a=player('A','Ana',['lichess']);
  const b=player('B','Beto',['chesscom']);
  const state=buildSeasonReadiness([a,b]);
  assert.equal(state.ready,false);
  assert.equal(state.blockedPairCount,1);
  assert.deepEqual(state.blockedPairs[0].allowedPlatforms,[]);
});

test('a verified second platform resolves a blocked pair',()=>{
  const a=player('A','Ana',['lichess','chesscom']);
  const b=player('B','Beto',['chesscom']);
  assert.deepEqual(sharedPlatforms(a,b),['chesscom']);
  const state=buildSeasonReadiness([a,b]);
  assert.equal(state.ready,true);
  assert.equal(state.blockedPairCount,0);
});

test('readiness keeps all common platforms for flexible play',()=>{
  const a=player('A','Ana',['lichess','chesscom']);
  const b=player('B','Beto',['lichess','chesscom']);
  assert.deepEqual(sharedPlatforms(a,b),['lichess','chesscom']);
});
