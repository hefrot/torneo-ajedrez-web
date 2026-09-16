import {randomUUID} from 'node:crypto';
import {HMENA_FRAMEWORK_ID,placeStudentInHmena} from './hmena-curriculum.js';

export const DIAGNOSTIC_1200_CODE='hmena-800-1200-v1';
const BLUEPRINT='DIAG-HMENA-800-1200';
const PASS=70;
const localeOf=value=>String(value||'en').toLowerCase()==='es'?'es':'en';
const items=[
  ['CMP01','CMP-CANDIDATES','Before calculating deeply, what should you do first?','Antes de calcular profundamente, ¿qué debes hacer primero?',['Generate 2–4 serious candidate moves','Move the first legal check','Count only material','Choose the prettiest move'],['Generar 2–4 jugadas candidatas serias','Jugar el primer jaque legal','Contar solo material','Elegir la jugada más bonita'],'A'],
  ['CMP02','CMP-CALC2','What does calculating 2–3 ply mean?','¿Qué significa calcular 2–3 ply?',['Visualize your move, the reply, and your next move','Think for 2–3 seconds','Calculate only captures','Move two pieces at once'],['Visualizar tu jugada, la respuesta y tu siguiente jugada','Pensar 2–3 segundos','Calcular solo capturas','Mover dos piezas a la vez'],'A'],
  ['CMP03','CMP-REMOVE','What is the idea of removing the defender?','¿Cuál es la idea de eliminar al defensor?',['Capture or distract a piece protecting a key target','Trade queens immediately','Move the king toward the center','Protect every pawn'],['Capturar o distraer una pieza que protege un objetivo clave','Cambiar damas inmediatamente','Mover el rey hacia el centro','Proteger cada peón'],'A'],
  ['CMP04','CMP-DEFLECTION','A deflection tactic tries to do what?','¿Qué intenta hacer una táctica de desviación?',['Force a defender away from an important duty','Pin a king to a rook','Promote a pawn immediately','Trade equal pieces'],['Forzar a un defensor a abandonar una función importante','Clavar un rey a una torre','Coronar un peón inmediatamente','Cambiar piezas iguales'],'A'],
  ['CMP05','CMP-OVERLOAD','What is an overloaded piece?','¿Qué es una pieza sobrecargada?',['A piece responsible for defending multiple important targets','A piece with too many legal moves','A piece trapped by its own king','A rook on an open file'],['Una pieza responsable de defender varios objetivos importantes','Una pieza con demasiadas jugadas legales','Una pieza atrapada por su propio rey','Una torre en columna abierta'],'A'],
  ['CMP06','CMP-TRAP','What is usually needed to trap an enemy piece?','¿Qué se necesita normalmente para atrapar una pieza rival?',['Restrict its escape squares before attacking it','Give random checks','Trade all pawns','Move the queen repeatedly'],['Restringir sus casillas de escape antes de atacarla','Dar jaques al azar','Cambiar todos los peones','Mover la dama repetidamente'],'A'],
  ['CMP07','CMP-MATE2','In a mate-in-2 calculation, what must you verify after the first move?','En un cálculo de mate en 2, ¿qué debes verificar después de la primera jugada?',['Every legal defensive reply','Only the opponent queen move','Only captures','Only one favorite line'],['Cada respuesta defensiva legal','Solo la jugada de dama rival','Solo capturas','Solo una línea favorita'],'A'],
  ['CMP08','CMP-PAWNSTRUCT','Which is a pawn-structure feature?','¿Cuál es una característica de estructura de peones?',['Isolated pawn','Forked queen','Pinned king','Knight check'],['Peón aislado','Dama en tenedor','Rey clavado','Jaque de caballo'],'A'],
  ['CMP09','CMP-WEAKSQUARE','What makes a square a durable weakness?','¿Qué hace que una casilla sea una debilidad duradera?',['It cannot easily be defended by a pawn','It is on the edge of the board','A queen once visited it','It is always dark-colored'],['No puede ser defendida fácilmente por un peón','Está en el borde del tablero','Una dama la visitó alguna vez','Siempre es de color oscuro'],'A'],
  ['CMP10','CMP-ROOKACTIVE','Where are rooks usually most active?','¿Dónde suelen estar más activas las torres?',['Open files and active ranks','Behind blocked own pawns','In the corner without purpose','Always on the second rank'],['Columnas abiertas y filas activas','Detrás de peones propios bloqueados','En la esquina sin propósito','Siempre en la segunda fila'],'A'],
  ['CMP11','CMP-OPPOSITION','In a basic king-and-pawn ending, opposition is mainly used to do what?','En un final básico de rey y peón, ¿para qué se usa principalmente la oposición?',['Control key squares and force the enemy king to yield','Win a queen by fork','Create a pin','Castle in the endgame'],['Controlar casillas clave y obligar al rey rival a ceder','Ganar una dama con tenedor','Crear una clavada','Enrocar en el final'],'A'],
  ['CMP12','CMP-REVIEW','What should happen before checking the engine in a serious game review?','¿Qué debe ocurrir antes de consultar el engine en un análisis serio?',['Write your own critical moments and candidate moves','Copy the engine top line first','Only look at the final position','Ignore your thought process'],['Escribir tus propios momentos críticos y jugadas candidatas','Copiar primero la línea principal del engine','Mirar solo la posición final','Ignorar tu proceso de pensamiento'],'A']
];

