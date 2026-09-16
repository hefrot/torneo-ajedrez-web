import {openDatabase} from '../src/db.js';
import {LichessClient} from '../src/providers/lichess.js';
import {ChessComClient} from '../src/providers/chesscom.js';
import {analyzeAcademicGame} from '../src/stockfish-analysis.js';
import {syncAndAnalyzeAcademicGames} from '../src/academic-game-sync.js';

const db=openDatabase();
const lichessClient=new LichessClient();
let chessComClient=null;try{chessComClient=new ChessComClient();}catch{}
try{
  const result=await syncAndAnalyzeAcademicGames(db,{lichessClient,chessComClient,analyzeGame:analyzeAcademicGame,maxPerAccount:Number(process.env.ACADEMIC_GAME_FETCH_LIMIT||30),analysisLimit:Number(process.env.ACADEMIC_GAME_ANALYSIS_LIMIT||12),months:Number(process.env.ACADEMIC_CHESSCOM_MONTHS||2)});
  console.log(JSON.stringify(result));
}finally{db.close();}
