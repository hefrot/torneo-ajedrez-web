import {randomUUID} from 'node:crypto';
import {getHmenaPlacement,HMENA_FRAMEWORK_ID} from './hmena-curriculum.js';
import {normalizeLocale} from './curriculum-localization.js';
import {studentOpeningProfile} from './opening-trainer.js';
import {studentRatingProgress} from './rating-tracking.js';

export const NEXT_LESSON_VERSION='hmena-next-v1';
const mastered=new Set(['drill_mastered','applied_in_game']);
const baseScore={regressed:100,practicing:72,introduced:40,drill_mastered:30,unseen:55,applied_in_game:0};
const reasonCopy={
  en:{regressed:'Regression detected',practicing:'Still in practice',introduced:'Introduced but not mastered',unseen:'Ready for a new skill',transfer:'Needs transfer from drills to real games',games:'Recurring mistakes in recent games',puzzles:'Active puzzles from mistakes',comprehension:'Low comprehension in related classes',absence:'Missed a related class',diagnostic:'Diagnostic evidence shows a gap',opening:'Opening performance needs reinforcement',prerequisite:'Required prerequisite is not secure',blocked_evidence:'This prerequisite unlocks a higher-priority recurring issue'},
  es:{regressed:'Se detectó regresión',practicing:'Sigue en práctica',introduced:'Fue introducida pero no está dominada',unseen:'Está lista como habilidad nueva',transfer:'Falta transferir de ejercicios a partidas reales',games:'Errores recurrentes en partidas recientes',puzzles:'Problemas activos creados desde sus errores',comprehension:'Baja comprensión en clases relacionadas',absence:'Faltó a una clase relacionada',diagnostic:'El diagnóstico muestra un hueco',opening:'El rendimiento de apertura necesita refuerzo',prerequisite:'Un prerrequisito necesario aún no está sólido',blocked_evidence:'Este prerrequisito desbloquea un problema recurrente de mayor prioridad'}
};
const parseJson=value=>{try{return JSON.parse(value||'{}');}catch{return {};}};
const addReason=(candidate,code,weight,detail=null)=>{candidate.score+=weight;candidate.reasons.push({code,weight,detail});};

