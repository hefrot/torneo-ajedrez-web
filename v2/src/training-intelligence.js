import {randomUUID} from 'node:crypto';
import {normalizeLocale} from './curriculum-localization.js';
import {studentRatingProgress} from './rating-tracking.js';

const skillTitle=(db,skillId,locale='en')=>{
  const base=db.prepare('SELECT title FROM curriculum_skills WHERE id=?').get(skillId)?.title||null;
  if(locale==='en'||!skillId)return base;
  return db.prepare("SELECT title FROM curriculum_localizations WHERE entity_type='skill' AND entity_id=? AND locale=?").get(skillId,locale)?.title||base;
};

export function recordStudentGameReview(db,input={}){
  const studentId=String(input.studentId||'');
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))throw new TypeError('student not found');
  const sourceType=String(input.sourceType||'external');
  if(!['official','historical','external'].includes(sourceType))throw new TypeError('invalid sourceType');
  const sourceGameId=String(input.sourceGameId||'').trim();
  if(!sourceGameId)throw new TypeError('sourceGameId required');
  const id=`SGR-${randomUUID()}`;
  db.prepare(`INSERT INTO student_game_reviews(id,student_id,source_type,source_game_id,platform,played_at,result,opening_name,opening_eco,status,summary_json)
    VALUES (?,?,?,?,?,?,?,?,?,'ready',?) ON CONFLICT(student_id,source_type,source_game_id) DO UPDATE SET platform=excluded.platform,played_at=excluded.played_at,result=excluded.result,opening_name=excluded.opening_name,opening_eco=excluded.opening_eco,summary_json=excluded.summary_json`).run(id,studentId,sourceType,sourceGameId,input.platform||null,input.playedAt||null,input.result||null,input.openingName||null,input.openingEco||null,JSON.stringify(input.summary||{}));
  return {studentId,sourceType,sourceGameId};
}
export function createFindingPuzzle(db,findingId){
  const f=db.prepare(`SELECT id,student_id AS studentId,skill_id AS skillId,fen_before AS fen,move_played AS movePlayed,best_move AS bestMove FROM student_game_findings WHERE id=?`).get(findingId);
  if(!f)throw new TypeError('finding not found');
  if(!f.fen||!f.bestMove)return null;
  const existing=db.prepare('SELECT id FROM training_puzzles WHERE finding_id=?').get(findingId);
  if(existing)return {id:existing.id,created:false};
  const id=`TPZ-${randomUUID()}`;
  db.prepare(`INSERT INTO training_puzzles(id,student_id,finding_id,skill_id,fen,move_played,best_move) VALUES (?,?,?,?,?,?,?)`).run(id,f.studentId,findingId,f.skillId,f.fen,f.movePlayed||null,f.bestMove);
  return {id,created:true};
}

export function createPuzzlesFromFindings(db,studentId){
  const rows=db.prepare(`SELECT id FROM student_game_findings WHERE student_id=? AND fen_before IS NOT NULL AND best_move IS NOT NULL ORDER BY created_at DESC`).all(studentId);
  let created=0;for(const row of rows){const result=createFindingPuzzle(db,row.id);if(result?.created)created+=1;}
  return {studentId,eligible:rows.length,created};
}

export function recordPuzzleAttempt(db,{studentId,puzzleId,answerMove}={}){
  const puzzle=db.prepare("SELECT id,best_move AS bestMove,status FROM training_puzzles WHERE id=? AND student_id=?").get(puzzleId,studentId);
  if(!puzzle)throw new TypeError('puzzle not found');
  const answer=String(answerMove||'').trim();if(!answer)throw new TypeError('answerMove required');
  const correct=answer.toLowerCase()===String(puzzle.bestMove||'').trim().toLowerCase();
  db.prepare(`INSERT INTO training_puzzle_attempts(id,puzzle_id,student_id,answer_move,correct) VALUES (?,?,?,?,?)`).run(`TPA-${randomUUID()}`,puzzleId,studentId,answer,correct?1:0);
  const recent=db.prepare('SELECT correct FROM training_puzzle_attempts WHERE puzzle_id=? ORDER BY attempted_at DESC LIMIT 3').all(puzzleId);
  if(recent.length>=3&&recent.every(r=>r.correct===1))db.prepare("UPDATE training_puzzles SET status='mastered' WHERE id=?").run(puzzleId);
  return {puzzleId,correct,mastered:recent.length>=3&&recent.every(r=>r.correct===1)};
}
function recommendedLesson(db,skillId,locale='en'){
  if(!skillId)return null;
  const row=db.prepare(`SELECT l.id,l.title,l.objective,cl.title AS localizedTitle,cl.objective AS localizedObjective
    FROM lesson_skills ls JOIN lessons l ON l.id=ls.lesson_id
    LEFT JOIN curriculum_localizations cl ON cl.entity_type='lesson' AND cl.entity_id=l.id AND cl.locale=?
    WHERE ls.skill_id=? AND l.active=1 ORDER BY CASE ls.role WHEN 'primary' THEN 0 WHEN 'supporting' THEN 1 ELSE 2 END,l.id LIMIT 1`).get(locale,skillId);
  return row?{id:row.id,title:row.localizedTitle||row.title,objective:row.localizedObjective||row.objective}:null;
}

