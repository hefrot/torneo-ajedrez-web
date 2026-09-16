import {createHash,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const defaultBank=fileURLToPath(new URL('../data/lichess-practice-bank-v1.json',import.meta.url));
const parse=value=>{try{return JSON.parse(value||'[]');}catch{return [];}};
const hash=value=>createHash('sha256').update(String(value)).digest('hex');
const norm=value=>String(value||'').trim().toLowerCase();
const keyThemes={
  hanging:['hangingPiece'],fork:['fork'],pin:['pin'],skewer:['skewer'],discovered:['discoveredAttack'],
  opening:['fork','pin','hangingPiece'],themes:['deflection','discoveredAttack','pin','skewer','fork'],
  practice:['fork','hangingPiece','pin','skewer','mateIn2','endgame']
};

export function seedPracticeBank(db,{bankPath=defaultBank}={}){
  const payload=JSON.parse(readFileSync(bankPath,'utf8'));
  const put=db.prepare(`INSERT INTO practice_bank_puzzles(id,source,source_id,fen,best_move,solution_moves_json,rating,popularity,plays,themes_json,game_url,opening_tags_json,side_to_move)
    VALUES (@id,'lichess_cc0',@sourceId,@fen,@bestMove,@solutionMoves,@rating,@popularity,@plays,@themes,@gameUrl,@openingTags,@sideToMove)
    ON CONFLICT(source_id) DO UPDATE SET fen=excluded.fen,best_move=excluded.best_move,solution_moves_json=excluded.solution_moves_json,rating=excluded.rating,popularity=excluded.popularity,plays=excluded.plays,themes_json=excluded.themes_json,game_url=excluded.game_url,opening_tags_json=excluded.opening_tags_json,side_to_move=excluded.side_to_move,active=1`);
  let seeded=0;
  db.transaction(()=>{for(const p of payload.puzzles||[]){put.run({id:`LPZ-${p.id}`,sourceId:p.id,fen:p.fen,bestMove:p.bestMove,solutionMoves:JSON.stringify(p.solutionMoves||[]),rating:p.rating??null,popularity:p.popularity??null,plays:p.plays??null,themes:JSON.stringify(p.themes||[]),gameUrl:p.gameUrl||null,openingTags:JSON.stringify(p.openingTags||[]),sideToMove:p.sideToMove||null});seeded++;}})();
  return {version:payload.version||'unknown',seeded};
}
function targetThemes(db,studentId){
  const rows=db.prepare("SELECT details FROM assignments WHERE student_id=? AND status IN ('assigned','submitted','completed') ORDER BY created_at DESC LIMIT 12").all(studentId);
  const out=[];
  for(const row of rows){let meta={};try{meta=JSON.parse(row.details||'{}');}catch{};if(meta.kind!=='external_practice')continue;for(const theme of keyThemes[meta.resourceKey]||[])if(!out.includes(theme))out.push(theme);}
  return out.length?out:keyThemes.practice;
}
function targetRating(db,studentId){
  const row=db.prepare(`SELECT ers.rating FROM students s JOIN player_accounts pa ON pa.player_id=s.player_id JOIN external_rating_snapshots ers ON ers.account_id=pa.id
    WHERE s.id=? AND lower(ers.rating_type) IN ('rapid','classical') ORDER BY CASE lower(ers.rating_type) WHEN 'rapid' THEN 0 ELSE 1 END,ers.captured_at DESC LIMIT 1`).get(studentId);
  return Math.max(650,Math.min(1450,Number(row?.rating)||900));
}
export function studentPracticeBank(db,studentId,{limit=3}={}){
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))return null;
  const themes=targetThemes(db,studentId),rating=targetRating(db,studentId);
  const correct=new Set(db.prepare("SELECT DISTINCT puzzle_id AS id FROM practice_bank_attempts WHERE student_id=? AND correct=1").all(studentId).map(x=>x.id));
  const candidates=db.prepare("SELECT id,source_id AS sourceId,fen,rating,popularity,plays,themes_json AS themesJson,side_to_move AS sideToMove FROM practice_bank_puzzles WHERE active=1").all()
    .map(row=>({...row,themes:parse(row.themesJson)})).filter(row=>!correct.has(row.id)&&row.themes.some(t=>themes.includes(t)));
  const near=candidates.filter(row=>Math.abs(Number(row.rating||rating)-rating)<=300);const pool=near.length>=limit?near:candidates;
  pool.sort((a,b)=>hash(`${studentId}:${a.id}`).localeCompare(hash(`${studentId}:${b.id}`)));
  const attempts7d=db.prepare("SELECT COUNT(*) n,SUM(CASE WHEN correct=1 THEN 1 ELSE 0 END) c FROM practice_bank_attempts WHERE student_id=? AND attempted_at>=datetime('now','-7 day')").get(studentId);
  return {targetThemes:themes,targetRating:rating,summary:{attempts7d:Number(attempts7d?.n||0),correct7d:Number(attempts7d?.c||0)},puzzles:pool.slice(0,Math.max(1,Math.min(12,Number(limit)||3))).map(({themesJson,...row})=>row)};
}
export function recordPracticeBankAttempt(db,{studentId,puzzleId,answerMove}={}){
  const puzzle=db.prepare("SELECT id,best_move AS bestMove FROM practice_bank_puzzles WHERE id=? AND active=1").get(puzzleId);
  if(!puzzle||!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))throw new TypeError('practice puzzle not found');
  const answer=norm(answerMove),correct=answer===norm(puzzle.bestMove);
  db.prepare('INSERT INTO practice_bank_attempts(id,puzzle_id,student_id,answer_move,correct) VALUES (?,?,?,?,?)').run(`PBA-${randomUUID()}`,puzzle.id,studentId,answer||null,correct?1:0);
  const stats=db.prepare('SELECT COUNT(*) AS attempts,SUM(CASE WHEN correct=1 THEN 1 ELSE 0 END) AS correctAttempts FROM practice_bank_attempts WHERE student_id=?').get(studentId);
  return {puzzleId:puzzle.id,correct,attempts:Number(stats.attempts||0),correctAttempts:Number(stats.correctAttempts||0)};
}
