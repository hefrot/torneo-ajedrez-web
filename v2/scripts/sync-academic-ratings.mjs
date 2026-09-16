import {openDatabase} from '../src/db.js';
import {LichessClient} from '../src/providers/lichess.js';
import {ChessComClient} from '../src/providers/chesscom.js';
import {syncAcademicRatings} from '../src/rating-tracking.js';

const db=openDatabase();
const lichessClient=new LichessClient();
let chessComClient=null;
try{chessComClient=new ChessComClient();}catch{}
try{
  const result=await syncAcademicRatings(db,{lichessClient,chessComClient,now:new Date()});
  console.log(JSON.stringify(result));
}finally{db.close();}
