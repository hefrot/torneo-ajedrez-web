import {nextLessonRecommendation} from './next-lesson-engine.js';
import {normalizeLocale} from './curriculum-localization.js';

function nextSession(db,programId){
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return db.prepare(`SELECT id,starts_at AS startsAt,week_no AS weekNo FROM class_sessions WHERE program_id=? AND status='scheduled' AND substr(starts_at,1,10)>=? ORDER BY starts_at LIMIT 1`).get(programId,today)||null;
}
function roster(db,programId,cohortTier=null){
  if(cohortTier)return db.prepare(`SELECT s.id,s.display_name AS displayName,e.cohort_tier AS cohortTier FROM enrollments e JOIN students s ON s.id=e.student_id WHERE e.program_id=? AND e.status='active' AND COALESCE(e.cohort_tier,'')=? ORDER BY s.display_name`).all(programId,cohortTier);
  return db.prepare(`SELECT s.id,s.display_name AS displayName,e.cohort_tier AS cohortTier FROM enrollments e JOIN students s ON s.id=e.student_id WHERE e.program_id=? AND e.status='active' ORDER BY s.display_name`).all(programId);
}
function aggregateRecommendations(db,students,locale){
  const groups=new Map();let diagnostics=0,eligible=0;
  for(const student of students){
    const rec=nextLessonRecommendation(db,student.id,{locale});
    if(rec?.kind==='diagnostic'){diagnostics+=1;continue;}
    const primary=rec?.recommendation;if(!primary?.lesson?.id)continue;eligible+=1;
    const key=primary.lesson.id;
    if(!groups.has(key))groups.set(key,{lesson:primary.lesson,skill:primary.skill,students:[],scoreSum:0,confidenceSum:0});
    const row=groups.get(key);row.students.push({id:student.id,displayName:student.displayName,score:primary.score,confidence:primary.confidence});row.scoreSum+=Number(primary.score||0);row.confidenceSum+=Number(primary.confidence||0);
  }
  const suggestions=[...groups.values()].map(g=>({...g,studentCount:g.students.length,avgScore:g.students.length?Number((g.scoreSum/g.students.length).toFixed(1)):0,avgConfidence:g.students.length?Math.round(g.confidenceSum/g.students.length):0,coverage:students.length?Number((g.students.length/students.length).toFixed(2)):0})).sort((a,b)=>b.studentCount-a.studentCount||b.avgScore-a.avgScore);
  return {suggestions,diagnostics,eligible};
}
export function programLessonRecommendation(db,programId,{locale='en'}={}){
  const lang=normalizeLocale(locale);const program=db.prepare(`SELECT p.id,p.name,p.program_type AS programType,p.instruction_locale AS instructionLocale,s.name AS schoolName FROM programs p LEFT JOIN schools s ON s.id=p.school_id WHERE p.id=?`).get(programId);if(!program)return null;
  const students=roster(db,programId);const overall=aggregateRecommendations(db,students,lang);
  const tiers=[...new Set(students.map(s=>s.cohortTier).filter(Boolean))];
  const byTier=tiers.map(tier=>{const rows=students.filter(s=>s.cohortTier===tier),agg=aggregateRecommendations(db,rows,lang);return {cohortTier:tier,rosterCount:rows.length,suggestion:agg.suggestions[0]||null,alternatives:agg.suggestions.slice(1,3),diagnosticsNeeded:agg.diagnostics,eligible:agg.eligible,suggestions:agg.suggestions};});
  const top=overall.suggestions[0]||null,second=overall.suggestions[1]||null;
  return {program,locale:lang,rosterCount:students.length,nextSession:nextSession(db,programId),diagnosticsNeeded:overall.diagnostics,suggestion:top,alternatives:overall.suggestions.slice(1,4),differentiated:Boolean(byTier.length>1||(top&&top.coverage<0.5&&second)),byTier};
}

export function assignProgramLesson(db,{programId,lessonId,sessionId=null,cohortTier=null,deliveryStage='theory_only'}={}){
  const program=db.prepare('SELECT id FROM programs WHERE id=?').get(programId);if(!program)throw new TypeError('program not found');
  if(!db.prepare('SELECT 1 FROM lessons WHERE id=?').get(lessonId))throw new TypeError('lesson not found');
  const session=sessionId?db.prepare("SELECT id,program_id AS programId,starts_at AS startsAt FROM class_sessions WHERE id=? AND program_id=?").get(sessionId,programId):nextSession(db,programId);
  if(!session)throw new TypeError('scheduled session not found');
  const existing=db.prepare('SELECT lesson_id AS lessonId FROM session_lessons WHERE session_id=? AND lesson_id=?').get(session.id,lessonId);
  if(existing){db.prepare('UPDATE session_lessons SET cohort_tier=?,delivery_stage=? WHERE session_id=? AND lesson_id=?').run(cohortTier||null,deliveryStage,session.id,lessonId);return {assigned:true,idempotent:true,sessionId:session.id,lessonId,cohortTier:cohortTier||null};}
  const seq=(db.prepare('SELECT COALESCE(MAX(sequence_no),0)+1 AS n FROM session_lessons WHERE session_id=?').get(session.id).n)||1;
  db.prepare('INSERT INTO session_lessons(session_id,lesson_id,sequence_no,delivery_stage,cohort_tier) VALUES (?,?,?,?,?)').run(session.id,lessonId,seq,deliveryStage,cohortTier||null);
  return {assigned:true,idempotent:false,sessionId:session.id,lessonId,cohortTier:cohortTier||null,sequenceNo:seq};
}