const rows=items.map(([id,skillCode,promptEn,promptEs,optionsEn,optionsEs,correct],index)=>({id:`DIAG1200-${id}`,skillCode,sequence:index+1,correct,prompt:{en:promptEn,es:promptEs},options:{en:optionsEn,es:optionsEs}}));
const skillIdByCode=(db,code)=>db.prepare(`SELECT s.id FROM curriculum_skills s JOIN curriculum_tracks t ON t.id=s.track_id WHERE s.code=? AND t.framework_id=?`).get(code,HMENA_FRAMEWORK_ID)?.id;
const authorizedStudent=(db,accountId,studentId)=>Boolean(db.prepare('SELECT 1 FROM portal_account_students WHERE account_id=? AND student_id=?').get(accountId,studentId));
const itemForClient=row=>({id:row.id,skillCode:row.skill_code,sequence:row.sequence_no,prompt:row.prompt,options:JSON.parse(row.options_json||'[]')});
export function seedDiagnostic1200(db){
  db.prepare(`INSERT INTO diagnostic_blueprints(id,code,title,min_rating,max_rating,active) VALUES (?,?,?,800,1200,1) ON CONFLICT(id) DO UPDATE SET active=1,title=excluded.title`).run(BLUEPRINT,DIAGNOSTIC_1200_CODE,'HMENA 800–1200 Diagnostic');
  const item=db.prepare(`INSERT INTO diagnostic_items(id,blueprint_id,skill_id,stage,sequence_no,is_anchor,fen,correct_answer,active) VALUES (?,?,?,'development',?,0,NULL,?,1) ON CONFLICT(id) DO UPDATE SET skill_id=excluded.skill_id,sequence_no=excluded.sequence_no,correct_answer=excluded.correct_answer,active=1`);
  const loc=db.prepare(`INSERT INTO diagnostic_item_localizations(item_id,locale,prompt,options_json) VALUES (?,?,?,?) ON CONFLICT(item_id,locale) DO UPDATE SET prompt=excluded.prompt,options_json=excluded.options_json`);
  db.transaction(()=>{for(const row of rows){const sid=skillIdByCode(db,row.skillCode);if(!sid)throw new Error(`missing skill ${row.skillCode}`);item.run(row.id,BLUEPRINT,sid,row.sequence,row.correct);for(const lang of ['en','es'])loc.run(row.id,lang,row.prompt[lang],JSON.stringify(row.options[lang]));}})();
  return {code:DIAGNOSTIC_1200_CODE,items:rows.length,skills:rows.length};
}

