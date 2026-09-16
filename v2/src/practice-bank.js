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
const practiceThemeCodes=['fork','pin','hangingPiece','skewer','discoveredAttack','deflection','backRankMate','mateIn2','endgame'];

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
function externalSeedRating(db,studentId){
  const row=db.prepare(`SELECT ers.rating,lower(ers.rating_type) AS ratingType FROM students s JOIN player_accounts pa ON pa.player_id=s.player_id JOIN external_rating_snapshots ers ON ers.account_id=pa.id
    WHERE s.id=? AND lower(ers.rating_type) IN ('rapid','classical') ORDER BY CASE lower(ers.rating_type) WHEN 'rapid' THEN 0 ELSE 1 END,ers.captured_at DESC LIMIT 1`).get(studentId);
  return {rating:Math.max(650,Math.min(1450,Number(row?.rating)||900)),source:row?`external_${row.ratingType}`:'default'};
}
function ensurePracticeProfile(db,studentId){
  let row=db.prepare('SELECT student_id AS studentId,rating,attempts,correct,streak,best_streak AS bestStreak,seed_source AS seedSource,updated_at AS updatedAt FROM student_practice_profiles WHERE student_id=?').get(studentId);
  if(row)return row;
  const seed=externalSeedRating(db,studentId);
  db.prepare('INSERT INTO student_practice_profiles(student_id,rating,seed_source) VALUES (?,?,?)').run(studentId,seed.rating,seed.source);
  return db.prepare('SELECT student_id AS studentId,rating,attempts,correct,streak,best_streak AS bestStreak,seed_source AS seedSource,updated_at AS updatedAt FROM student_practice_profiles WHERE student_id=?').get(studentId);
}
export function studentPracticeProfile(db,studentId){
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))return null;
  const row=ensurePracticeProfile(db,studentId);const attempts=Number(row.attempts||0),correct=Number(row.correct||0);
  return {...row,attempts,correct,accuracy:attempts?Math.round(correct/attempts*100):null};
}
export function studentPracticeBank(db,studentId,{limit=3}={}){
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))return null;
  const themes=targetThemes(db,studentId),profile=studentPracticeProfile(db,studentId),rating=profile.rating;
  const correct=new Set(db.prepare("SELECT DISTINCT puzzle_id AS id FROM practice_bank_attempts WHERE student_id=? AND correct=1").all(studentId).map(x=>x.id));
  const candidates=db.prepare("SELECT id,source_id AS sourceId,fen,rating,popularity,plays,themes_json AS themesJson,side_to_move AS sideToMove FROM practice_bank_puzzles WHERE active=1").all()
    .map(row=>({...row,themes:parse(row.themesJson)})).filter(row=>!correct.has(row.id)&&row.themes.some(t=>themes.includes(t)));
  const near=candidates.filter(row=>Math.abs(Number(row.rating||rating)-rating)<=300);const pool=near.length>=limit?near:candidates;
  pool.sort((a,b)=>hash(`${studentId}:${a.id}`).localeCompare(hash(`${studentId}:${b.id}`)));
  const attempts7d=db.prepare("SELECT COUNT(*) n,SUM(CASE WHEN correct=1 THEN 1 ELSE 0 END) c FROM practice_bank_attempts WHERE student_id=? AND attempted_at>=datetime('now','-7 day')").get(studentId);
  const history=db.prepare(`SELECT a.puzzle_id AS puzzleId,a.correct,a.puzzle_rating AS puzzleRating,a.rating_before AS ratingBefore,a.rating_after AS ratingAfter,a.attempted_at AS attemptedAt,p.themes_json AS themesJson
    FROM practice_bank_attempts a JOIN practice_bank_puzzles p ON p.id=a.puzzle_id
    WHERE a.student_id=? AND a.rowid=(SELECT MIN(x.rowid) FROM practice_bank_attempts x WHERE x.student_id=a.student_id AND x.puzzle_id=a.puzzle_id)
    ORDER BY a.attempted_at DESC LIMIT 30`).all(studentId).map(row=>({...row,themes:parse(row.themesJson)}));
  const byTheme=new Map();for(const row of history){for(const theme of row.themes||[]){if(['short','long','veryLong','middlegame','endgame','advantage','crushing'].includes(theme))continue;const x=byTheme.get(theme)||{theme,attempts:0,correct:0};x.attempts++;x.correct+=row.correct?1:0;byTheme.set(theme,x);}}
  const themeStats=[...byTheme.values()].map(x=>({...x,accuracy:Math.round(x.correct/x.attempts*100)})).sort((a,b)=>b.attempts-a.attempts||b.accuracy-a.accuracy).slice(0,8);
  const activeStreak=db.prepare("SELECT id,score FROM practice_streak_runs WHERE student_id=? AND status='in_progress' ORDER BY started_at DESC LIMIT 1").get(studentId),bestStreakRun=Number(db.prepare("SELECT MAX(score) AS n FROM practice_streak_runs WHERE student_id=? AND status='completed'").get(studentId)?.n||0);
  const activeStorm=db.prepare("SELECT id,score,mistakes,expires_at AS expiresAt FROM practice_storm_runs WHERE student_id=? AND status='in_progress' ORDER BY started_at DESC LIMIT 1").get(studentId),bestStorm=Number(db.prepare("SELECT MAX(score) AS n FROM practice_storm_runs WHERE student_id=? AND status='completed'").get(studentId)?.n||0);
  return {targetThemes:themes,targetRating:rating,profile,history:history.reverse().map(({themesJson,...row})=>row),themeStats,streakMode:{activeRunId:activeStreak?.id||null,current:Number(activeStreak?.score||0),best:bestStreakRun},stormMode:{activeRunId:activeStorm?.id||null,current:Number(activeStorm?.score||0),mistakes:Number(activeStorm?.mistakes||0),expiresAt:activeStorm?.expiresAt||null,best:bestStorm},summary:{attempts7d:Number(attempts7d?.n||0),correct7d:Number(attempts7d?.c||0)},puzzles:pool.slice(0,Math.max(1,Math.min(12,Number(limit)||3))).map(({themesJson,...row})=>row)};
}
export function practiceThemeCatalog(db,studentId){
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))return null;
  const recommended=new Set(targetThemes(db,studentId)),rows=db.prepare("SELECT id,themes_json AS themesJson FROM practice_bank_puzzles WHERE active=1").all();
  const firstAttempts=db.prepare(`SELECT a.puzzle_id AS puzzleId,a.correct,p.themes_json AS themesJson FROM practice_bank_attempts a JOIN practice_bank_puzzles p ON p.id=a.puzzle_id WHERE a.student_id=? AND a.rowid=(SELECT MIN(x.rowid) FROM practice_bank_attempts x WHERE x.student_id=a.student_id AND x.puzzle_id=a.puzzle_id)`).all(studentId);
  return practiceThemeCodes.map(theme=>{const total=rows.filter(r=>parse(r.themesJson).includes(theme)).length;const attempts=firstAttempts.filter(r=>parse(r.themesJson).includes(theme));const correct=attempts.filter(r=>r.correct).length;return {theme,total,attempts:attempts.length,correct,accuracy:attempts.length?Math.round(correct/attempts.length*100):null,recommended:recommended.has(theme)};}).filter(x=>x.total>0).sort((a,b)=>Number(b.recommended)-Number(a.recommended)||b.total-a.total);
}
export function practiceThemePuzzle(db,studentId,theme){
  if(!practiceThemeCodes.includes(theme)||!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))return null;
  const rating=studentPracticeProfile(db,studentId).rating,solved=new Set(db.prepare("SELECT DISTINCT puzzle_id AS id FROM practice_bank_attempts WHERE student_id=? AND correct=1").all(studentId).map(x=>x.id));
  const rows=db.prepare("SELECT id,source_id AS sourceId,fen,rating,popularity,plays,themes_json AS themesJson,side_to_move AS sideToMove FROM practice_bank_puzzles WHERE active=1").all().filter(r=>parse(r.themesJson).includes(theme)&&!solved.has(r.id));
  if(!rows.length)return null;rows.sort((a,b)=>Math.abs(Number(a.rating||rating)-rating)-Math.abs(Number(b.rating||rating)-rating)||Number(b.popularity||0)-Number(a.popularity||0)||hash(`${studentId}:${theme}:${a.id}`).localeCompare(hash(`${studentId}:${theme}:${b.id}`)));
  return safeBankPuzzle(rows[0]);
}

