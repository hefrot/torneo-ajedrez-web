import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {HMENA_FRAMEWORK_ID,getHmenaPlacement,placeStudentInHmena} from './hmena-curriculum.js';
import {studentPlayStyleProfile} from './play-style-profile.js';

const DATA=JSON.parse(fs.readFileSync(new URL('../data/advanced-diagnostic-items-v1.json',import.meta.url),'utf8'));
const PASS_COUNT=5;
const bands=['1200-1600','1600-2000','2000-2300','2300-2500'];
const meta={
 '1200-1600':{id:'DIAG-HMENA-1200-1600',code:'hmena-1200-1600-v1',title:'CIS 1200–1600 Advanced Screen',min:1200,max:1600},
 '1600-2000':{id:'DIAG-HMENA-1600-2000',code:'hmena-1600-2000-v1',title:'CIS 1600–2000 Advanced Screen',min:1600,max:2000},
 '2000-2300':{id:'DIAG-HMENA-2000-2300',code:'hmena-2000-2300-v1',title:'CIS 2000–2300 Expert Screen',min:2000,max:2300},
 '2300-2500':{id:'DIAG-HMENA-2300-2500',code:'hmena-2300-2500-v1',title:'CIS 2300–2500 High Performance Screen',min:2300,max:2500},
};
const localeOf=v=>String(v||'en').toLowerCase()==='es'?'es':'en';
const authorized=(db,accountId,studentId)=>Boolean(db.prepare('SELECT 1 FROM portal_account_students WHERE account_id=? AND student_id=?').get(accountId,studentId));
const bandCode=band=>`hmena-${band}`;
const bandFromCode=code=>bands.find(b=>bandCode(b)===code)||null;
const nextBand=band=>bands[bands.indexOf(band)+1]||null;

const skillIdByCode=(db,code)=>db.prepare(`SELECT s.id FROM curriculum_skills s JOIN curriculum_tracks t ON t.id=s.track_id WHERE s.code=? AND t.framework_id=?`).get(code,HMENA_FRAMEWORK_ID)?.id;
const itemForClient=row=>({id:row.id,skillCode:row.skill_code,sequence:row.sequence_no,fen:row.fen,prompt:row.prompt,options:JSON.parse(row.options_json||'[]')});

export function seedAdvancedDiagnostics(db){
  const bp=db.prepare(`INSERT INTO diagnostic_blueprints(id,code,title,min_rating,max_rating,active) VALUES (?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET title=excluded.title,min_rating=excluded.min_rating,max_rating=excluded.max_rating,active=1`);
  const item=db.prepare(`INSERT INTO diagnostic_items(id,blueprint_id,skill_id,stage,sequence_no,is_anchor,fen,correct_answer,active) VALUES (?,?,?,'development',?,0,?,?,1) ON CONFLICT(id) DO UPDATE SET skill_id=excluded.skill_id,sequence_no=excluded.sequence_no,fen=excluded.fen,correct_answer=excluded.correct_answer,active=1`);
  const loc=db.prepare(`INSERT INTO diagnostic_item_localizations(item_id,locale,prompt,options_json) VALUES (?,?,?,?) ON CONFLICT(item_id,locale) DO UPDATE SET prompt=excluded.prompt,options_json=excluded.options_json`);
  db.transaction(()=>{
    for(const band of bands){const m=meta[band];bp.run(m.id,m.code,m.title,m.min,m.max);let seq=0;
      for(const row of DATA.items.filter(x=>x.band===band)){const sid=skillIdByCode(db,row.skillCode);if(!sid)throw new Error(`missing skill ${row.skillCode}`);seq++;
        item.run(row.id,m.id,sid,seq,row.fen,row.correctAnswer);
        const opts=row.options.map(x=>x.san);loc.run(row.id,'en','Choose the strongest move in the position.',JSON.stringify(opts));loc.run(row.id,'es','Elige la jugada más fuerte en la posición.',JSON.stringify(opts));
      }
    }
  })();
  return {bands:bands.length,items:DATA.items.length};
}