export function startDiagnostic1200(db,{accountId,studentId,locale='en'}={}){
  if(!authorizedStudent(db,accountId,studentId))throw new TypeError('student not authorized');
  const placement=db.prepare(`SELECT t.code FROM student_curriculum_placements p JOIN curriculum_tracks t ON t.id=p.track_id WHERE p.student_id=? AND p.framework_id=?`).get(studentId,HMENA_FRAMEWORK_ID)?.code;
  if(placement!=='hmena-800-1200')throw new TypeError('800-1200 diagnostic requires HMENA 800-1200 placement');
  const active=db.prepare("SELECT id,status FROM diagnostic_attempts WHERE student_id=? AND blueprint_id=? AND status='in_progress' ORDER BY started_at DESC LIMIT 1").get(studentId,BLUEPRINT);
  if(active)return {attemptId:active.id,status:active.status,reused:true};
  const id=`DIAG-${randomUUID()}`;
  db.prepare(`INSERT INTO diagnostic_attempts(id,student_id,blueprint_id,locale,status,stage,entry_stage,entry_basis,entry_evidence_json,started_at) VALUES (?,?,?,?,'in_progress','development','development','standard','{}',CURRENT_TIMESTAMP)`).run(id,studentId,BLUEPRINT,localeOf(locale));
  return {attemptId:id,status:'in_progress',stage:'competitive_fundamentals',reused:false};
}
export function diagnostic1200State(db,{accountId,attemptId,locale='en'}={}){
  const attempt=db.prepare(`SELECT id,student_id AS studentId,status,placement_band_code AS placementBandCode,summary_json AS summaryJson FROM diagnostic_attempts WHERE id=? AND blueprint_id=?`).get(attemptId,BLUEPRINT);
  if(!attempt||!authorizedStudent(db,accountId,attempt.studentId))return null;
  const lang=localeOf(locale);
  if(attempt.status==='completed'){
    const summary=JSON.parse(attempt.summaryJson||'{}');
    const localize=db.prepare(`SELECT COALESCE(cl.title,cs.title) AS title FROM curriculum_skills cs LEFT JOIN curriculum_localizations cl ON cl.entity_type='skill' AND cl.entity_id=cs.id AND cl.locale=? WHERE cs.code=?`);
    summary.gaps=(summary.gaps||[]).map(g=>({...g,title:localize.get(lang,g.code)?.title||g.code}));
    return {...attempt,summary,item:null};
  }
  const next=db.prepare(`SELECT i.id,i.sequence_no,l.prompt,l.options_json,cs.code AS skill_code FROM diagnostic_items i JOIN diagnostic_item_localizations l ON l.item_id=i.id AND l.locale=? JOIN curriculum_skills cs ON cs.id=i.skill_id LEFT JOIN diagnostic_responses r ON r.item_id=i.id AND r.attempt_id=? WHERE i.blueprint_id=? AND i.active=1 AND r.item_id IS NULL ORDER BY i.sequence_no LIMIT 1`).get(lang,attemptId,BLUEPRINT);
  return {...attempt,item:next?itemForClient(next):null};
}

