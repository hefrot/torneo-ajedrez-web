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
  const f=db.prepare(`SELECT id,student_id AS studentId,skill_id AS skillId,fen_before AS fen,move_played AS movePlayed,best_move AS bestMove,solution_margin_cp AS solutionMarginCp,classifier_source AS classifierSource FROM student_game_findings WHERE id=?`).get(findingId);
  if(!f)throw new TypeError('finding not found');
  if(!f.fen||!f.bestMove)return null;
  const automatic=String(f.classifierSource||'').startsWith('academic-stockfish');
  if(automatic&&Number(f.solutionMarginCp||0)<200)return null;
  const existing=db.prepare('SELECT id FROM training_puzzles WHERE finding_id=?').get(findingId);
  if(existing)return {id:existing.id,created:false};
  const id=`TPZ-${randomUUID()}`;
  db.prepare(`INSERT INTO training_puzzles(id,student_id,finding_id,skill_id,fen,move_played,best_move,solution_margin_cp) VALUES (?,?,?,?,?,?,?,?)`).run(id,f.studentId,findingId,f.skillId,f.fen,f.movePlayed||null,f.bestMove,f.solutionMarginCp??null);
  return {id,created:true};
}

export function createPuzzlesFromFindings(db,studentId){
  const rows=db.prepare(`SELECT id FROM student_game_findings WHERE student_id=? AND fen_before IS NOT NULL AND best_move IS NOT NULL ORDER BY created_at DESC`).all(studentId);
  let created=0;for(const row of rows){const result=createFindingPuzzle(db,row.id);if(result?.created)created+=1;}
  return {studentId,eligible:rows.length,created};
}

export function recordPuzzleAttempt(db,{studentId,puzzleId,answerMove,now=new Date()}={}){
  const puzzle=db.prepare("SELECT id,best_move AS bestMove,status FROM training_puzzles WHERE id=? AND student_id=?").get(puzzleId,studentId);
  if(!puzzle)throw new TypeError('puzzle not found');
  const answer=String(answerMove||'').trim();if(!answer)throw new TypeError('answerMove required');
  const correct=answer.toLowerCase()===String(puzzle.bestMove||'').trim().toLowerCase();
  const attemptedAt=now.toISOString();
  db.prepare(`INSERT INTO training_puzzle_attempts(id,puzzle_id,student_id,answer_move,correct,attempted_at) VALUES (?,?,?,?,?,?)`).run(`TPA-${randomUUID()}`,puzzleId,studentId,answer,correct?1:0,attemptedAt);
  const correctRows=db.prepare('SELECT attempted_at AS attemptedAt FROM training_puzzle_attempts WHERE puzzle_id=? AND correct=1 ORDER BY attempted_at').all(puzzleId);
  let spaced=0,last=null;for(const row of correctRows){const at=Date.parse(row.attemptedAt);if(!Number.isFinite(at))continue;if(last==null||at-last>=86400000){spaced+=1;last=at;}}
  const mastered=spaced>=3;if(mastered){db.prepare("UPDATE training_puzzles SET status='mastered' WHERE id=?").run(puzzleId);const full=db.prepare('SELECT skill_id AS skillId FROM training_puzzles WHERE id=?').get(puzzleId);if(full?.skillId){const state=db.prepare('SELECT status,evidence_json AS evidenceJson FROM student_skills WHERE student_id=? AND skill_id=?').get(studentId,full.skillId);if(state?.status!=='regressed'&&state?.status!=='applied_in_game'){let evidence={};try{evidence=JSON.parse(state?.evidenceJson||'{}');}catch{};evidence={...evidence,drill:{puzzleId,spacedCorrectAttempts:spaced,masteredAt:attemptedAt}};db.prepare(`INSERT INTO student_skills(student_id,skill_id,status,confidence,evidence_json,last_assessed_at,updated_at) VALUES (?,?,'drill_mastered',85,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(student_id,skill_id) DO UPDATE SET status='drill_mastered',confidence=MAX(COALESCE(student_skills.confidence,0),85),evidence_json=excluded.evidence_json,last_assessed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`).run(studentId,full.skillId,JSON.stringify(evidence));}}}
  return {puzzleId,correct,mastered,spacedCorrectAttempts:spaced};
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
  const rows=db.prepare(`SELECT f.skill_id AS skillId,cs.code AS skillCode,f.finding_type AS findingType,COUNT(*) AS occurrences,ROUND(AVG(COALESCE(f.severity,1)),2) AS avgSeverity,MAX(f.created_at) AS lastSeen
    FROM student_game_findings f LEFT JOIN curriculum_skills cs ON cs.id=f.skill_id WHERE f.student_id=? GROUP BY f.skill_id,cs.code,f.finding_type ORDER BY (COUNT(*)*AVG(COALESCE(f.severity,1))) DESC,MAX(f.created_at) DESC`).all(studentId);
  return rows.map(row=>({
    ...row,
    skillTitle:skillTitle(db,row.skillId,locale),
    score:Number((Number(row.occurrences)*Number(row.avgSeverity)).toFixed(2)),
    recommendedLesson:recommendedLesson(db,row.skillId,locale)
  }));
}

