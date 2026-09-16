import {createHash} from 'node:crypto';

const sha=value=>createHash('sha256').update(String(value)).digest('hex').slice(0,18);
const copy={
  en:{
    hanging:['Hanging Pieces','Solve 10 Lichess puzzles about undefended pieces.'],
    fork:['Forks & Double Attacks','Solve 10 Lichess fork puzzles.'],
    pin:['Pins','Solve 10 Lichess pin puzzles.'],
    skewer:['Skewers','Solve 10 Lichess skewer puzzles.'],
    discovered:['Discovered Attacks','Solve 10 Lichess discovered-attack puzzles.'],
    opening:['Opening Tactics','Practice tactics that happen in the opening.'],
    themes:['Checks, Captures & Threats','Use Lichess Puzzle Themes and solve at least 10 forcing-move positions.'],
    practice:['Structured Practice','Use Lichess Practice for guided tactical and endgame modules.']
  },
  es:{
    hanging:['Piezas colgadas','Resuelve 10 ejercicios de Lichess sobre piezas indefensas.'],
    fork:['Tenedores y ataques dobles','Resuelve 10 ejercicios de tenedores en Lichess.'],
    pin:['Clavadas','Resuelve 10 ejercicios de clavadas en Lichess.'],
    skewer:['Enfiladas','Resuelve 10 ejercicios de enfiladas en Lichess.'],
    discovered:['Ataques descubiertos','Resuelve 10 ejercicios de ataques descubiertos en Lichess.'],
    opening:['Táctica de apertura','Practica tácticas que aparecen en la apertura.'],
    themes:['Jaques, Capturas y Amenazas','Usa los temas de Lichess y resuelve al menos 10 posiciones de jugadas forzantes.'],
    practice:['Práctica guiada','Usa Lichess Practice para módulos guiados de táctica y finales.']
  }
};
const resources={
  hanging:{url:'https://lichess.org/training/hangingPiece',skillCodes:['DEV-HANGING'],findingTypes:['missed_capture','engine_blunder']},
  fork:{url:'https://lichess.org/training/fork',skillCodes:['DEV-FORK'],findingTypes:['missed_fork']},
  pin:{url:'https://lichess.org/training/pin',skillCodes:['DEV-PIN'],findingTypes:['missed_pin']},
  skewer:{url:'https://lichess.org/training/skewer',skillCodes:['DEV-SKEWER'],findingTypes:['missed_skewer']},
  discovered:{url:'https://lichess.org/training/discoveredAttack',skillCodes:['DEV-DISCOVERED'],findingTypes:['missed_discovered_attack']},
  opening:{url:'https://lichess.org/training/opening',skillCodes:['FND-OPENING'],findingTypes:['opening_error']},
  themes:{url:'https://lichess.org/training/themes',skillCodes:['DEV-CCT'],findingTypes:['missed_forcing_move']},
  practice:{url:'https://lichess.org/practice',skillCodes:[],findingTypes:[]}
};

const parseDetails=value=>{try{return JSON.parse(value||'{}');}catch{return {};}};
const findResource=leak=>Object.entries(resources).find(([,r])=>r.skillCodes.includes(leak.skillCode)||r.findingTypes.includes(leak.findingType));
const details=(key,resource,leak,locale)=>JSON.stringify({kind:'external_practice',provider:'lichess',resourceKey:key,url:resource.url,target:10,tracking:'student_reported',skillCode:leak?.skillCode||null,findingType:leak?.findingType||null,locale});

export function syncPracticeMissions(db,studentId,{locale='en',training}={}){
  const lang=locale==='es'?'es':'en';
  const raw=training?.topLeaks||[];const leaks=[...raw.filter(x=>x.skillCode),...raw.filter(x=>!x.skillCode)];const selected=[];const used=new Set();
  for(const leak of leaks){const hit=findResource(leak);if(!hit)continue;const [key,resource]=hit;if(used.has(key))continue;used.add(key);selected.push({key,resource,leak});if(selected.length>=3)break;}
  if(!selected.length)selected.push({key:'practice',resource:resources.practice,leak:null});
  const insert=db.prepare(`INSERT OR IGNORE INTO assignments(id,student_id,skill_id,title,details,status) VALUES (?,?,?,?,?,'assigned')`);
  const selectedIds=new Set();
  for(const item of selected){const id=`PRACTICE-${sha(`${studentId}:${item.key}`)}`,text=copy[lang][item.key];selectedIds.add(id);insert.run(id,studentId,item.leak?.skillId||null,text[0],details(item.key,item.resource,item.leak,lang));}
  const stale=db.prepare("SELECT id,details FROM assignments WHERE student_id=? AND status='assigned'").all(studentId).filter(row=>parseDetails(row.details).kind==='external_practice'&&!selectedIds.has(row.id));
  const waive=db.prepare("UPDATE assignments SET status='waived' WHERE id=? AND status='assigned'");for(const row of stale)waive.run(row.id);
  return listPracticeMissions(db,studentId,{locale:lang});
}
export function listPracticeMissions(db,studentId,{locale='en'}={}){
  const lang=locale==='es'?'es':'en';
  return db.prepare(`SELECT id,title,details,due_at AS dueAt,status,created_at AS createdAt FROM assignments WHERE student_id=? ORDER BY created_at DESC`).all(studentId)
    .map(row=>({...row,meta:parseDetails(row.details)}))
    .filter(row=>row.meta.kind==='external_practice'&&row.status!=='waived')
    .map(row=>{const key=row.meta.resourceKey||'practice',text=copy[lang][key]||copy[lang].practice;return {...row,title:text[0],description:text[1],provider:'Lichess',url:row.meta.url||resources[key]?.url||resources.practice.url,target:Number(row.meta.target||10),tracking:row.meta.tracking||'student_reported'};});
}

export function submitPracticeMission(db,{studentId,assignmentId}={}){
  const row=db.prepare('SELECT id,status,details FROM assignments WHERE id=? AND student_id=?').get(assignmentId,studentId);
  if(!row||parseDetails(row.details).kind!=='external_practice')throw new TypeError('practice mission not found');
  if(row.status==='assigned')db.prepare("UPDATE assignments SET status='submitted' WHERE id=? AND student_id=?").run(assignmentId,studentId);
  return db.prepare('SELECT id,status FROM assignments WHERE id=?').get(assignmentId);
}

export function setPracticeMissionStatus(db,{assignmentId,status}={}){
  if(!['assigned','submitted','completed','waived'].includes(status))throw new TypeError('invalid assignment status');
  const row=db.prepare('SELECT details FROM assignments WHERE id=?').get(assignmentId);if(!row||parseDetails(row.details).kind!=='external_practice')throw new TypeError('practice mission not found');
  db.prepare('UPDATE assignments SET status=? WHERE id=?').run(status,assignmentId);return {assignmentId,status};
}