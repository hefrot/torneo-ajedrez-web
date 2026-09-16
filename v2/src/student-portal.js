import {getHmenaPlacement} from './hmena-curriculum.js';
import {normalizeLocale,localizedLearningPriorities,localizeSkillRows} from './curriculum-localization.js';
import {studentRatingProgress} from './rating-tracking.js';

export function studentPortalDashboard(db,accountId,{now=new Date()}={}){
  const account=db.prepare("SELECT id,login_name AS loginName,display_name AS displayName,role,preferred_locale AS preferredLocale FROM portal_accounts WHERE id=? AND status='active'").get(accountId);
  if(!account)return null;
  const students=db.prepare(`SELECT s.id,s.display_name AS displayName,s.status,s.current_level AS currentLevel,s.target_level AS targetLevel,s.preferred_locale AS preferredLocale FROM portal_account_students pas JOIN students s ON s.id=pas.student_id WHERE pas.account_id=? ORDER BY s.display_name`).all(accountId);
  const upcomingStmt=db.prepare(`SELECT cs.id,cs.starts_at AS startsAt,cs.duration_minutes AS durationMinutes,cs.week_no AS weekNo,cs.title,p.name AS programName,sc.name AS schoolName,COALESCE(cs.instruction_locale,p.instruction_locale,'en') AS instructionLocale FROM enrollments e JOIN class_sessions cs ON cs.program_id=e.program_id JOIN programs p ON p.id=e.program_id LEFT JOIN schools sc ON sc.id=p.school_id WHERE e.student_id=? AND e.status='active' AND cs.status='scheduled' AND cs.starts_at>=? ORDER BY cs.starts_at LIMIT 8`);
  const assignmentStmt=db.prepare(`SELECT id,title,details,due_at AS dueAt,status FROM assignments WHERE student_id=? AND status IN ('assigned','submitted') ORDER BY COALESCE(due_at,'9999') LIMIT 10`);
  const attendanceStmt=db.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present,ROUND(AVG(comprehension_score),2) AS avgComprehension FROM attendance WHERE student_id=?`);
  const noteStmt=db.prepare(`SELECT note,created_at AS createdAt FROM coach_notes WHERE student_id=? AND visibility='guardian_visible' ORDER BY created_at DESC LIMIT 10`);
  const skillStmt=db.prepare(`SELECT cs.code,cs.title,ss.status,ss.confidence,ss.last_assessed_at AS lastAssessedAt FROM student_skills ss JOIN curriculum_skills cs ON cs.id=ss.skill_id JOIN curriculum_tracks ct ON ct.id=cs.track_id WHERE ss.student_id=? AND ct.framework_id='FRAMEWORK-HMENA-2500' ORDER BY cs.sequence_no`);
  const at=now.toISOString();const locale=normalizeLocale(account.preferredLocale||'en');
  return {account:{...account,preferredLocale:locale},locale,students:students.map(student=>{const learning=localizedLearningPriorities(db,student.id,{locale,limit:5});const placement=learning.placement||getHmenaPlacement(db,student.id);const skills=localizeSkillRows(db,skillStmt.all(student.id),locale);return ({
    ...student,
    placement,
    priorities:learning.priorities,
    ratings:studentRatingProgress(db,student.id),
    upcoming:upcomingStmt.all(student.id,at),
    assignments:assignmentStmt.all(student.id),
    attendance:attendanceStmt.get(student.id),
    skills,
    sharedCoachNotes:account.role==='guardian'?noteStmt.all(student.id):[]
  })})};
}
