import {randomUUID} from 'node:crypto';
import {getHmenaPlacement} from './hmena-curriculum.js';
import {studentRatingProgress} from './rating-tracking.js';
import {normalizeLocale} from './curriculum-localization.js';

const iso=value=>value instanceof Date?value.toISOString():new Date(value).toISOString();
const parse=value=>{try{return JSON.parse(value||'{}');}catch{return {};}};
const daysAgo=(now,days)=>new Date(now.getTime()-Math.max(1,Number(days)||30)*86400000);

function periodRatings(db,studentId,start,end){
  const data=studentRatingProgress(db,studentId),from=Date.parse(start),to=Date.parse(end);
  return (data?.series||[]).map(series=>{
    const points=series.points||[],eligible=points.filter(p=>Date.parse(p.capturedAt)<=to);
    if(!eligible.length)return null;
    const endPoint=eligible.at(-1),before=eligible.filter(p=>Date.parse(p.capturedAt)<=from).at(-1),within=eligible.filter(p=>Date.parse(p.capturedAt)>=from);
    const startPoint=before||within[0]||eligible[0];
    return {platform:series.platform,username:series.username,ratingType:series.ratingType,startRating:startPoint.rating,endRating:endPoint.rating,delta:Number(endPoint.rating)-Number(startPoint.rating),startAt:startPoint.capturedAt,endAt:endPoint.capturedAt};
  }).filter(Boolean);
}

