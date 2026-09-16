import {normalizeLocale} from './curriculum-localization.js';

const copy={
  en:{noData:'Play more linked games to build your opening profile.',focus:'Opening focus',games:'games',openingErrors:'critical opening errors'},
  es:{noData:'Juega más partidas vinculadas para construir tu perfil de aperturas.',focus:'Prioridad de apertura',games:'partidas',openingErrors:'errores críticos de apertura'}
};

const resultCounts=rows=>({wins:rows.filter(r=>r.result==='win').length,losses:rows.filter(r=>r.result==='loss').length,draws:rows.filter(r=>r.result==='draw').length});
const avg=values=>values.length?Number((values.reduce((a,b)=>a+b,0)/values.length).toFixed(1)):null;

function sourceRows(db,studentId){
  return db.prepare(`SELECT r.source_game_id AS sourceGameId,r.opening_name AS openingName,r.opening_eco AS openingEco,r.result,r.played_at AS playedAt,r.summary_json AS summaryJson,g.student_color AS studentColor
    FROM student_game_reviews r LEFT JOIN academic_external_games g ON g.student_id=r.student_id AND g.external_game_id=r.source_game_id
    WHERE r.student_id=? ORDER BY COALESCE(r.played_at,r.created_at) DESC`).all(studentId).map(r=>({...r,summary:JSON.parse(r.summaryJson||'{}')}));
}

export function studentOpeningProfile(db,studentId,{locale='en'}={}){
  const lang=normalizeLocale(locale);
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))return null;
  const rows=sourceRows(db,studentId),groups=new Map();
  for(const row of rows){
    const name=row.openingName||'Unknown',color=row.studentColor||'unknown',key=`${color}|${row.openingEco||''}|${name}`;
    if(!groups.has(key))groups.set(key,{studentColor:color,openingName:name,openingEco:row.openingEco||null,rows:[]});
    groups.get(key).rows.push(row);
  }
  const openings=[...groups.values()].map(group=>{
    const scores=group.rows.map(r=>Number(r.summary?.openingAvgCpLoss)).filter(Number.isFinite);
    const overall=group.rows.map(r=>Number(r.summary?.avgCpLoss)).filter(Number.isFinite);
    const critical=group.rows.reduce((n,r)=>n+(Number(r.summary?.openingCriticalCount)||0),0);
    const counts=resultCounts(group.rows),openingAvgCpLoss=avg(scores),avgCpLoss=avg(overall);
    const leakScore=Number((((openingAvgCpLoss??avgCpLoss??0)*(1+Math.log1p(group.rows.length)))+(critical*35)).toFixed(1));
    return {...group,rows:undefined,games:group.rows.length,...counts,openingAvgCpLoss,avgCpLoss,criticalOpeningErrors:critical,lastPlayed:group.rows[0]?.playedAt||null,leakScore};
  }).sort((a,b)=>b.games-a.games||b.leakScore-a.leakScore);
  const candidates=openings.filter(o=>o.openingName!=='Unknown');const focus=[...candidates].sort((a,b)=>b.leakScore-a.leakScore||b.games-a.games)[0]||null;
  const focusText=focus?`${copy[lang].focus}: ${focus.openingName}. ${focus.games} ${copy[lang].games} · ${focus.criticalOpeningErrors} ${copy[lang].openingErrors}.`:copy[lang].noData;
  return {studentId,locale:lang,focus,focusText,openings:openings.slice(0,12),gamesAnalyzed:rows.length};
}
