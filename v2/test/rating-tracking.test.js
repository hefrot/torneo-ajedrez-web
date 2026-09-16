import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {lichessRatings,chessComRatings,saveDailyRatings,studentRatingProgress,captureVerifiedAccountRatings} from '../src/rating-tracking.js';

test('rating extractors keep time controls separate',()=>{
  assert.deepEqual(lichessRatings({perfs:{rapid:{rating:1200,games:10},blitz:{rating:1100,games:20}}}).map(x=>[x.ratingType,x.rating]),[['rapid',1200],['blitz',1100]]);
  assert.deepEqual(chessComRatings({chess_rapid:{last:{rating:900},record:{win:3,loss:2,draw:1}},chess_bullet:{last:{rating:800},record:{win:1,loss:1,draw:0}}}).map(x=>[x.ratingType,x.rating]),[['rapid',900],['bullet',800]]);
});

test('daily rating snapshots upsert by account and time control',()=>{
  const db=openDatabase(':memory:');
  db.prepare("INSERT INTO players(id,name,platform,username,registration_status) VALUES ('P1','Test','lichess','test','academic_only')").run();
  db.prepare("INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verified_at,source_sha256) VALUES ('A1','P1','lichess','test','test','verified','test','1','2026-01-01','x')").run();
  db.prepare("INSERT INTO students(id,display_name,player_id) VALUES ('S1','Test','P1')").run();
  const account={accountId:'A1',playerId:'P1',platform:'lichess'};
  saveDailyRatings(db,account,[{ratingType:'rapid',rating:1000,gamesCount:5}],{now:new Date('2026-09-15T12:00:00-07:00')});
  saveDailyRatings(db,account,[{ratingType:'rapid',rating:1012,gamesCount:7},{ratingType:'blitz',rating:900,gamesCount:3}],{now:new Date('2026-09-15T18:00:00-07:00')});
  const data=studentRatingProgress(db,'S1');
  assert.equal(data.series.length,2); assert.equal(data.series.find(x=>x.ratingType==='rapid').latestRating,1012);
  db.close();
});


test('link-time rating capture stores public ratings immediately',async()=>{
  const db=openDatabase(':memory:');
  db.prepare("INSERT INTO players(id,name,platform,username,registration_status) VALUES ('P2','Rated','lichess','rated','academic_only')").run();
  db.prepare("INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verified_at,source_sha256) VALUES ('A2','P2','lichess','rated','rated','verified','test','2','2026-09-15','y')").run();
  db.prepare("INSERT INTO students(id,display_name,player_id) VALUES ('S2','Rated','P2')").run();
  const lichessClient={getUser:async()=>({perfs:{rapid:{rating:1200,games:50},blitz:{rating:1110,games:80}}})};
  const result=await captureVerifiedAccountRatings(db,{playerId:'P2',platform:'lichess',username:'rated',lichessClient,now:new Date('2026-09-15T19:00:00-07:00')});
  assert.equal(result.saved,2);const progress=studentRatingProgress(db,'S2');assert.equal(progress.series.find(x=>x.ratingType==='rapid').latestRating,1200);
  db.close();
});