export function recordPracticeBankAttempt(db,{studentId,puzzleId,answerMove}={}){
  const puzzle=db.prepare("SELECT id,best_move AS bestMove,rating FROM practice_bank_puzzles WHERE id=? AND active=1").get(puzzleId);
  if(!puzzle||!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))throw new TypeError('practice puzzle not found');
  const answer=norm(answerMove),correct=answer===norm(puzzle.bestMove);let result;
  db.transaction(()=>{
    const profile=studentPracticeProfile(db,studentId),before=Number(profile.rating),puzzleRating=Number(puzzle.rating)||before;
    const prior=Number(db.prepare('SELECT COUNT(*) AS n FROM practice_bank_attempts WHERE student_id=? AND puzzle_id=?').get(studentId,puzzle.id)?.n||0),rated=prior===0;
    const expected=1/(1+Math.pow(10,(puzzleRating-before)/400)),k=profile.attempts<20?40:24;
    const after=rated?Math.max(400,Math.min(2500,Math.round(before+k*((correct?1:0)-expected)))):before;
    const streak=rated?(correct?Number(profile.streak||0)+1:0):Number(profile.streak||0),best=Math.max(Number(profile.bestStreak||0),streak);
    const attemptId=`PBA-${randomUUID()}`;
    db.prepare(`INSERT INTO practice_bank_attempts(id,puzzle_id,student_id,answer_move,correct,puzzle_rating,rating_before,rating_after,streak_after)
      VALUES (?,?,?,?,?,?,?,?,?)`).run(attemptId,puzzle.id,studentId,answer||null,correct?1:0,puzzleRating,before,after,streak);
    if(rated)db.prepare(`UPDATE student_practice_profiles SET rating=?,attempts=attempts+1,correct=correct+?,streak=?,best_streak=?,updated_at=CURRENT_TIMESTAMP WHERE student_id=?`)
      .run(after,correct?1:0,streak,best,studentId);
    result={attemptId,puzzleId:puzzle.id,correct,rated,puzzleRating,ratingBefore:before,ratingAfter:after,ratingDelta:after-before,streak,bestStreak:best};
  })();
  return {...result,profile:studentPracticeProfile(db,studentId)};
}

