import {HMENA_FRAMEWORK_ID,hmenaBands,hmenaSkills,hmenaOverview,recommendLearningPriorities} from './hmena-curriculum.js';

export const supportedLocales=new Set(['en','es']);
export const supportedInstructionLocales=new Set(['en','es','bilingual']);
export const normalizeLocale=value=>supportedLocales.has(String(value||'').toLowerCase())?String(value).toLowerCase():'en';
export const normalizeInstructionLocale=value=>supportedInstructionLocales.has(String(value||'').toLowerCase())?String(value).toLowerCase():'en';

const bandEs={
  'hmena-0-400':['Fundamentos','Reglas, visión del tablero, juego legal, jaque mate y hábitos seguros de apertura'],
  'hmena-400-800':['Desarrollo','Material, amenazas, tácticas básicas, cálculo básico y finales fundamentales'],
  'hmena-800-1200':['Fundamentos competitivos','Jugadas candidatas, combinaciones, estructura de peones, piezas activas y revisión de partidas'],
  'hmena-1200-1600':['Intermedio','Planificación, profilaxis, desequilibrios, cálculo, repertorio y conversión técnica'],
  'hmena-1600-2000':['Avanzado','Evaluación dinámica/estática, iniciativa, cálculo profundo, defensa y finales avanzados'],
  'hmena-2000-2300':['Experto','Precisión, preparación profunda, defensa/finales complejos y ejecución en torneo'],
  'hmena-2300-2500':['Alto rendimiento','Modelo individual de debilidades, preparación de rivales, investigación y decisiones prácticas de élite']
};

const skillEs={
  'FND-BOARD':'Coordenadas y colocación del tablero','FND-PIECES':'Movimiento y captura de piezas','FND-PAWNS':'Reglas de peones y promoción','FND-LEGAL':'Jugadas legales y seguridad del rey','FND-CHECK':'Reconocer el jaque','FND-CBR':'Salir del jaque: Capturar, Bloquear, Huir','FND-MATE1':'Jaque mate y mate en 1','FND-OPENING':'Hábitos de apertura: Centro, Desarrollo, Enroque','FND-TRAPS':'Trampas básicas de apertura y defensas','FND-QK-MATE':'Mate de dama contra rey','FND-THINK':'Pensar antes de mover',
  'DEV-HANGING':'Piezas colgadas y errores de una jugada','DEV-MATERIAL':'Material e intercambios justos','DEV-THREATS':'Amenazas: Atacar, Defender, Mover','DEV-FORK':'Tenedores y ataques dobles','DEV-PIN':'Clavadas','DEV-SKEWER':'Rayos X y enfiladas','DEV-DISCOVERED':'Ataque y jaque descubierto','DEV-BACKRANK':'Mate de la última fila y casillas de escape','DEV-LADDER':'Mate en escalera / mate con torre','DEV-KP-END':'Finales básicos de rey y peón contra rey','DEV-CCT':'Escaneo de jaques, capturas y amenazas',
  'CMP-CANDIDATES':'Jugadas candidatas','CMP-CALC2':'Calcular 2–3 medias jugadas','CMP-REMOVE':'Eliminar al defensor','CMP-DEFLECTION':'Desviación','CMP-OVERLOAD':'Sobrecarga','CMP-TRAP':'Atrapar una pieza','CMP-MATE2':'Mate en 2 y secuencias forzadas','CMP-PAWNSTRUCT':'Estructura básica de peones','CMP-WEAKSQUARE':'Casillas débiles y puestos avanzados','CMP-ROOKACTIVE':'Torres activas y columnas abiertas','CMP-OPPOSITION':'Oposición y casillas clave','CMP-REVIEW':'Autoanálisis: encontrar el punto de quiebre',
  'INT-PROPHYLAXIS':'Profilaxis: ¿qué quiere hacer mi rival?','INT-WORSTPIECE':'Mejorar la peor pieza','INT-OPENFILES':'Columnas abiertas, filas e invasión','INT-MINOR':'Alfil contra caballo y calidad de piezas','INT-PAWNBREAK':'Rupturas de peones y cambios de estructura','INT-IMBALANCE':'Desequilibrios de la posición y planificación','INT-CALC4':'Calcular 4–6 medias jugadas','INT-EXCHANGE':'Cuándo cambiar y cuándo conservar piezas','INT-OPENPLAN':'Planes de apertura y esqueleto de repertorio','INT-ROOKEND':'Fundamentos de finales de torres','INT-CONVERT':'Convertir una ventaja','INT-CLOCK':'Reloj y toma de decisiones práctica',
  'ADV-STATICDYN':'Ventajas estáticas contra dinámicas','ADV-INITIATIVE':'Iniciativa y tiempos','ADV-SACRIFICE':'Evaluación de sacrificios','ADV-CALCTREE':'Árbol de cálculo y control de variantes','ADV-QUIET':'Jugadas tranquilas en posiciones tácticas','ADV-DEFENSE':'Defensa activa y contrajuego','ADV-PAWNEND':'Finales avanzados de peones','ADV-ROOKEND':'Finales avanzados de torres','ADV-MINOREND':'Finales de piezas menores','ADV-REPERTOIRE':'Profundidad de repertorio y órdenes de jugadas','ADV-OPPPREP':'Preparación contra el rival','ADV-ANNOTATE':'Análisis profundo de partidas',
  'EXP-DEEPCALC':'Cálculo profundo y verificación','EXP-MOVEORDER':'Precisión en el orden de jugadas','EXP-PROPHY':'Profilaxis avanzada','EXP-TRANSFORM':'Transformar una ventaja en otra','EXP-TECHDEF':'Defensa técnica','EXP-COMPLEXEND':'Cálculo de finales complejos','EXP-OPENRESEARCH':'Flujo de investigación de aperturas','EXP-MODELGAMES':'Partidas modelo por estructura','EXP-ENGINE':'Uso del motor sin dependencia del motor','EXP-TOURNAMENT':'Estrategia de torneo y preparación por emparejamiento','EXP-ROUTINE':'Rutina prepartida y pospartida',
  'HP-WEAKMODEL':'Modelo individual de debilidades','HP-OPPMODEL':'Modelo del estilo del rival','HP-NOVELTY':'Investigación y prueba de novedades','HP-ENDSTUDY':'Estudio especializado de finales','HP-CALCROUTINE':'Ciclo de entrenamiento de cálculo de élite','HP-PRACTICAL':'Decisiones prácticas bajo incertidumbre','HP-DEFENSE':'Recursos defensivos de alto nivel','HP-TIME':'Rendimiento en apuros de tiempo','HP-CYCLE':'Ciclos de entrenamiento para torneos','HP-SELF':'Autoanálisis antes del motor','HP-COACHLOOP':'Ciclo de retroalimentación con el coach'
};