const familyGameModeFactor=value=>({rapid:1,classical:1,correspondence:1,daily:1,blitz:.25,bullet:0,ultrabullet:0}[String(value||'').toLowerCase()]??.75);
function familyLeakSummary(db,studentId,locale='en'){
  const rows=db.prepare(`SELECT f.skill_id AS skillId,cs.code AS skillCode,f.finding_type AS findingType,f.severity,COALESCE(g.time_class,'unknown') AS timeClass,COALESCE(g.played_at,f.created_at) AS evidenceAt FROM student_game_findings f LEFT JOIN curriculum_skills cs ON cs.id=f.skill_id LEFT JOIN academic_external_games g ON g.student_id=f.student_id AND g.external_game_id=f.source_game_id WHERE f.student_id=?`).all(studentId);
  const grouped=new Map();
  for(const row of rows){const factor=familyGameModeFactor(row.timeClass);if(factor<=0)continue;const key=`${row.skillId||'none'}:${row.findingType}`;if(!grouped.has(key))grouped.set(key,{skillId:row.skillId,skillCode:row.skillCode,findingType:row.findingType,occurrences:0,effectiveOccurrences:0,severitySum:0,lastSeen:null});const g=grouped.get(key);g.occurrences++;g.effectiveOccurrences+=factor;g.severitySum+=Number(row.severity||1)*factor;g.lastSeen=!g.lastSeen||String(row.evidenceAt)>g.lastSeen?row.evidenceAt:g.lastSeen;}
  return [...grouped.values()].map(row=>{const avgSeverity=row.effectiveOccurrences?row.severitySum/row.effectiveOccurrences:0;return {...row,avgSeverity:Number(avgSeverity.toFixed(2)),effectiveOccurrences:Number(row.effectiveOccurrences.toFixed(2)),skillTitle:skillTitle(db,row.skillId,locale),score:Number((row.effectiveOccurrences*avgSeverity).toFixed(2)),recommendedLesson:recommendedLesson(db,row.skillId,locale)};}).sort((a,b)=>b.score-a.score||String(b.lastSeen||'').localeCompare(String(a.lastSeen||'')));
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

export function studentTrainingIntelligence(db,studentId,{locale='en',includeTechnical=false}={}){
  const lang=normalizeLocale(locale);
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))return null;
  createPuzzlesFromFindings(db,studentId);
  const leaks=leakSummary(db,studentId,lang);
  const familyLeaks=familyLeakSummary(db,studentId,lang);
  const puzzles=db.prepare(`SELECT p.id,p.fen,p.move_played AS movePlayed,p.best_move AS bestMove,p.status,p.skill_id AS skillId,COUNT(a.id) AS attempts,SUM(CASE WHEN a.correct=1 THEN 1 ELSE 0 END) AS correctAttempts
    FROM training_puzzles p LEFT JOIN training_puzzle_attempts a ON a.puzzle_id=p.id WHERE p.student_id=? GROUP BY p.id ORDER BY CASE p.status WHEN 'active' THEN 0 ELSE 1 END,p.created_at DESC LIMIT 30`).all(studentId).map(p=>({...p,skillTitle:skillTitle(db,p.skillId,lang)}));
  const reviews=db.prepare(`SELECT id,source_type AS sourceType,source_game_id AS sourceGameId,platform,played_at AS playedAt,result,opening_name AS openingName,opening_eco AS openingEco,status,summary_json AS summaryJson FROM student_game_reviews WHERE student_id=? ORDER BY COALESCE(played_at,created_at) DESC LIMIT 20`).all(studentId).map(r=>({...r,summary:JSON.parse(r.summaryJson||'{}')}));
  const activePuzzles=puzzles.filter(p=>p.status==='active').length;
  const safePuzzles=includeTechnical?puzzles:puzzles.map(({bestMove,...rest})=>rest);
  const top=leaks[0]||null;
  const coachInsight=top?`${copy[lang].focus} ${top.skillTitle||top.findingType}. ${top.occurrences}× · severity ${top.avgSeverity}/5.`:copy[lang].noData;
  const recentFindings=includeTechnical?db.prepare(`SELECT f.id,f.source_game_id AS sourceGameId,f.finding_type AS findingType,f.severity,f.engine_cp_loss AS cpLoss,f.classifier_confidence AS classifierConfidence,f.classifier_source AS classifierSource,f.ply,f.move_number AS moveNumber,f.move_played AS movePlayed,f.best_move AS bestMove,f.created_at AS createdAt,f.skill_id AS skillId FROM student_game_findings f WHERE f.student_id=? ORDER BY f.created_at DESC LIMIT 30`).all(studentId).map(f=>({...f,skillTitle:skillTitle(db,f.skillId,lang)})):undefined;
  return {studentId,locale:lang,coachInsight,topLeaks:leaks.slice(0,8),familyTopLeaks:familyLeaks.slice(0,8),puzzles:safePuzzles,activePuzzles,reviews,openings:openingSummary(db,studentId),ratings:studentRatingProgress(db,studentId),summary:{findings:leaks.reduce((n,x)=>n+Number(x.occurrences),0),activePuzzles,reviewedGames:reviews.length},...(includeTechnical?{recentFindings}:{})};
}
