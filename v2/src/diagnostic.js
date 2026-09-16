import {randomUUID} from 'node:crypto';
import {HMENA_FRAMEWORK_ID,placeStudentInHmena} from './hmena-curriculum.js';
import {studentPlayStyleProfile} from './play-style-profile.js';

export const DIAGNOSTIC_CODE='hmena-0-800-v1';
const FOUNDATION_PASS=75;
const DEVELOPMENT_PASS=70;
const localeOf=value=>String(value||'en').toLowerCase()==='es'?'es':'en';
const attemptId=()=>`DIAG-${randomUUID()}`;

const items=[
  ['FND01','FND-BOARD','foundations','Which square is on the e-file and 4th rank?','¿Qué casilla está en la columna e y la cuarta fila?',['e4','d4','e5','f4'],['e4','d4','e5','f4'],'A'],
  ['FND02','FND-PIECES','foundations','Which piece can jump over other pieces?','¿Qué pieza puede saltar sobre otras piezas?',['Knight','Bishop','Rook','Queen'],['Caballo','Alfil','Torre','Dama'],'A'],
  ['FND03','FND-PAWNS','foundations','Which move can a white pawn make from e2 on its first move?','¿Qué jugada puede hacer un peón blanco desde e2 en su primer movimiento?',['e2-e4','e2-e1','e2-f2','e2-d3'],['e2-e4','e2-e1','e2-f2','e2-d3'],'A'],
  ['FND04','FND-LEGAL','foundations','Can you make a move that leaves your own king in check?','¿Puedes hacer una jugada que deje a tu propio rey en jaque?',['Yes','No','Only with the queen','Only once'],['Sí','No','Solo con la dama','Solo una vez'],'B'],
  ['FND05','FND-CHECK','foundations','When is a king in check?','¿Cuándo está un rey en jaque?',['When it is attacked by an opponent piece','When it reaches the center','After every capture','Only when a queen attacks it'],['Cuando una pieza rival lo está atacando','Cuando llega al centro','Después de cada captura','Solo cuando lo ataca una dama'],'A'],
  ['FND06','FND-CBR','foundations','Which is NOT a general legal way to answer a check?','¿Cuál NO es una forma general legal de responder a un jaque?',['Capture the checking piece','Block the check when possible','Move the king','Castle out of check'],['Capturar la pieza que da jaque','Bloquear el jaque cuando sea posible','Mover el rey','Enrocar para salir del jaque'],'D'],  ['FND07','FND-MATE1','foundations','What does checkmate mean?','¿Qué significa jaque mate?',['The king is in check and has no legal escape','The queen was captured','Both kings are attacked','The game has lasted 50 moves'],['El rey está en jaque y no tiene escape legal','La dama fue capturada','Ambos reyes están atacados','La partida duró 50 jugadas'],'A'],
  ['FND08','FND-OPENING','foundations','What is the best general opening plan?','¿Cuál es el mejor plan general de apertura?',['Control the center, develop, castle','Move the queen many times','Push every pawn','Attack before developing'],['Controlar el centro, desarrollar y enrocar','Mover la dama muchas veces','Avanzar todos los peones','Atacar antes de desarrollar'],'A'],
  ['FND09','FND-TRAPS','foundations',"Scholar's Mate usually attacks which square?",'¿Qué casilla suele atacar el Mate del Pastor?',['f7','a1','h4','d8'],['f7','a1','h4','d8'],'A'],
  ['FND10','FND-QK-MATE','foundations','In queen vs king, what must you be careful to avoid?','En dama contra rey, ¿qué debes evitar?',['Stalemate','Castling','Promotion','En passant'],['Ahogado','Enroque','Promoción','Captura al paso'],'A'],
  ['FND11','FND-THINK','foundations','Before you move, what should you check first?','Antes de mover, ¿qué debes revisar primero?',["Opponent's threats and hanging pieces",'Only your clock','Only your opening name','Whether you can trade queens'],['Amenazas del rival y piezas colgadas','Solo tu reloj','Solo el nombre de la apertura','Si puedes cambiar damas'],'A'],
  ['DEV01','DEV-HANGING','development','What is a hanging piece?','¿Qué es una pieza colgada?',['A piece that can be captured without enough protection','A piece on the back rank','A promoted pawn','A pinned king'],['Una pieza que puede ser capturada sin suficiente protección','Una pieza en la última fila','Un peón promovido','Un rey clavado'],'A'],  ['DEV02','DEV-MATERIAL','development','Which trade usually loses material?','¿Qué cambio normalmente pierde material?',['Rook for knight','Knight for bishop','Queen for queen','Pawn for pawn'],['Torre por caballo','Caballo por alfil','Dama por dama','Peón por peón'],'A'],
  ['DEV03','DEV-THREATS','development','Before starting your own attack, what should you check?','Antes de iniciar tu propio ataque, ¿qué debes revisar?',["Opponent's immediate threat",'Only your opening book','Whether your king can move to the center','The color of the board'],['La amenaza inmediata del rival','Solo tu libro de aperturas','Si tu rey puede ir al centro','El color del tablero'],'A'],
  ['DEV04','DEV-FORK','development','What is a fork?','¿Qué es un tenedor?',['One piece attacks two or more targets','A piece cannot move because of the king','A rook attacks through a queen','Two kings attack each other'],['Una pieza ataca dos o más objetivos','Una pieza no puede moverse por el rey','Una torre ataca a través de una dama','Dos reyes se atacan'],'A'],
  ['DEV05','DEV-PIN','development','What is a pin?','¿Qué es una clavada?',['Moving a piece would expose a more valuable piece or king','A pawn reaches the last rank','A knight attacks two pieces','A king has no legal moves but is not in check'],['Mover una pieza expondría una pieza más valiosa o al rey','Un peón llega a la última fila','Un caballo ataca dos piezas','Un rey no tiene jugadas legales pero no está en jaque'],'A'],
  ['DEV06','DEV-SKEWER','development','What usually happens in a skewer?','¿Qué suele ocurrir en una enfilada?',['A more valuable piece is attacked and moves, exposing another piece','A piece is frozen in front of the king','Two pieces attack one square','A pawn captures forward'],['Se ataca una pieza más valiosa y al moverse deja otra expuesta','Una pieza queda inmóvil delante del rey','Dos piezas atacan una casilla','Un peón captura hacia adelante'],'A'],
  ['DEV07','DEV-DISCOVERED','development','What is a discovered attack?','¿Qué es un ataque descubierto?',['One piece moves and reveals an attack from another piece','A queen gives check from the corner','A pawn attacks two pieces','A rook is trapped'],['Una pieza se mueve y descubre el ataque de otra pieza','Una dama da jaque desde la esquina','Un peón ataca dos piezas','Una torre queda atrapada'],'A'],  ['DEV08','DEV-BACKRANK','development','What creates a common back-rank mate danger?','¿Qué crea un peligro común de mate en la última fila?',['The king is trapped by its own pawns with no escape square','The queen is undeveloped','A bishop is on the edge','Both rooks are connected'],['El rey queda atrapado por sus propios peones sin casilla de escape','La dama no está desarrollada','Un alfil está en la orilla','Ambas torres están conectadas'],'A'],
  ['DEV09','DEV-LADDER','development','What is the key idea in a basic rook/ladder mate?','¿Cuál es la idea clave en un mate básico con torre/escalera?',['Cut off the king and reduce its space','Give random checks forever','Keep your king far away','Trade the rook for a pawn'],['Cortar al rey y reducir su espacio','Dar jaques al azar sin parar','Mantener tu rey lejos','Cambiar la torre por un peón'],'A'],
  ['DEV10','DEV-KP-END','development','In king and pawn vs king, what is opposition?','En rey y peón contra rey, ¿qué es la oposición?',['The kings face each other with one square between them','Both kings are in check','A pawn attacks a rook','The kings are on opposite colors'],['Los reyes se enfrentan con una casilla entre ellos','Ambos reyes están en jaque','Un peón ataca una torre','Los reyes están en colores opuestos'],'A'],
  ['DEV11','DEV-CCT','development','What does CCT stand for when calculating?','¿Qué significa CCT al calcular?',['Checks, Captures, Threats','Center, Castle, Trade','Clock, Calculation, Tactics','Capture, Castle, Tempo'],['Jaques, Capturas, Amenazas','Centro, Enroque, Cambio','Reloj, Cálculo, Tácticas','Captura, Enroque, Tempo'],'A']
];