const reasonText={
  en:{regressed:'Regression detected; reassessment is recommended.',practicing:'Currently practicing and not yet mastered.',introduced:'Already introduced, but mastery evidence is still missing.',drill_mastered:'Solves exercises; consistent application in real games is still needed.',unseen_ready:'Next new skill with prerequisites ready.',missing_prereqs:'Prerequisite gap detected; reinforce foundations before advancing.'},
  es:{regressed:'Se detectó una regresión; conviene reevaluar.',practicing:'Está en práctica y aún no está dominada.',introduced:'Ya fue introducida, pero falta evidencia de dominio.',drill_mastered:'Resuelve ejercicios; falta aplicarla consistentemente en partidas.',unseen_ready:'Siguiente skill nueva con prerrequisitos listos.',missing_prereqs:'Hay un hueco de prerrequisitos; conviene reforzar fundamentos antes de avanzar.'}
};
export function seedCurriculumLocalizations(db){
  const upsert=db.prepare(`INSERT INTO curriculum_localizations(entity_type,entity_id,locale,title,objective,description,content_json,updated_at)
    VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(entity_type,entity_id,locale) DO UPDATE SET title=excluded.title,objective=excluded.objective,description=excluded.description,content_json=excluded.content_json,updated_at=CURRENT_TIMESTAMP`);
  db.transaction(()=>{
    for(const band of hmenaBands){const [title,focus]=bandEs[band.code];upsert.run('track',`TRACK-${band.code.toUpperCase()}`,'es',title,null,focus,'{}');}
    for(const skill of hmenaSkills){const title=skillEs[skill.code];if(title)upsert.run('skill',`SKILL-HMENA-${skill.code}`,'es',title,null,null,'{}');}
  })();
  return {locale:'es',tracks:hmenaBands.length,skills:Object.keys(skillEs).length};
}

export function localizedHmenaOverview(db,locale='en'){
  const lang=normalizeLocale(locale),base=hmenaOverview(db);if(lang==='en')return {...base,locale:lang};
  const local=db.prepare("SELECT entity_id,title,description FROM curriculum_localizations WHERE entity_type='track' AND locale=?").all(lang);
  const byId=new Map(local.map(r=>[r.entity_id,r]));
  return {...base,locale:lang,bands:base.bands.map(b=>{const l=byId.get(`TRACK-${b.code.toUpperCase()}`);return {...b,title:l?.title||b.title,mainFocus:l?.description||b.mainFocus};})};
}

export function localizedLearningPriorities(db,studentId,{locale='en',limit=5}={}){
  const lang=normalizeLocale(locale),base=recommendLearningPriorities(db,studentId,{limit});
  if(!base.placement)return {...base,locale:lang};
  const ids=base.priorities.map(p=>p.id);let labels=new Map();
  if(lang!=='en'&&ids.length){const qs=ids.map(()=>'?').join(',');labels=new Map(db.prepare(`SELECT entity_id,title FROM curriculum_localizations WHERE entity_type='skill' AND locale=? AND entity_id IN (${qs})`).all(lang,...ids).map(r=>[r.entity_id,r.title]));}
  const band=lang==='es'?bandEs[base.placement.bandCode]:null;
  return {locale:lang,needsAssessment:base.needsAssessment,placement:{...base.placement,bandTitle:band?.[0]||base.placement.bandTitle},priorities:base.priorities.map(p=>({...p,title:labels.get(p.id)||p.title,reason:reasonText[lang]?.[p.reasonCode]||p.reason}))};
}

export function localizeSkillRows(db,rows=[],locale='en'){
  const lang=normalizeLocale(locale);if(lang==='en'||!rows.length)return rows;
  const ids=rows.map(r=>r.skillId||r.id).filter(Boolean);if(!ids.length)return rows;
  const qs=ids.map(()=>'?').join(',');const labels=new Map(db.prepare(`SELECT entity_id,title FROM curriculum_localizations WHERE entity_type='skill' AND locale=? AND entity_id IN (${qs})`).all(lang,...ids).map(r=>[r.entity_id,r.title]));
  return rows.map(r=>({...r,title:labels.get(r.skillId||r.id)||r.title}));
}