function safeBankPuzzle(row){if(!row)return null;return {id:row.id,sourceId:row.sourceId,fen:row.fen,rating:row.rating,popularity:row.popularity,plays:row.plays,sideToMove:row.sideToMove,themes:parse(row.themesJson)};}
function pickStreakPuzzle(db,studentId,runId,score){
  const profile=studentPracticeProfile(db,studentId),themes=targetThemes(db,studentId),target=Math.max(600,Math.min(1800,profile.rating-100+Number(score||0)*35));
  const attempted=new Set(db.prepare('SELECT DISTINCT puzzle_id AS id FROM practice_bank_attempts WHERE student_id=?').all(studentId).map(x=>x.id));
  const used=new Set(db.prepare('SELECT puzzle_id AS id FROM practice_streak_items WHERE run_id=?').all(runId).map(x=>x.id));
  const rows=db.prepare(`SELECT id,source_id AS sourceId,fen,rating,popularity,plays,themes_json AS themesJson,side_to_move AS sideToMove FROM practice_bank_puzzles WHERE active=1`).all();
  let pool=rows.filter(row=>!used.has(row.id)&&!attempted.has(row.id)&&parse(row.themesJson).some(t=>themes.includes(t)));
  if(!pool.length)pool=rows.filter(row=>!used.has(row.id)&&parse(row.themesJson).some(t=>themes.includes(t)));
  if(!pool.length)return null;
  pool.sort((a,b)=>Math.abs(Number(a.rating||target)-target)-Math.abs(Number(b.rating||target)-target)||Number(b.popularity||0)-Number(a.popularity||0)||hash(`${runId}:${a.id}`).localeCompare(hash(`${runId}:${b.id}`)));
  return safeBankPuzzle(pool[0]);
}
function streakRunRow(db,runId,studentId){return db.prepare(`SELECT id,student_id AS studentId,status,score,current_puzzle_id AS currentPuzzleId,started_rating AS startedRating,started_at AS startedAt,completed_at AS completedAt FROM practice_streak_runs WHERE id=? AND student_id=?`).get(runId,studentId);}
export function practiceStreakState(db,{studentId,runId}={}){
  const run=streakRunRow(db,runId,studentId);if(!run)return null;
  const puzzle=run.currentPuzzleId?safeBankPuzzle(db.prepare(`SELECT id,source_id AS sourceId,fen,rating,popularity,plays,themes_json AS themesJson,side_to_move AS sideToMove FROM practice_bank_puzzles WHERE id=?`).get(run.currentPuzzleId)):null;
  const best=Number(db.prepare("SELECT MAX(score) AS n FROM practice_streak_runs WHERE student_id=? AND status='completed'").get(studentId)?.n||0);
  return {...run,score:Number(run.score||0),best,puzzle,profile:studentPracticeProfile(db,studentId)};
}
export function startPracticeStreak(db,{studentId}={}){
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))throw new TypeError('student not found');
  const existing=db.prepare("SELECT id FROM practice_streak_runs WHERE student_id=? AND status='in_progress' ORDER BY started_at DESC LIMIT 1").get(studentId);if(existing)return practiceStreakState(db,{studentId,runId:existing.id});
  const profile=studentPracticeProfile(db,studentId),runId=`PST-${randomUUID()}`;
  db.prepare("INSERT INTO practice_streak_runs(id,student_id,started_rating) VALUES (?,?,?)").run(runId,studentId,profile.rating);
  const puzzle=pickStreakPuzzle(db,studentId,runId,0);if(!puzzle){db.prepare("UPDATE practice_streak_runs SET status='completed',completed_at=CURRENT_TIMESTAMP WHERE id=?").run(runId);return practiceStreakState(db,{studentId,runId});}
  db.prepare('UPDATE practice_streak_runs SET current_puzzle_id=? WHERE id=?').run(puzzle.id,runId);db.prepare('INSERT INTO practice_streak_items(run_id,sequence_no,puzzle_id) VALUES (?,?,?)').run(runId,1,puzzle.id);
  return practiceStreakState(db,{studentId,runId});
}
export function submitPracticeStreakMove(db,{studentId,runId,answerMove}={}){
  const run=streakRunRow(db,runId,studentId);if(!run||run.status!=='in_progress'||!run.currentPuzzleId)throw new TypeError('streak run not active');
  let result;
  db.transaction(()=>{
    const attempt=recordPracticeBankAttempt(db,{studentId,puzzleId:run.currentPuzzleId,answerMove});
    const seq=Number(run.score||0)+1;db.prepare('UPDATE practice_streak_items SET attempt_id=?,correct=? WHERE run_id=? AND sequence_no=?').run(attempt.attemptId,attempt.correct?1:0,runId,seq);
    if(!attempt.correct){db.prepare("UPDATE practice_streak_runs SET status='completed',current_puzzle_id=NULL,completed_at=CURRENT_TIMESTAMP WHERE id=?").run(runId);result={...attempt,ended:true};return;}
    const score=Number(run.score||0)+1,next=pickStreakPuzzle(db,studentId,runId,score);
    if(!next){db.prepare("UPDATE practice_streak_runs SET status='completed',score=?,current_puzzle_id=NULL,completed_at=CURRENT_TIMESTAMP WHERE id=?").run(score,runId);result={...attempt,ended:true};return;}
    db.prepare('UPDATE practice_streak_runs SET score=?,current_puzzle_id=? WHERE id=?').run(score,next.id,runId);db.prepare('INSERT INTO practice_streak_items(run_id,sequence_no,puzzle_id) VALUES (?,?,?)').run(runId,score+1,next.id);result={...attempt,ended:false};
  })();
  return {...result,state:practiceStreakState(db,{studentId,runId})};
}