export function startAdvancedDiagnostic(db,{accountId,studentId,locale='en'}={}){
  if(!authorized(db,accountId,studentId))throw new TypeError('student not authorized');
  seedAdvancedDiagnostics(db);
  const placement=getHmenaPlacement(db,studentId),band=bandFromCode(placement?.bandCode);
  if(!band)throw new TypeError('advanced diagnostic requires 1200+ HMENA placement');
  const m=meta[band];
  const active=db.prepare("SELECT id,status FROM diagnostic_attempts WHERE student_id=? AND blueprint_id=? AND status='in_progress' ORDER BY started_at DESC LIMIT 1").get(studentId,m.id);
  if(active)return {attemptId:active.id,status:active.status,band,reused:true};
  const completed=db.prepare("SELECT id,status,summary_json AS summaryJson FROM diagnostic_attempts WHERE student_id=? AND blueprint_id=? AND status='completed' ORDER BY completed_at DESC LIMIT 1").get(studentId,m.id);
  if(completed)return {attemptId:completed.id,status:completed.status,band,reused:true,completed:true,summary:JSON.parse(completed.summaryJson||'{}')};
  const id=`DIAG-${randomUUID()}`,playStyle=studentPlayStyleProfile(db,studentId);
  const evidence={playStyle,assessmentEmphasis:playStyle?.assessmentEmphasis||null};
  db.prepare(`INSERT INTO diagnostic_attempts(id,student_id,blueprint_id,locale,status,stage,entry_stage,entry_basis,entry_evidence_json,started_at) VALUES (?,?,?,?,'in_progress','development','development','standard',?,CURRENT_TIMESTAMP)`).run(id,studentId,m.id,localeOf(locale),JSON.stringify(evidence));
  return {attemptId:id,status:'in_progress',band,entryEvidence:evidence,reused:false};
}

function localGap(db,locale,code){
  const row=db.prepare(`SELECT COALESCE(cl.title,cs.title) AS title FROM curriculum_skills cs LEFT JOIN curriculum_localizations cl ON cl.entity_type='skill' AND cl.entity_id=cs.id AND cl.locale=? WHERE cs.code=?`).get(localeOf(locale),code);
  return row?.title||code;
}

export function advancedDiagnosticState(db,{accountId,attemptId,locale='en'}={}){
  const attempt=db.prepare(`SELECT a.id,a.student_id AS studentId,a.blueprint_id AS blueprintId,a.status,a.placement_band_code AS placementBandCode,a.summary_json AS summaryJson,a.entry_evidence_json AS entryEvidenceJson,b.code AS blueprintCode FROM diagnostic_attempts a JOIN diagnostic_blueprints b ON b.id=a.blueprint_id WHERE a.id=?`).get(attemptId);
  if(!attempt||!authorized(db,accountId,attempt.studentId)||!Object.values(meta).some(x=>x.id===attempt.blueprintId))return null;
  const band=Object.entries(meta).find(([,m])=>m.id===attempt.blueprintId)?.[0]||null;
  attempt.entryEvidence=JSON.parse(attempt.entryEvidenceJson||'{}');delete attempt.entryEvidenceJson;
  if(attempt.status==='completed'){
    const summary=JSON.parse(attempt.summaryJson||'{}');summary.gaps=(summary.gaps||[]).map(g=>({...g,title:localGap(db,locale,g.code)}));
    return {...attempt,band,summary,item:null};
  }
  const next=db.prepare(`SELECT i.id,i.sequence_no,l.prompt,l.options_json,cs.code AS skill_code,i.fen FROM diagnostic_items i JOIN diagnostic_item_localizations l ON l.item_id=i.id AND l.locale=? JOIN curriculum_skills cs ON cs.id=i.skill_id LEFT JOIN diagnostic_responses r ON r.item_id=i.id AND r.attempt_id=? WHERE i.blueprint_id=? AND i.active=1 AND r.item_id IS NULL ORDER BY i.sequence_no LIMIT 1`).get(localeOf(locale),attemptId,attempt.blueprintId);
  return {...attempt,band,item:next?itemForClient(next):null};
}