function leakSummary(db,studentId,locale='en'){
  const rows=db.prepare(`SELECT f.skill_id AS skillId,f.finding_type AS findingType,COUNT(*) AS occurrences,ROUND(AVG(COALESCE(f.severity,1)),2) AS avgSeverity,MAX(f.created_at) AS lastSeen
    FROM student_game_findings f WHERE f.student_id=? GROUP BY f.skill_id,f.finding_type ORDER BY (COUNT(*)*AVG(COALESCE(f.severity,1))) DESC,MAX(f.created_at) DESC`).all(studentId);
  return rows.map(row=>({
    ...row,
    skillTitle:skillTitle(db,row.skillId,locale),
    score:Number((Number(row.occurrences)*Number(row.avgSeverity)).toFixed(2)),
    recommendedLesson:recommendedLesson(db,row.skillId,locale)
  }));
}

function openingSummary(db,studentId){
  const rows=db.prepare(`SELECT COALESCE(opening_name,'Unknown') AS openingName,opening_eco AS openingEco,COUNT(*) AS games,
    SUM(CASE WHEN result IN ('win','1-0','0-1') THEN 1 ELSE 0 END) AS decisiveResults,
    MAX(played_at) AS lastPlayed FROM student_game_reviews WHERE student_id=? GROUP BY COALESCE(opening_name,'Unknown'),opening_eco ORDER BY games DESC,lastPlayed DESC`).all(studentId);
  return rows;
}
const copy={
  en:{noData:'Play or link more games to build your training profile.',focus:'Your current training focus is',puzzles:'mistake puzzles available'},
  es:{noData:'Juega o vincula más partidas para construir tu perfil de entrenamiento.',focus:'Tu prioridad actual de entrenamiento es',puzzles:'problemas creados desde tus errores disponibles'}
};

export function studentTrainingIntelligence(db,studentId,{locale='en'}={}){
  const lang=normalizeLocale(locale);
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))return null;
  createPuzzlesFromFindings(db,studentId);
  const leaks=leakSummary(db,studentId,lang);
  const puzzles=db.prepare(`SELECT p.id,p.fen,p.move_played AS movePlayed,p.best_move AS bestMove,p.status,p.skill_id AS skillId,COUNT(a.id) AS attempts,SUM(CASE WHEN a.correct=1 THEN 1 ELSE 0 END) AS correctAttempts
    FROM training_puzzles p LEFT JOIN training_puzzle_attempts a ON a.puzzle_id=p.id WHERE p.student_id=? GROUP BY p.id ORDER BY CASE p.status WHEN 'active' THEN 0 ELSE 1 END,p.created_at DESC LIMIT 30`).all(studentId).map(p=>({...p,skillTitle:skillTitle(db,p.skillId,lang)}));
  const reviews=db.prepare(`SELECT id,source_type AS sourceType,source_game_id AS sourceGameId,platform,played_at AS playedAt,result,opening_name AS openingName,opening_eco AS openingEco,status,summary_json AS summaryJson FROM student_game_reviews WHERE student_id=? ORDER BY COALESCE(played_at,created_at) DESC LIMIT 20`).all(studentId).map(r=>({...r,summary:JSON.parse(r.summaryJson||'{}')}));
  const activePuzzles=puzzles.filter(p=>p.status==='active').length;
  const top=leaks[0]||null;
  const coachInsight=top?`${copy[lang].focus} ${top.skillTitle||top.findingType}. ${top.occurrences}× · severity ${top.avgSeverity}/5.`:copy[lang].noData;
  return {studentId,locale:lang,coachInsight,topLeaks:leaks.slice(0,8),puzzles,activePuzzles,reviews,openings:openingSummary(db,studentId),ratings:studentRatingProgress(db,studentId),summary:{findings:leaks.reduce((n,x)=>n+Number(x.occurrences),0),activePuzzles,reviewedGames:reviews.length}};
}