function pickStormPuzzle(db,studentId,runId,sequenceNo){
  const profile=studentPracticeProfile(db,studentId),target=Number(profile.rating||900),themes=[...new Set([...targetThemes(db,studentId),...keyThemes.practice])];
  const used=new Set(db.prepare('SELECT puzzle_id AS id FROM practice_storm_items WHERE run_id=?').all(runId).map(x=>x.id));
  const rows=db.prepare(`SELECT id,source_id AS sourceId,fen,rating,popularity,plays,themes_json AS themesJson,side_to_move AS sideToMove FROM practice_bank_puzzles WHERE active=1`).all();
  let pool=rows.filter(row=>!used.has(row.id)&&parse(row.themesJson).some(t=>themes.includes(t))&&Math.abs(Number(row.rating||target)-target)<=280);
  if(!pool.length)pool=rows.filter(row=>!used.has(row.id)&&parse(row.themesJson).some(t=>themes.includes(t)));
  if(!pool.length)return null;
  pool.sort((a,b)=>hash(`${runId}:${sequenceNo}:${a.id}`).localeCompare(hash(`${runId}:${sequenceNo}:${b.id}`)));
  return safeBankPuzzle(pool[0]);
}
function stormRunRow(db,runId,studentId){return db.prepare(`SELECT id,student_id AS studentId,status,score,mistakes,duration_seconds AS durationSeconds,current_puzzle_id AS currentPuzzleId,started_at AS startedAt,expires_at AS expiresAt,completed_at AS completedAt FROM practice_storm_runs WHERE id=? AND student_id=?`).get(runId,studentId);}
export function practiceStormState(db,{studentId,runId,now=new Date()}={}){
  let run=stormRunRow(db,runId,studentId);if(!run)return null;
  const nowMs=new Date(now).getTime(),expiresMs=Date.parse(run.expiresAt);
  if(run.status==='in_progress'&&Number.isFinite(expiresMs)&&nowMs>=expiresMs){const at=new Date(nowMs).toISOString();db.prepare("UPDATE practice_storm_runs SET status='completed',current_puzzle_id=NULL,completed_at=? WHERE id=?").run(at,runId);run=stormRunRow(db,runId,studentId);}
  const puzzle=run.currentPuzzleId?safeBankPuzzle(db.prepare(`SELECT id,source_id AS sourceId,fen,rating,popularity,plays,themes_json AS themesJson,side_to_move AS sideToMove FROM practice_bank_puzzles WHERE id=?`).get(run.currentPuzzleId)):null;
  const best=Number(db.prepare("SELECT MAX(score) AS n FROM practice_storm_runs WHERE student_id=? AND status='completed'").get(studentId)?.n||0),remainingSeconds=run.status==='in_progress'?Math.max(0,Math.ceil((Date.parse(run.expiresAt)-nowMs)/1000)):0;
  return {...run,score:Number(run.score||0),mistakes:Number(run.mistakes||0),best,remainingSeconds,puzzle};
}
export function startPracticeStorm(db,{studentId,durationSeconds=180,now=new Date()}={}){
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))throw new TypeError('student not found');
  const existing=db.prepare("SELECT id FROM practice_storm_runs WHERE student_id=? AND status='in_progress' ORDER BY started_at DESC LIMIT 1").get(studentId);if(existing){const state=practiceStormState(db,{studentId,runId:existing.id,now});if(state?.status==='in_progress')return state;}
  const duration=Math.max(60,Math.min(600,Number(durationSeconds)||180)),start=new Date(now),runId=`PSM-${randomUUID()}`,expires=new Date(start.getTime()+duration*1000);
  db.prepare('INSERT INTO practice_storm_runs(id,student_id,duration_seconds,started_at,expires_at) VALUES (?,?,?,?,?)').run(runId,studentId,duration,start.toISOString(),expires.toISOString());
  const puzzle=pickStormPuzzle(db,studentId,runId,1);if(!puzzle){db.prepare("UPDATE practice_storm_runs SET status='completed',completed_at=?,current_puzzle_id=NULL WHERE id=?").run(start.toISOString(),runId);return practiceStormState(db,{studentId,runId,now});}
  db.prepare('UPDATE practice_storm_runs SET current_puzzle_id=? WHERE id=?').run(puzzle.id,runId);db.prepare('INSERT INTO practice_storm_items(run_id,sequence_no,puzzle_id) VALUES (?,?,?)').run(runId,1,puzzle.id);return practiceStormState(db,{studentId,runId,now});
}
export function submitPracticeStormMove(db,{studentId,runId,answerMove,now=new Date()}={}){
  const state=practiceStormState(db,{studentId,runId,now});if(!state||state.status!=='in_progress'||!state.currentPuzzleId)throw new TypeError('storm run not active');
  const puzzle=db.prepare('SELECT best_move AS bestMove FROM practice_bank_puzzles WHERE id=?').get(state.currentPuzzleId),answer=norm(answerMove),correct=answer===norm(puzzle?.bestMove),at=new Date(now).toISOString();let nextState;
  db.transaction(()=>{
    const seq=Number(state.score||0)+Number(state.mistakes||0)+1;db.prepare('UPDATE practice_storm_items SET answer_move=?,correct=?,answered_at=? WHERE run_id=? AND sequence_no=?').run(answer||null,correct?1:0,at,runId,seq);
    const score=Number(state.score||0)+(correct?1:0),mistakes=Number(state.mistakes||0)+(correct?0:1),next=pickStormPuzzle(db,studentId,runId,seq+1);
    if(!next){db.prepare("UPDATE practice_storm_runs SET status='completed',score=?,mistakes=?,current_puzzle_id=NULL,completed_at=? WHERE id=?").run(score,mistakes,at,runId);return;}
    db.prepare('UPDATE practice_storm_runs SET score=?,mistakes=?,current_puzzle_id=? WHERE id=?').run(score,mistakes,next.id,runId);db.prepare('INSERT INTO practice_storm_items(run_id,sequence_no,puzzle_id) VALUES (?,?,?)').run(runId,seq+1,next.id);
  })();
  nextState=practiceStormState(db,{studentId,runId,now});return {correct,state:nextState};
}