function recentLessons(db,studentId,start,end){
  return db.prepare(`SELECT DISTINCT l.id,l.title,MAX(cs.starts_at) AS taughtAt FROM attendance a JOIN class_sessions cs ON cs.id=a.session_id JOIN session_lessons sl ON sl.session_id=cs.id JOIN lessons l ON l.id=sl.lesson_id WHERE a.student_id=? AND a.status IN ('present','late') AND datetime(cs.starts_at)>=datetime(?) AND datetime(cs.starts_at)<=datetime(?) GROUP BY l.id,l.title ORDER BY taughtAt DESC LIMIT 12`).all(studentId,start,end);
}
export function buildProgressReportSnapshot(db,studentId,{days=30,now=new Date()}={}){
  const student=db.prepare('SELECT id,display_name AS displayName FROM students WHERE id=?').get(studentId);if(!student)throw new TypeError('student not found');
  const end=iso(now),start=iso(daysAgo(now,days));
  const attendance=db.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) AS attended,SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) AS absent,ROUND(AVG(a.comprehension_score),2) AS avgComprehension FROM attendance a JOIN class_sessions cs ON cs.id=a.session_id WHERE a.student_id=? AND datetime(cs.starts_at)>=datetime(?) AND datetime(cs.starts_at)<=datetime(?)`).get(studentId,start,end);
  const skills=db.prepare(`SELECT cs.code,ss.status,ss.last_assessed_at AS lastAssessedAt FROM student_skills ss JOIN curriculum_skills cs ON cs.id=ss.skill_id JOIN curriculum_tracks ct ON ct.id=cs.track_id WHERE ss.student_id=? AND ct.framework_id='FRAMEWORK-HMENA-2500' AND ss.last_assessed_at IS NOT NULL AND datetime(ss.last_assessed_at)>=datetime(?) AND datetime(ss.last_assessed_at)<=datetime(?) ORDER BY ss.last_assessed_at DESC`).all(studentId,start,end);
  const findings=db.prepare(`SELECT cs.code,COUNT(*) AS occurrences,ROUND(AVG(COALESCE(f.severity,1)),1) AS avgSeverity FROM student_game_findings f LEFT JOIN curriculum_skills cs ON cs.id=f.skill_id WHERE f.student_id=? AND datetime(f.created_at)>=datetime(?) AND datetime(f.created_at)<=datetime(?) GROUP BY cs.code ORDER BY occurrences DESC,avgSeverity DESC LIMIT 8`).all(studentId,start,end);
  const assignments=db.prepare(`SELECT id,title,due_at AS dueAt,status,skill_id AS skillId FROM assignments WHERE student_id=? AND status IN ('assigned','submitted') ORDER BY COALESCE(due_at,'9999') LIMIT 10`).all(studentId);
  const guardianNotes=db.prepare(`SELECT note,created_at AS createdAt FROM coach_notes WHERE student_id=? AND visibility='guardian_visible' AND datetime(created_at)>=datetime(?) AND datetime(created_at)<=datetime(?) ORDER BY created_at DESC LIMIT 5`).all(studentId,start,end);
  const nextDecision=db.prepare(`SELECT selected_skill_id AS skillId,selected_lesson_id AS lessonId,created_at AS createdAt FROM coach_lesson_decisions WHERE student_id=? AND decision IN ('accepted','overridden') ORDER BY created_at DESC,id DESC LIMIT 1`).get(studentId)||null;
  const nextClass=db.prepare(`SELECT cs.starts_at AS startsAt,p.name AS programName,s.name AS schoolName FROM enrollments e JOIN programs p ON p.id=e.program_id LEFT JOIN schools s ON s.id=p.school_id JOIN class_sessions cs ON cs.program_id=p.id WHERE e.student_id=? AND e.status='active' AND cs.status='scheduled' AND datetime(cs.starts_at)>datetime(?) ORDER BY cs.starts_at LIMIT 1`).get(studentId,end)||null;
  return {version:1,student,period:{start,end,days:Number(days)},placement:getHmenaPlacement(db,studentId),attendance:{total:Number(attendance.total||0),attended:Number(attendance.attended||0),absent:Number(attendance.absent||0),avgComprehension:attendance.avgComprehension==null?null:Number(attendance.avgComprehension)},skills,recentLessons:recentLessons(db,studentId,start,end),ratings:periodRatings(db,studentId,start,end),findings,assignments,guardianNotes,nextDecision,nextClass};
}
const statusCopy={en:{introduced:'Introduced',practicing:'Practicing',drill_mastered:'Drill mastered',applied_in_game:'Applied in game',regressed:'Needs refresh',unseen:'Not yet assessed'},es:{introduced:'Introducida',practicing:'En práctica',drill_mastered:'Dominada en ejercicios',applied_in_game:'Aplicada en partida',regressed:'Necesita refuerzo',unseen:'Aún no evaluada'}};
const copy={en:{headline:(a,t,m)=>`${a}/${t} classes attended · ${m} skills secured this period.`,focus:'Next focus',noFocus:'Your coach has not published a next focus yet.'},es:{headline:(a,t,m)=>`${a}/${t} clases asistidas · ${m} habilidades consolidadas en este periodo.`,focus:'Próximo enfoque',noFocus:'Tu coach todavía no ha publicado el siguiente enfoque.'}};
function skillTitle(db,code,locale){if(!code)return null;return db.prepare(`SELECT COALESCE(cl.title,cs.title) AS title FROM curriculum_skills cs LEFT JOIN curriculum_localizations cl ON cl.entity_type='skill' AND cl.entity_id=cs.id AND cl.locale=? WHERE cs.code=?`).get(locale,code)?.title||code;}
function lessonInfo(db,id,locale){if(!id)return null;return db.prepare(`SELECT l.id,COALESCE(cl.title,l.title) AS title,COALESCE(cl.objective,l.objective) AS objective FROM lessons l LEFT JOIN curriculum_localizations cl ON cl.entity_type='lesson' AND cl.entity_id=l.id AND cl.locale=? WHERE l.id=?`).get(locale,id)||null;}
function placementInfo(db,snapshot,locale){const code=snapshot.placement?.bandCode;if(!code)return null;return db.prepare(`SELECT t.code AS bandCode,COALESCE(cl.title,t.title) AS bandTitle,t.rating_min AS ratingMin,t.rating_max AS ratingMax FROM curriculum_tracks t LEFT JOIN curriculum_localizations cl ON cl.entity_type='track' AND cl.entity_id=t.id AND cl.locale=? WHERE t.code=? AND t.framework_id='FRAMEWORK-HMENA-2500'`).get(locale,code)||snapshot.placement;}

export function localizeProgressReport(db,snapshot,{locale='en'}={}){
  const lang=normalizeLocale(locale),skills=(snapshot.skills||[]).map(s=>({...s,title:skillTitle(db,s.code,lang),statusLabel:statusCopy[lang][s.status]||s.status}));
  const mastered=skills.filter(s=>['drill_mastered','applied_in_game'].includes(s.status)),practicing=skills.filter(s=>['introduced','practicing'].includes(s.status)),refresh=skills.filter(s=>s.status==='regressed');
  const lessons=(snapshot.recentLessons||[]).map(l=>({...l,...lessonInfo(db,l.id,lang)}));
  const findings=(snapshot.findings||[]).map(f=>({...f,skillTitle:skillTitle(db,f.code,lang)}));
  const selectedSkill=snapshot.nextDecision?.skillId?db.prepare('SELECT code FROM curriculum_skills WHERE id=?').get(snapshot.nextDecision.skillId)?.code:null;
  const nextFocus=snapshot.nextDecision?{skill:selectedSkill?{code:selectedSkill,title:skillTitle(db,selectedSkill,lang)}:null,lesson:lessonInfo(db,snapshot.nextDecision.lessonId,lang),createdAt:snapshot.nextDecision.createdAt}:null;
  const attendance=snapshot.attendance||{total:0,attended:0};
  return {...snapshot,locale:lang,placement:placementInfo(db,snapshot,lang),skills:{mastered,practicing,refresh},recentLessons:lessons,findings,nextFocus,headline:copy[lang].headline(attendance.attended||0,attendance.total||0,mastered.length),focusLabel:copy[lang].focus,noFocus:copy[lang].noFocus};
}
export function createProgressReportDraft(db,studentId,{days=30,now=new Date()}={}){
  const snapshot=buildProgressReportSnapshot(db,studentId,{days,now}),id=`RPT-${randomUUID()}`;
  db.prepare(`INSERT INTO progress_reports(id,student_id,period_start,period_end,status,snapshot_json) VALUES (?,?,?,?, 'draft',?)`).run(id,studentId,snapshot.period.start,snapshot.period.end,JSON.stringify(snapshot));
  return {id,studentId,status:'draft',period:snapshot.period};
}

export function publishProgressReport(db,reportId,{now=new Date()}={}){
  const row=db.prepare('SELECT id,student_id AS studentId,status FROM progress_reports WHERE id=?').get(reportId);if(!row)throw new TypeError('report not found');
  if(row.status==='archived')throw new TypeError('archived report cannot be published');
  db.prepare("UPDATE progress_reports SET status='published',published_at=? WHERE id=?").run(now.toISOString(),reportId);
  return {id:reportId,studentId:row.studentId,status:'published',publishedAt:now.toISOString()};
}

export function listProgressReports(db,studentId,{locale='en',publishedOnly=false,limit=12}={}){
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))return [];
  const where=publishedOnly?"AND status='published'":'';
  return db.prepare(`SELECT id,status,period_start AS periodStart,period_end AS periodEnd,snapshot_json AS snapshotJson,created_at AS createdAt,published_at AS publishedAt FROM progress_reports WHERE student_id=? ${where} ORDER BY period_end DESC,created_at DESC LIMIT ?`).all(studentId,Math.max(1,Math.min(50,Number(limit)||12))).map(row=>({id:row.id,status:row.status,periodStart:row.periodStart,periodEnd:row.periodEnd,createdAt:row.createdAt,publishedAt:row.publishedAt,report:localizeProgressReport(db,parse(row.snapshotJson),{locale})}));
}

export function progressReportPreview(db,studentId,{locale='en',days=30,now=new Date()}={}){return localizeProgressReport(db,buildProgressReportSnapshot(db,studentId,{days,now}),{locale});}