function localSkill(db,skill,locale){
  if(locale==='en')return skill;
  const row=db.prepare("SELECT title FROM curriculum_localizations WHERE entity_type='skill' AND entity_id=? AND locale=?").get(skill.id,locale);
  return {...skill,title:row?.title||skill.title};
}
function localLesson(db,lessonId,locale){
  if(!lessonId)return null;
  const row=db.prepare(`SELECT l.id,l.title,l.objective,l.content_json AS metaJson,cl.title AS localTitle,cl.objective AS localObjective,cl.content_json AS localJson FROM lessons l LEFT JOIN curriculum_localizations cl ON cl.entity_type='lesson' AND cl.entity_id=l.id AND cl.locale=? WHERE l.id=?`).get(locale,lessonId);
  if(!row)return null;
  return {id:row.id,title:row.localTitle||row.title,objective:row.localObjective||row.objective,meta:parseJson(row.metaJson),content:parseJson(row.localJson)};
}
function bestLessonForSkill(db,skillId,locale){
  const row=db.prepare(`SELECT l.id FROM lesson_skills ls JOIN lessons l ON l.id=ls.lesson_id WHERE ls.skill_id=? AND l.active=1 ORDER BY CASE ls.role WHEN 'primary' THEN 0 WHEN 'supporting' THEN 1 ELSE 2 END,l.id LIMIT 1`).get(skillId);
  return localLesson(db,row?.id,locale);
}
function placementSkills(db,studentId,placement){
  const rows=db.prepare(`SELECT s.id,s.code,s.title,s.domain,s.rating_min AS ratingMin,s.sequence_no AS sequenceNo,COALESCE(ss.status,'unseen') AS status,ss.confidence,ss.evidence_json AS evidenceJson FROM curriculum_skills s LEFT JOIN student_skills ss ON ss.student_id=? AND ss.skill_id=s.id WHERE s.track_id=(SELECT track_id FROM student_curriculum_placements WHERE student_id=? AND framework_id=?) AND s.active=1 ORDER BY s.sequence_no`).all(studentId,studentId,HMENA_FRAMEWORK_ID);
  return rows.map(r=>({...r,evidence:parseJson(r.evidenceJson)}));
}
function prerequisiteRows(db,studentId,skillId){
  return db.prepare(`SELECT p.id,p.code,p.title,p.domain,p.rating_min AS ratingMin,p.sequence_no AS sequenceNo,COALESCE(ss.status,'unseen') AS status,ss.confidence,ss.evidence_json AS evidenceJson FROM curriculum_skill_dependencies d JOIN curriculum_skills p ON p.id=d.prerequisite_skill_id LEFT JOIN student_skills ss ON ss.student_id=? AND ss.skill_id=p.id WHERE d.skill_id=? AND d.dependency_type='required' ORDER BY p.sequence_no`).all(studentId,skillId).map(r=>({...r,evidence:parseJson(r.evidenceJson)}));
}
function prerequisiteReady(skill,placement){
  if(mastered.has(skill.status)||['introduced','practicing'].includes(skill.status))return true;
  const negative=skill.status==='regressed'||skill.evidence?.diagnostic?.correct===false;
  if(skill.status==='unseen'&&!negative&&Number(skill.ratingMin||0)<Number(placement.ratingMin||0))return true;
  return false;
}
function unresolvedLeaves(db,studentId,skill,placement,seen=new Set()){
  if(seen.has(skill.id))return [];
  seen.add(skill.id);
  const prereqs=prerequisiteRows(db,studentId,skill.id).filter(p=>!prerequisiteReady(p,placement));
  if(!prereqs.length)return [skill];
  return prereqs.flatMap(p=>unresolvedLeaves(db,studentId,p,placement,seen));
}
function seedCandidates(db,studentId,placement){
  const map=new Map();
  for(const skill of placementSkills(db,studentId,placement)){
    if(skill.status==='applied_in_game')continue;
    const leaves=unresolvedLeaves(db,studentId,skill,placement);
    for(const leaf of leaves){
      if(!map.has(leaf.id))map.set(leaf.id,{...leaf,score:Number(baseScore[leaf.status]||0),reasons:[],sourceSkillIds:new Set()});
      map.get(leaf.id).sourceSkillIds.add(skill.id);
      if(leaf.id!==skill.id&&!map.get(leaf.id).reasons.some(r=>r.code==='prerequisite'))addReason(map.get(leaf.id),'prerequisite',18,{forSkill:skill.code});
    }
  }
  return map;
}
function skillById(db,studentId,skillId){
  const row=db.prepare(`SELECT s.id,s.code,s.title,s.domain,s.rating_min AS ratingMin,s.sequence_no AS sequenceNo,COALESCE(ss.status,'unseen') AS status,ss.confidence,ss.evidence_json AS evidenceJson FROM curriculum_skills s LEFT JOIN student_skills ss ON ss.student_id=? AND ss.skill_id=s.id WHERE s.id=?`).get(studentId,skillId);
  return row?{...row,evidence:parseJson(row.evidenceJson)}:null;
}
function ensureCandidate(db,map,studentId,skillId){
  if(!skillId)return null;
  if(!map.has(skillId)){
    const skill=skillById(db,studentId,skillId);if(!skill||skill.status==='applied_in_game')return null;
    map.set(skillId,{...skill,score:Number(baseScore[skill.status]||0),reasons:[],sourceSkillIds:new Set([skillId])});
  }
  return map.get(skillId);
}
function addStatusReason(candidate){
  const code=candidate.status==='drill_mastered'?'transfer':candidate.status;
  if(['regressed','practicing','introduced','unseen','transfer'].includes(code))candidate.reasons.unshift({code,weight:Number(baseScore[candidate.status]||0),detail:null});
}
function applyGameEvidence(db,map,studentId){
  const rows=db.prepare(`SELECT skill_id AS skillId,COUNT(*) AS occurrences,AVG(COALESCE(severity,1)) AS avgSeverity,MAX(created_at) AS lastSeen FROM student_game_findings WHERE student_id=? AND skill_id IS NOT NULL GROUP BY skill_id`).all(studentId);
  for(const row of rows){const c=ensureCandidate(db,map,studentId,row.skillId);if(!c)continue;const weight=Math.min(48,Math.round(Number(row.occurrences)*Number(row.avgSeverity)*3));addReason(c,'games',weight,{occurrences:Number(row.occurrences),avgSeverity:Number(Number(row.avgSeverity).toFixed(1)),lastSeen:row.lastSeen});}
}
function applyPuzzleEvidence(db,map,studentId){
  const rows=db.prepare(`SELECT skill_id AS skillId,COUNT(*) AS active FROM training_puzzles WHERE student_id=? AND status='active' AND skill_id IS NOT NULL GROUP BY skill_id`).all(studentId);
  for(const row of rows){const c=ensureCandidate(db,map,studentId,row.skillId);if(!c)continue;addReason(c,'puzzles',Math.min(20,Number(row.active)*5),{active:Number(row.active)});}
}
function applyClassEvidence(db,map,studentId){
  const rows=db.prepare(`SELECT ls.skill_id AS skillId,AVG(a.comprehension_score) AS avgComprehension,SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) AS absences FROM attendance a JOIN class_sessions cs ON cs.id=a.session_id JOIN session_lessons sl ON sl.session_id=cs.id JOIN lesson_skills ls ON ls.lesson_id=sl.lesson_id WHERE a.student_id=? GROUP BY ls.skill_id`).all(studentId);
  for(const row of rows){const c=ensureCandidate(db,map,studentId,row.skillId);if(!c)continue;if(row.avgComprehension!=null&&Number(row.avgComprehension)<3.5)addReason(c,'comprehension',Math.min(28,Math.round((4-Number(row.avgComprehension))*12)),{avg:Number(Number(row.avgComprehension).toFixed(2))});if(Number(row.absences)>0)addReason(c,'absence',Math.min(18,Number(row.absences)*6),{absences:Number(row.absences)});}
}
function applyDiagnosticEvidence(db,map,studentId){
  for(const c of map.values()){
    const d=c.evidence?.diagnostic;if(!d)continue;
    if(d.correct===false)addReason(c,'diagnostic',26,{attemptId:d.attemptId});
    else if(d.correct===true&&c.status==='practicing')addReason(c,'diagnostic',6,{attemptId:d.attemptId});
  }
}
function applyOpeningEvidence(db,map,studentId,placement,locale){
  const profile=studentOpeningProfile(db,studentId,{locale});const focus=profile?.focus;
  if(!focus||focus.games<2)return profile;
  const code=['hmena-0-400','hmena-400-800'].includes(placement.bandCode)?'FND-OPENING':'INT-OPENPLAN';
  const skill=db.prepare('SELECT id FROM curriculum_skills WHERE code=?').get(code);const c=ensureCandidate(db,map,studentId,skill?.id);
  if(c&&(focus.criticalOpeningErrors>0||Number(focus.openingAvgCpLoss||0)>=80))addReason(c,'opening',Math.min(28,10+focus.criticalOpeningErrors*4),{opening:focus.openingName,games:focus.games,avgCpLoss:focus.openingAvgCpLoss,critical:focus.criticalOpeningErrors});
  return profile;
}
function ratingContext(db,studentId){
  const ratings=studentRatingProgress(db,studentId);const series=ratings?.series||[];
  return series.map(s=>({platform:s.platform,ratingType:s.ratingType,first:s.firstRating,latest:s.latestRating,delta:s.delta,days:s.points.length}));
}
function nextPrivateSession(db,studentId){
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return db.prepare(`SELECT cs.id,cs.starts_at AS startsAt,p.id AS programId,p.name AS programName FROM enrollments e JOIN programs p ON p.id=e.program_id JOIN class_sessions cs ON cs.program_id=p.id WHERE e.student_id=? AND e.status='active' AND p.program_type='private' AND cs.status='scheduled' AND substr(cs.starts_at,1,10)>=? ORDER BY cs.starts_at LIMIT 1`).get(studentId,today)||null;
}
function latestClassContext(db,studentId){
  return db.prepare(`SELECT cs.starts_at AS startsAt,l.id AS lessonId,l.title,a.status,a.comprehension_score AS comprehension FROM attendance a JOIN class_sessions cs ON cs.id=a.session_id LEFT JOIN session_lessons sl ON sl.session_id=cs.id LEFT JOIN lessons l ON l.id=sl.lesson_id WHERE a.student_id=? ORDER BY cs.starts_at DESC LIMIT 5`).all(studentId);
}
function propagateBlockedEvidence(db,map,studentId,placement){
  const evidenceCodes=new Set(['games','puzzles','comprehension','diagnostic','opening']);
  for(const candidate of [...map.values()]){
    if(candidateReady(db,studentId,candidate,placement))continue;
    const urgency=candidate.reasons.filter(r=>evidenceCodes.has(r.code)).reduce((n,r)=>n+Number(r.weight||0),0);if(!urgency)continue;
    const leaves=unresolvedLeaves(db,studentId,candidate,placement,new Set());
    for(const leaf of leaves){if(leaf.id===candidate.id)continue;const target=ensureCandidate(db,map,studentId,leaf.id);if(target)addReason(target,'blocked_evidence',Math.min(35,Math.round(urgency*.6)),{sourceSkill:candidate.code});}
  }
}
function candidateReady(db,studentId,candidate,placement){
  return prerequisiteRows(db,studentId,candidate.id).every(p=>prerequisiteReady(p,placement));
}
function actionFor(candidate){
  if(candidate.status==='regressed')return 'reassess';
  if(candidate.reasons.some(r=>r.code==='games'))return 'review_and_drill';
  if(candidate.status==='drill_mastered')return 'transfer_to_game';
  if(candidate.status==='introduced'||candidate.status==='practicing')return 'practice';
  return 'introduce';
}
function localizedReasons(candidate,locale){
  return candidate.reasons.map(r=>({...r,text:reasonCopy[locale]?.[r.code]||r.code}));
}
function assessmentLesson(db,bandCode,locale){
  const id=bandCode==='hmena-0-400'?'LESSON-HMENA-0400-L10':bandCode==='hmena-400-800'?'LESSON-HMENA-0800-L10':null;
  return localLesson(db,id,locale);
}
function formatCandidate(db,candidate,locale){
  const skill=localSkill(db,candidate,locale),lesson=bestLessonForSkill(db,candidate.id,locale);
  const evidenceCodes=new Set(candidate.reasons.filter(r=>!['regressed','practicing','introduced','unseen','transfer','prerequisite'].includes(r.code)).map(r=>r.code));
  const confidence=Math.min(94,45+evidenceCodes.size*11+Math.min(20,candidate.reasons.length*3));
  return {skill:{id:skill.id,code:skill.code,title:skill.title,domain:skill.domain,status:skill.status,confidence:skill.confidence},lesson,score:Number(candidate.score.toFixed(1)),confidence,action:actionFor(candidate),reasons:localizedReasons(candidate,locale)};
}
export function nextLessonRecommendation(db,studentId,{locale='en'}={}){
  const lang=normalizeLocale(locale);const student=db.prepare('SELECT id,display_name AS displayName FROM students WHERE id=?').get(studentId);if(!student)return null;
  const placement=getHmenaPlacement(db,studentId);
  if(!placement)return {student,locale:lang,kind:'diagnostic',placement:null,recommendation:null,alternatives:[],context:{ratings:ratingContext(db,studentId),recentClasses:latestClassContext(db,studentId),nextPrivateSession:nextPrivateSession(db,studentId)},message:lang==='es'?'Primero completa el diagnóstico HMENA para recomendar una clase.':'Complete the HMENA diagnostic before recommending a lesson.'};
  const map=seedCandidates(db,studentId,placement);for(const c of map.values())addStatusReason(c);
  applyGameEvidence(db,map,studentId);applyPuzzleEvidence(db,map,studentId);applyClassEvidence(db,map,studentId);applyDiagnosticEvidence(db,map,studentId);
  const opening=applyOpeningEvidence(db,map,studentId,placement,lang);propagateBlockedEvidence(db,map,studentId,placement);
  const ranked=[...map.values()].filter(c=>c.score>0&&candidateReady(db,studentId,c,placement)).sort((a,b)=>b.score-a.score||a.sequenceNo-b.sequenceNo);
  if(!ranked.length){const lesson=assessmentLesson(db,placement.bandCode,lang);return {student,locale:lang,kind:'assessment',placement,recommendation:lesson?{skill:null,lesson,score:0,confidence:80,action:'assess',reasons:[]}:null,alternatives:[],context:{ratings:ratingContext(db,studentId),recentClasses:latestClassContext(db,studentId),opening,nextPrivateSession:nextPrivateSession(db,studentId)},message:lang==='es'?'Las habilidades de la banda están sólidas; conviene reevaluar para avanzar.':'Band skills are secure; reassess for advancement.'};}
  const formatted=ranked.slice(0,4).map(c=>formatCandidate(db,c,lang));
  return {student,locale:lang,kind:'lesson',placement,recommendation:formatted[0],alternatives:formatted.slice(1),context:{ratings:ratingContext(db,studentId),recentClasses:latestClassContext(db,studentId),opening,nextPrivateSession:nextPrivateSession(db,studentId)},algorithmVersion:NEXT_LESSON_VERSION};
}
export function recordCoachLessonDecision(db,{studentId,decision='accepted',selectedSkillCode=null,selectedLessonId=null,coachNote=null,locale='en',assignToNextPrivateSession=false}={}){
  if(!['accepted','overridden','dismissed'].includes(decision))throw new TypeError('invalid decision');
  const rec=nextLessonRecommendation(db,studentId,{locale});if(!rec)throw new TypeError('student not found');
  const recommended=rec.recommendation;let selectedSkillId=recommended?.skill?.id||null,selectedLesson=recommended?.lesson||null;
  if(decision==='overridden'){
    if(selectedSkillCode){const row=db.prepare('SELECT id FROM curriculum_skills WHERE code=?').get(selectedSkillCode);if(!row)throw new TypeError('selected skill not found');selectedSkillId=row.id;}
    if(selectedLessonId){selectedLesson=localLesson(db,selectedLessonId,normalizeLocale(locale));if(!selectedLesson)throw new TypeError('selected lesson not found');}
    if(!selectedSkillId&&!selectedLesson)throw new TypeError('override requires a selected skill or lesson');
  }
  if(decision==='dismissed'){selectedSkillId=null;selectedLesson=null;}
  const id=`CLD-${randomUUID()}`;
  db.prepare(`INSERT INTO coach_lesson_decisions(id,student_id,recommended_skill_id,recommended_lesson_id,selected_skill_id,selected_lesson_id,algorithm_version,recommendation_score,confidence,reasons_json,context_json,decision,coach_note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(id,studentId,recommended?.skill?.id||null,recommended?.lesson?.id||null,selectedSkillId,selectedLesson?.id||null,NEXT_LESSON_VERSION,recommended?.score??null,recommended?.confidence??null,JSON.stringify(recommended?.reasons||[]),JSON.stringify(rec.context||{}),decision,coachNote||null);
  let assignment=null;
  if(assignToNextPrivateSession&&decision!=='dismissed'&&selectedLesson?.id){const session=nextPrivateSession(db,studentId);if(session){const planned=db.prepare('SELECT COUNT(*) AS n FROM session_lessons WHERE session_id=?').get(session.id).n;if(!planned){db.prepare(`INSERT INTO session_lessons(session_id,lesson_id,sequence_no,delivery_stage) VALUES (?,?,1,'theory_only')`).run(session.id,selectedLesson.id);assignment={assigned:true,...session,lessonId:selectedLesson.id};}else assignment={assigned:false,reason:'session_already_planned',...session};}}
  return {id,studentId,decision,recommended,selected:{skillId:selectedSkillId,lesson:selectedLesson},coachNote:coachNote||null,assignment};
}

export function latestApprovedPlan(db,studentId,{locale='en'}={}){
  const row=db.prepare(`SELECT * FROM coach_lesson_decisions WHERE student_id=? AND decision IN ('accepted','overridden') ORDER BY created_at DESC,id DESC LIMIT 1`).get(studentId);if(!row)return null;
  const lesson=localLesson(db,row.selected_lesson_id,normalizeLocale(locale));const skill=row.selected_skill_id?localSkill(db,skillById(db,studentId,row.selected_skill_id),normalizeLocale(locale)):null;
  return {id:row.id,decision:row.decision,lesson,skill:skill?{id:skill.id,code:skill.code,title:skill.title,status:skill.status}:null,coachNote:row.coach_note,createdAt:row.created_at};
}