const rows=items.map(([id,skillCode,stage,promptEn,promptEs,optionsEn,optionsEs,correct],index)=>({id:`DIAG0800-${id}`,skillCode,stage,sequence:index+1,correct,prompt:{en:promptEn,es:promptEs},options:{en:optionsEn,es:optionsEs}}));

const anchorRows=[
  {id:'DIAG0800-ANCHOR-STALEMATE',skillCode:'FND-MATE1',stage:'foundations',sequence:101,fen:'7k/5K2/6Q1/8/8/8/8/8 b - - 0 1',correct:'B',prompt:{en:'Black to move. Is this checkmate or stalemate?',es:'Juegan negras. ¿Es jaque mate o ahogado?'},options:{en:['Checkmate','Stalemate','Black wins','Illegal position'],es:['Jaque mate','Ahogado','Ganan negras','Posición ilegal']}},
  {id:'DIAG0800-ANCHOR-ROOKMATE',skillCode:'DEV-LADDER',stage:'foundations',sequence:102,fen:'7k/8/6K1/8/8/8/8/R7 w - - 0 1',correct:'A',prompt:{en:'White to move. Which move finishes the basic rook-and-king mate?',es:'Juegan blancas. ¿Qué jugada termina el mate básico de torre y rey?'},options:{en:['Ra8#','Rh1+','Kg7','Ra7'],es:['Ta8#','Th1+','Rg7','Ta7']}},
  {id:'DIAG0800-ANCHOR-CASTLE',skillCode:'FND-LEGAL',stage:'foundations',sequence:103,fen:'4k3/8/8/1b6/8/8/8/4K2R w K - 0 1',correct:'B',prompt:{en:'Can White legally castle kingside in this position?',es:'¿Pueden las blancas enrocar legalmente por el lado del rey en esta posición?'},options:{en:['Yes','No, the king would cross an attacked square','Only if Black agrees','Only in blitz'],es:['Sí','No, el rey cruzaría una casilla atacada','Solo si negras aceptan','Solo en blitz']}}
];