function score(db,attemptId,blueprintId){
  const row=db.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN r.correct=1 THEN 1 ELSE 0 END) AS correct FROM diagnostic_items i LEFT JOIN diagnostic_responses r ON r.item_id=i.id AND r.attempt_id=? WHERE i.blueprint_id=? AND i.active=1`).get(attemptId,blueprintId);
  const correct=Number(row.correct||0),total=Number(row.total||0);return {correct,total,percent:total?Math.round(correct*100/total):0};
}
const rank={unseen:0,introduced:1,practicing:2,drill_mastered:3,applied_in_game:4,regressed:5};
function persistEvidence(db,attemptId,studentId,band){
  const rows=db.prepare(`SELECT i.skill_id AS skillId,cs.code,r.correct,r.answered_at AS answeredAt FROM diagnostic_responses r JOIN diagnostic_items i ON i.id=r.item_id JOIN curriculum_skills cs ON cs.id=i.skill_id WHERE r.attempt_id=?`).all(attemptId);
  const current=db.prepare('SELECT status,confidence,evidence_json AS evidenceJson FROM student_skills WHERE student_id=? AND skill_id=?');
  const upsert=db.prepare(`INSERT INTO student_skills(student_id,skill_id,status,confidence,evidence_json,last_assessed_at,updated_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(student_id,skill_id) DO UPDATE SET status=excluded.status,confidence=excluded.confidence,evidence_json=excluded.evidence_json,last_assessed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`);
  for(const row of rows){const prior=current.get(studentId,row.skillId),proposed=row.correct?'practicing':'unseen',keep=prior&&(prior.status==='regressed'||rank[prior.status]>rank[proposed]);let evidence={};try{evidence=JSON.parse(prior?.evidenceJson||'{}');}catch{}evidence={...evidence,advancedDiagnostic:{band,attemptId,skillCode:row.code,correct:Boolean(row.correct),answeredAt:row.answeredAt}};upsert.run(studentId,row.skillId,keep?prior.status:proposed,keep?prior.confidence:(row.correct?70:30),JSON.stringify(evidence));}
}

function complete(db,attempt,band){
  const result=score(db,attempt.id,attempt.blueprintId),passed=result.correct>=PASS_COUNT,next=passed?nextBand(band):null;
  const target=passed?(next?bandCode(next):bandCode(band)):bandCode(band);
  const gaps=db.prepare(`SELECT cs.code FROM diagnostic_responses r JOIN diagnostic_items i ON i.id=r.item_id JOIN curriculum_skills cs ON cs.id=i.skill_id WHERE r.attempt_id=? AND r.correct=0 ORDER BY i.sequence_no`).all(attempt.id);
  const summary={band,score:result,passed,gaps,nextBand:next,cleared2500:passed&&!next};
  db.transaction(()=>{
    db.prepare(`UPDATE diagnostic_attempts SET status='completed',stage='completed',completed_at=CURRENT_TIMESTAMP,development_score=?,placement_band_code=?,summary_json=? WHERE id=?`).run(result.percent,target,JSON.stringify(summary),attempt.id);
    placeStudentInHmena(db,{studentId:attempt.studentId,bandCode:target,source:'assessment',confidence:passed?75:85,note:passed?(next?`Cleared CIS ${band}; continue ${next}.`:`Cleared CIS ${band} high-performance screen.`):`CIS ${band} screen found reinforcement gaps.`});
    persistEvidence(db,attempt.id,attempt.studentId,band);
    db.prepare(`INSERT INTO assessments(id,student_id,kind,overall_level,score_json,coach_note) VALUES (?,?,?,?,?,NULL)`).run(`ASM-${randomUUID()}`,attempt.studentId,'progress',meta[band].min,JSON.stringify({diagnostic:meta[band].code,...summary}));
  })();
  return {completed:true,placementBandCode:target,summary};
}

export function submitAdvancedDiagnosticAnswer(db,{accountId,attemptId,itemId,answerKey,locale='en'}={}){
  const attempt=db.prepare(`SELECT a.id,a.student_id AS studentId,a.blueprint_id AS blueprintId,a.status FROM diagnostic_attempts a WHERE a.id=?`).get(attemptId);
  if(!attempt||!authorized(db,accountId,attempt.studentId))throw new TypeError('diagnostic not authorized');
  const band=Object.entries(meta).find(([,m])=>m.id===attempt.blueprintId)?.[0];if(!band)throw new TypeError('advanced diagnostic not found');
  if(attempt.status!=='in_progress')throw new TypeError('diagnostic already completed');
  const item=db.prepare('SELECT id,correct_answer AS correctAnswer FROM diagnostic_items WHERE id=? AND blueprint_id=? AND active=1').get(itemId,attempt.blueprintId);if(!item)throw new TypeError('invalid diagnostic item');
  const answer=String(answerKey||'').toUpperCase();if(!['A','B','C','D'].includes(answer))throw new TypeError('invalid answer');
  const correct=answer===item.correctAnswer?1:0;
  db.prepare(`INSERT INTO diagnostic_responses(attempt_id,item_id,answer_key,correct,answered_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(attempt_id,item_id) DO UPDATE SET answer_key=excluded.answer_key,correct=excluded.correct,answered_at=CURRENT_TIMESTAMP`).run(attemptId,itemId,answer,correct);
  const remaining=Number(db.prepare(`SELECT COUNT(*) AS n FROM diagnostic_items i LEFT JOIN diagnostic_responses r ON r.item_id=i.id AND r.attempt_id=? WHERE i.blueprint_id=? AND i.active=1 AND r.item_id IS NULL`).get(attemptId,attempt.blueprintId).n||0);
  if(!remaining)return complete(db,attempt,band);
  return {correct:Boolean(correct),completed:false,state:advancedDiagnosticState(db,{accountId,attemptId,locale})};
}

export const advancedDiagnosticBands=()=>bands.slice();