function score(db,attemptId){const row=db.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN r.correct=1 THEN 1 ELSE 0 END) AS correct FROM diagnostic_items i LEFT JOIN diagnostic_responses r ON r.item_id=i.id AND r.attempt_id=? WHERE i.blueprint_id=? AND i.active=1`).get(attemptId,BLUEPRINT);return {correct:Number(row.correct||0),total:Number(row.total||0),percent:row.total?Math.round(Number(row.correct||0)*100/Number(row.total)):0};}
const statusRank={unseen:0,introduced:1,practicing:2,drill_mastered:3,applied_in_game:4,regressed:5};
function persistEvidence(db,attemptId,studentId){
  const rows=db.prepare(`SELECT i.skill_id AS skillId,cs.code,r.correct,r.answered_at AS answeredAt FROM diagnostic_responses r JOIN diagnostic_items i ON i.id=r.item_id JOIN curriculum_skills cs ON cs.id=i.skill_id WHERE r.attempt_id=?`).all(attemptId);
  const current=db.prepare('SELECT status,confidence,evidence_json AS evidenceJson FROM student_skills WHERE student_id=? AND skill_id=?');
  const upsert=db.prepare(`INSERT INTO student_skills(student_id,skill_id,status,confidence,evidence_json,last_assessed_at,updated_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(student_id,skill_id) DO UPDATE SET status=excluded.status,confidence=excluded.confidence,evidence_json=excluded.evidence_json,last_assessed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`);
  for(const row of rows){const existing=current.get(studentId,row.skillId),proposed=row.correct?'practicing':'unseen',keep=existing&&(existing.status==='regressed'||statusRank[existing.status]>statusRank[proposed]);let evidence={};try{evidence=JSON.parse(existing?.evidenceJson||'{}');}catch{}evidence={...evidence,diagnostic1200:{blueprint:DIAGNOSTIC_1200_CODE,attemptId,skillCode:row.code,correct:Boolean(row.correct),answeredAt:row.answeredAt}};upsert.run(studentId,row.skillId,keep?existing.status:proposed,keep?existing.confidence:(row.correct?65:25),JSON.stringify(evidence));}
}
function complete(db,attemptId,studentId){
  const result=score(db,attemptId),passed=result.percent>=PASS,bandCode=passed?'hmena-1200-1600':'hmena-800-1200';
  const gaps=db.prepare(`SELECT cs.code FROM diagnostic_responses r JOIN diagnostic_items i ON i.id=r.item_id JOIN curriculum_skills cs ON cs.id=i.skill_id WHERE r.attempt_id=? AND r.correct=0 ORDER BY i.sequence_no`).all(attemptId);
  const summary={competitiveFundamentals:result,gaps,cleared1200:passed};
  db.transaction(()=>{
    db.prepare(`UPDATE diagnostic_attempts SET status='completed',stage='completed',completed_at=CURRENT_TIMESTAMP,development_score=?,placement_band_code=?,summary_json=? WHERE id=?`).run(result.percent,bandCode,JSON.stringify(summary),attemptId);
    placeStudentInHmena(db,{studentId,bandCode,source:'assessment',confidence:passed?70:80,note:passed?'Cleared HMENA 800–1200 screening; continue with 1200–1600.':'HMENA 800–1200 screening: targeted reinforcement required.'});
    persistEvidence(db,attemptId,studentId);
    db.prepare(`INSERT INTO assessments(id,student_id,kind,overall_level,score_json,coach_note) VALUES (?,?,?,?,?,NULL)`).run(`ASM-${randomUUID()}`,studentId,'progress',passed?1200:1000,JSON.stringify({diagnostic:DIAGNOSTIC_1200_CODE,...summary}));
  })();
  return {completed:true,placementBandCode:bandCode,summary};
}

export function submitDiagnostic1200Answer(db,{accountId,attemptId,itemId,answerKey,locale='en'}={}){
  const attempt=db.prepare("SELECT id,student_id AS studentId,status FROM diagnostic_attempts WHERE id=? AND blueprint_id=?").get(attemptId,BLUEPRINT);
  if(!attempt||!authorizedStudent(db,accountId,attempt.studentId))throw new TypeError('diagnostic not authorized');
  if(attempt.status!=='in_progress')throw new TypeError('diagnostic already completed');
  const item=db.prepare('SELECT id,correct_answer AS correctAnswer FROM diagnostic_items WHERE id=? AND blueprint_id=? AND active=1').get(itemId,BLUEPRINT);
  if(!item)throw new TypeError('invalid diagnostic item');
  const answer=String(answerKey||'').toUpperCase();if(!['A','B','C','D'].includes(answer))throw new TypeError('invalid answer');
  const correct=answer===item.correctAnswer?1:0;
  db.prepare(`INSERT INTO diagnostic_responses(attempt_id,item_id,answer_key,correct,answered_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(attempt_id,item_id) DO UPDATE SET answer_key=excluded.answer_key,correct=excluded.correct,answered_at=CURRENT_TIMESTAMP`).run(attemptId,itemId,answer,correct);
  const remaining=db.prepare(`SELECT COUNT(*) AS n FROM diagnostic_items i LEFT JOIN diagnostic_responses r ON r.item_id=i.id AND r.attempt_id=? WHERE i.blueprint_id=? AND i.active=1 AND r.item_id IS NULL`).get(attemptId,BLUEPRINT).n;
  if(Number(remaining)===0)return complete(db,attemptId,attempt.studentId);
  return {correct:Boolean(correct),completed:false,state:diagnostic1200State(db,{accountId,attemptId,locale})};
}