const skillIdByCode=(db,code)=>db.prepare(`SELECT s.id FROM curriculum_skills s JOIN curriculum_tracks t ON t.id=s.track_id WHERE s.code=? AND t.framework_id=?`).get(code,HMENA_FRAMEWORK_ID)?.id;

export function seedDiagnostic0800(db){
  db.prepare(`INSERT INTO diagnostic_blueprints(id,code,title,min_rating,max_rating,active) VALUES ('DIAG-HMENA-0-800',?,?,0,800,1) ON CONFLICT(id) DO UPDATE SET active=1`).run(DIAGNOSTIC_CODE,'HMENA 0–800 Diagnostic');
  const item=db.prepare(`INSERT INTO diagnostic_items(id,blueprint_id,skill_id,stage,sequence_no,is_anchor,fen,correct_answer,active) VALUES (?, 'DIAG-HMENA-0-800',?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET skill_id=excluded.skill_id,stage=excluded.stage,sequence_no=excluded.sequence_no,is_anchor=excluded.is_anchor,fen=excluded.fen,correct_answer=excluded.correct_answer,active=1`);
  const loc=db.prepare(`INSERT INTO diagnostic_item_localizations(item_id,locale,prompt,options_json) VALUES (?,?,?,?) ON CONFLICT(item_id,locale) DO UPDATE SET prompt=excluded.prompt,options_json=excluded.options_json`);
  db.transaction(()=>{for(const row of [...rows,...anchorRows]){const sid=skillIdByCode(db,row.skillCode);if(!sid)throw new Error(`missing skill ${row.skillCode}`);item.run(row.id,sid,row.stage,row.sequence,row.isAnchor?1:anchorRows.includes(row)?1:0,row.fen||null,row.correct);for(const locale of ['en','es'])loc.run(row.id,locale,row.prompt[locale],JSON.stringify(row.options[locale]));}})();
  return {code:DIAGNOSTIC_CODE,items:rows.length+anchorRows.length,anchors:anchorRows.length,foundations:rows.filter(x=>x.stage==='foundations').length,development:rows.filter(x=>x.stage==='development').length};
}const blueprint=()=> 'DIAG-HMENA-0-800';
const itemForClient=(row,locale)=>({id:row.id,skillCode:row.skill_code,stage:row.stage,sequence:row.is_anchor?null:(row.stage==='development'?row.sequence_no-11:row.sequence_no),isAnchor:Boolean(row.is_anchor),fen:row.fen||null,prompt:row.prompt,options:JSON.parse(row.options_json||'[]')});
const scoreStage=(db,attemptId,stage)=>{const row=db.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN r.correct=1 THEN 1 ELSE 0 END) AS correct FROM diagnostic_items i LEFT JOIN diagnostic_responses r ON r.item_id=i.id AND r.attempt_id=? WHERE i.blueprint_id=? AND i.stage=? AND i.active=1 AND COALESCE(i.is_anchor,0)=0`).get(attemptId,blueprint(),stage);return {correct:Number(row.correct||0),total:Number(row.total||0),percent:row.total?Math.round((Number(row.correct||0)/Number(row.total))*100):0};};
const authorizedStudent=(db,accountId,studentId)=>Boolean(db.prepare('SELECT 1 FROM portal_account_students WHERE account_id=? AND student_id=?').get(accountId,studentId));

const ratingSeedThresholds={lichess:{rapid:1100,classical:1050},chesscom:{rapid:850}};
const speedSeedThresholds={lichess:{bullet:1500,blitz:1450},chesscom:{bullet:1200,blitz:1100}};
export function diagnosticEntryPoint(db,studentId){
  const student=db.prepare('SELECT player_id AS playerId FROM students WHERE id=?').get(studentId);if(!student)return null;
  const playStyle=studentPlayStyleProfile(db,studentId);
  const signals=[];
  if(student.playerId){
    const rows=db.prepare(`SELECT platform,rating_type AS ratingType,rating,games_count AS gamesCount,rating_deviation AS ratingDeviation,provisional,captured_at AS capturedAt FROM external_rating_snapshots WHERE player_id=? AND rating_type IN ('rapid','classical','bullet','blitz') ORDER BY captured_at DESC`).all(student.playerId);
    const seen=new Set();
    for(const row of rows){
      const key=`${row.platform}:${row.ratingType}`;if(seen.has(key))continue;seen.add(key);
      const speedMode=['bullet','blitz'].includes(row.ratingType);
      if(speedMode&&!(playStyle?.sufficient&&playStyle.dominantMode===row.ratingType))continue;
      const threshold=(speedMode?speedSeedThresholds:ratingSeedThresholds)[row.platform]?.[row.ratingType];if(!threshold)continue;
      const games=Number(row.gamesCount||0),rd=row.ratingDeviation==null?null:Number(row.ratingDeviation);
      const reliable=speedMode
        ?(row.platform==='lichess'?(row.provisional!==1&&rd!=null&&rd<120&&games>=50):(row.platform==='chesscom'?games>=(row.ratingType==='bullet'?100:50):false))
        :(row.platform==='lichess'?(row.provisional!==1&&rd!=null&&rd<110):(row.platform==='chesscom'?games>=20:false));
      signals.push({...row,threshold,reliable,qualifies:reliable&&Number(row.rating)>=threshold,signalRole:speedMode?'style_seed':'standard_seed',reliabilityReason:reliable?'stable':row.platform==='lichess'?'provisional_or_high_rd':'insufficient_games'});
    }
  }
  const qualifying=signals.filter(x=>x.qualifies);
  if(qualifying.length)return {stage:'development',basis:'rating_seed',confidence:qualifying.length>1?70:60,signals,playStyle};
  const placement=db.prepare(`SELECT t.code FROM student_curriculum_placements p JOIN curriculum_tracks t ON t.id=p.track_id WHERE p.student_id=? AND p.framework_id=?`).get(studentId,HMENA_FRAMEWORK_ID)?.code;
  if(placement&&placement!=='hmena-0-400')return {stage:'development',basis:'coach',confidence:55,signals,placement};
  return {stage:'foundations',basis:'standard',confidence:50,signals,placement:placement||null,playStyle};
}

export function startDiagnostic0800(db,{accountId,studentId,locale='en'}={}){
  if(!authorizedStudent(db,accountId,studentId))throw new TypeError('student not authorized');
  const active=db.prepare("SELECT id,status,stage,entry_stage AS entryStage,entry_basis AS entryBasis,entry_evidence_json AS entryEvidenceJson FROM diagnostic_attempts WHERE student_id=? AND blueprint_id=? AND status='in_progress' ORDER BY started_at DESC LIMIT 1").get(studentId,blueprint());
  if(active)return {attemptId:active.id,status:active.status,stage:active.stage,entryStage:active.entryStage,entryBasis:active.entryBasis,entryEvidence:JSON.parse(active.entryEvidenceJson||'{}'),reused:true};
  const entry=diagnosticEntryPoint(db,studentId)||{stage:'foundations',basis:'standard',confidence:50,signals:[]};
  const id=attemptId(),evidence={confidence:entry.confidence,signals:entry.signals||[],placement:entry.placement||null,playStyle:entry.playStyle||studentPlayStyleProfile(db,studentId)};
  db.prepare(`INSERT INTO diagnostic_attempts(id,student_id,blueprint_id,locale,status,stage,entry_stage,entry_basis,entry_evidence_json,started_at) VALUES (?,?,?,?,'in_progress',?,?,?,?,CURRENT_TIMESTAMP)`).run(id,studentId,blueprint(),localeOf(locale),entry.stage,entry.stage,entry.basis,JSON.stringify(evidence));
  return {attemptId:id,status:'in_progress',stage:entry.stage,entryStage:entry.stage,entryBasis:entry.basis,entryEvidence:evidence,reused:false};
}

export function diagnosticState(db,{accountId,attemptId:aid,locale='en'}={}){
  const attempt=db.prepare(`SELECT a.id,a.student_id AS studentId,a.status,a.stage,a.entry_stage AS entryStage,a.entry_basis AS entryBasis,a.entry_evidence_json AS entryEvidenceJson,a.foundations_score AS foundationsScore,a.development_score AS developmentScore,a.placement_band_code AS placementBandCode,a.summary_json AS summaryJson FROM diagnostic_attempts a WHERE a.id=?`).get(aid);
  if(!attempt||!authorizedStudent(db,accountId,attempt.studentId))return null;
  const lang=localeOf(locale);attempt.entryEvidence=JSON.parse(attempt.entryEvidenceJson||'{}');delete attempt.entryEvidenceJson;
  if(attempt.status==='completed'){const summary=JSON.parse(attempt.summaryJson||'{}');const localize=db.prepare(`SELECT cs.code,COALESCE(cl.title,cs.title) AS title FROM curriculum_skills cs LEFT JOIN curriculum_localizations cl ON cl.entity_type='skill' AND cl.entity_id=cs.id AND cl.locale=? WHERE cs.code=?`);summary.gaps=(summary.gaps||[]).map(g=>({...g,title:localize.get(lang,g.code)?.title||g.code}));return {...attempt,summary,item:null};}
  const anchorFirst=attempt.entryStage==='development';
  const next=anchorFirst?db.prepare(`SELECT i.id,i.stage,i.sequence_no,i.is_anchor,i.fen,l.prompt,l.options_json,cs.code AS skill_code FROM diagnostic_items i JOIN diagnostic_item_localizations l ON l.item_id=i.id AND l.locale=? JOIN curriculum_skills cs ON cs.id=i.skill_id LEFT JOIN diagnostic_responses r ON r.item_id=i.id AND r.attempt_id=? WHERE i.blueprint_id=? AND i.is_anchor=1 AND i.active=1 AND r.item_id IS NULL ORDER BY i.sequence_no LIMIT 1`).get(lang,aid,blueprint())||db.prepare(`SELECT i.id,i.stage,i.sequence_no,i.is_anchor,i.fen,l.prompt,l.options_json,cs.code AS skill_code FROM diagnostic_items i JOIN diagnostic_item_localizations l ON l.item_id=i.id AND l.locale=? JOIN curriculum_skills cs ON cs.id=i.skill_id LEFT JOIN diagnostic_responses r ON r.item_id=i.id AND r.attempt_id=? WHERE i.blueprint_id=? AND i.stage=? AND COALESCE(i.is_anchor,0)=0 AND i.active=1 AND r.item_id IS NULL ORDER BY i.sequence_no LIMIT 1`).get(lang,aid,blueprint(),attempt.stage):db.prepare(`SELECT i.id,i.stage,i.sequence_no,i.is_anchor,i.fen,l.prompt,l.options_json,cs.code AS skill_code FROM diagnostic_items i JOIN diagnostic_item_localizations l ON l.item_id=i.id AND l.locale=? JOIN curriculum_skills cs ON cs.id=i.skill_id LEFT JOIN diagnostic_responses r ON r.item_id=i.id AND r.attempt_id=? WHERE i.blueprint_id=? AND i.stage=? AND i.active=1 AND r.item_id IS NULL ORDER BY i.sequence_no LIMIT 1`).get(lang,aid,blueprint(),attempt.stage);
  return {...attempt,item:next?itemForClient(next,lang):null};
}function stageFinished(db,attemptId,stage){
  const row=db.prepare(`SELECT COUNT(*) AS remaining FROM diagnostic_items i LEFT JOIN diagnostic_responses r ON r.item_id=i.id AND r.attempt_id=? WHERE i.blueprint_id=? AND i.stage=? AND i.active=1 AND r.item_id IS NULL`).get(attemptId,blueprint(),stage);
  return Number(row.remaining)===0;
}


const diagnosticStatusRank={unseen:0,introduced:1,practicing:2,drill_mastered:3,applied_in_game:4,regressed:5};
function persistDiagnosticSkillEvidence(db,attempt){
  const rows=db.prepare(`SELECT i.skill_id AS skillId,cs.code,r.correct,r.answered_at AS answeredAt FROM diagnostic_responses r JOIN diagnostic_items i ON i.id=r.item_id JOIN curriculum_skills cs ON cs.id=i.skill_id WHERE r.attempt_id=? ORDER BY i.sequence_no`).all(attempt.id);
  const current=db.prepare('SELECT status,confidence,evidence_json AS evidenceJson FROM student_skills WHERE student_id=? AND skill_id=?');
  const upsert=db.prepare(`INSERT INTO student_skills(student_id,skill_id,status,confidence,evidence_json,last_assessed_at,updated_at) VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(student_id,skill_id) DO UPDATE SET status=excluded.status,confidence=excluded.confidence,evidence_json=excluded.evidence_json,last_assessed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP`);
  for(const row of rows){
    const existing=current.get(attempt.studentId,row.skillId),proposed=row.correct?'practicing':'unseen';
    const keepExisting=existing&&(existing.status==='regressed'||diagnosticStatusRank[existing.status]>diagnosticStatusRank[proposed]);
    const status=keepExisting?existing.status:proposed,confidence=keepExisting?existing.confidence:(row.correct?60:25);
    let evidence={};try{evidence=JSON.parse(existing?.evidenceJson||'{}');}catch{}
    evidence={...evidence,diagnostic:{blueprint:DIAGNOSTIC_CODE,attemptId:attempt.id,skillCode:row.code,correct:Boolean(row.correct),answeredAt:row.answeredAt}};
    upsert.run(attempt.studentId,row.skillId,status,confidence,JSON.stringify(evidence));
  }
}

function completeAttempt(db,attempt,locale){
  const skippedFoundations=attempt.entryStage==='development';
  const foundations=skippedFoundations?{correct:null,total:0,percent:null,skipped:true}:scoreStage(db,attempt.id,'foundations');
  const development=scoreStage(db,attempt.id,'development');
  const bandCode=skippedFoundations?(development.percent>=DEVELOPMENT_PASS?'hmena-800-1200':'hmena-400-800'):(foundations.percent<FOUNDATION_PASS?'hmena-0-400':development.percent>=DEVELOPMENT_PASS?'hmena-800-1200':'hmena-400-800');
  const confidence=bandCode==='hmena-800-1200'?65:skippedFoundations?70:80;
  const gaps=db.prepare(`SELECT cs.code,i.stage,i.is_anchor AS isAnchor FROM diagnostic_responses r JOIN diagnostic_items i ON i.id=r.item_id JOIN curriculum_skills cs ON cs.id=i.skill_id WHERE r.attempt_id=? AND r.correct=0 ORDER BY i.sequence_no`).all(attempt.id);
  const foundationCheckRecommended=skippedFoundations&&development.percent<45;
  const anchorResults=gaps.filter(g=>g.isAnchor);
  const summary={foundations,development,gaps,anchorGaps:anchorResults,anchorsPassed:3-anchorResults.length,cleared0800:bandCode==='hmena-800-1200',entryStage:attempt.entryStage,entryBasis:attempt.entryBasis,foundationCheckRecommended};
  db.transaction(()=>{
    db.prepare(`UPDATE diagnostic_attempts SET status='completed',stage='completed',completed_at=CURRENT_TIMESTAMP,foundations_score=?,development_score=?,placement_band_code=?,summary_json=? WHERE id=?`).run(foundations.percent,development.percent,bandCode,JSON.stringify(summary),attempt.id);
    const note=skippedFoundations?(bandCode==='hmena-800-1200'?'Rating-seeded challenge-out cleared 400–800 screening.':'Rating-seeded screening placed student in 400–800; targeted foundation check may still be useful.'):(bandCode==='hmena-800-1200'?'Cleared HMENA 0–800 screening; continue with 800–1200 diagnostic.':'HMENA 0–800 adaptive diagnostic.');
    placeStudentInHmena(db,{studentId:attempt.studentId,bandCode,source:'assessment',confidence,note});
    persistDiagnosticSkillEvidence(db,attempt);
    const kind=db.prepare('SELECT 1 FROM assessments WHERE student_id=? LIMIT 1').get(attempt.studentId)?'progress':'initial';
    const overallLevel=bandCode==='hmena-0-400'?200:bandCode==='hmena-400-800'?600:800;
    db.prepare(`INSERT INTO assessments(id,student_id,kind,overall_level,score_json,coach_note) VALUES (?,?,?,?,?,?)`).run(`ASM-${randomUUID()}`,attempt.studentId,kind,overallLevel,JSON.stringify({diagnostic:DIAGNOSTIC_CODE,...summary}),null);
  })();
  return {completed:true,placementBandCode:bandCode,summary};
}

export function submitDiagnosticAnswer(db,{accountId,attemptId:aid,itemId,answerKey,locale='en'}={}){
  const attempt=db.prepare("SELECT id,student_id AS studentId,status,stage,entry_stage AS entryStage,entry_basis AS entryBasis FROM diagnostic_attempts WHERE id=?").get(aid);
  if(!attempt||!authorizedStudent(db,accountId,attempt.studentId))throw new TypeError('diagnostic not authorized');
  if(attempt.status!=='in_progress')throw new TypeError('diagnostic already completed');
  const item=db.prepare('SELECT id,stage,is_anchor AS isAnchor,correct_answer AS correctAnswer FROM diagnostic_items WHERE id=? AND blueprint_id=? AND active=1').get(itemId,blueprint());
  if(!item||(!item.isAnchor&&item.stage!==attempt.stage)||(item.isAnchor&&attempt.entryStage!=='development'&&item.stage!==attempt.stage))throw new TypeError('invalid diagnostic item');
  const answer=String(answerKey||'').toUpperCase();if(!['A','B','C','D'].includes(answer))throw new TypeError('invalid answer');
  const correct=answer===item.correctAnswer?1:0;
  db.prepare(`INSERT INTO diagnostic_responses(attempt_id,item_id,answer_key,correct,answered_at) VALUES (?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(attempt_id,item_id) DO UPDATE SET answer_key=excluded.answer_key,correct=excluded.correct,answered_at=CURRENT_TIMESTAMP`).run(aid,itemId,answer,correct);
  if(stageFinished(db,aid,'foundations')&&attempt.stage==='foundations'){
    const f=scoreStage(db,aid,'foundations');
    if(f.percent<FOUNDATION_PASS)return completeAttempt(db,attempt,locale);
    persistDiagnosticSkillEvidence(db,attempt);
    db.prepare("UPDATE diagnostic_attempts SET stage='development',foundations_score=? WHERE id=?").run(f.percent,aid);
    return {correct:Boolean(correct),advanced:true,stage:'development',state:diagnosticState(db,{accountId,attemptId:aid,locale})};
  }
  if(stageFinished(db,aid,'development')&&attempt.stage==='development')return completeAttempt(db,attempt,locale);
  return {correct:Boolean(correct),advanced:false,stage:attempt.stage,state:diagnosticState(db,{accountId,attemptId:aid,locale})};
}