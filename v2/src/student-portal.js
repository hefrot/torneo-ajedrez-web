import {getHmenaPlacement} from './hmena-curriculum.js';
import {listProgressReports} from './progress-reports.js';
import {normalizeLocale,localizedLearningPriorities,localizeSkillRows} from './curriculum-localization.js';
import {studentRatingProgress} from './rating-tracking.js';
import {studentTrainingIntelligence} from './training-intelligence.js';
import {latestApprovedPlan} from './next-lesson-engine.js';
import {studentOpeningProfile} from './opening-trainer.js';
import {cisBotCatalog} from './cis-bot-arena.js';
import {familyJourney} from './family-journey.js';
import {syncPracticeMissions} from './practice-plan.js';
import {studentPracticeBank} from './practice-bank.js';

export function studentPortalDashboard(db,accountId,{now=new Date()}={}){
  const account=db.prepare("SELECT id,login_name AS loginName,display_name AS displayName,role,preferred_locale AS preferredLocale FROM portal_accounts WHERE id=? AND status='active'").get(accountId);
  if(!account)return null;
  const students=db.prepare(`SELECT s.id,s.display_name AS displayName,s.status,s.current_level AS currentLevel,s.target_level AS targetLevel,s.preferred_locale AS preferredLocale FROM portal_account_students pas JOIN students s ON s.id=pas.student_id WHERE pas.account_id=? ORDER BY s.display_name`).all(accountId);
  const upcomingStmt=db.prepare(`SELECT cs.id,cs.starts_at AS startsAt,cs.duration_minutes AS durationMinutes,cs.week_no AS weekNo,cs.title,p.name AS programName,sc.name AS schoolName,COALESCE(cs.instruction_locale,p.instruction_locale,'en') AS instructionLocale FROM enrollments e JOIN class_sessions cs ON cs.program_id=e.program_id JOIN programs p ON p.id=e.program_id LEFT JOIN schools sc ON sc.id=p.school_id WHERE e.student_id=? AND e.status='active' AND cs.status='scheduled' AND cs.starts_at>=? ORDER BY cs.starts_at LIMIT 8`);
  const assignmentStmt=db.prepare(`SELECT id,title,details,due_at AS dueAt,status FROM assignments WHERE student_id=? AND status IN ('assigned','submitted') ORDER BY COALESCE(due_at,'9999') LIMIT 20`);
  const attendanceStmt=db.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present,ROUND(AVG(comprehension_score),2) AS avgComprehension FROM attendance WHERE student_id=?`);
  const noteStmt=db.prepare(`SELECT note,created_at AS createdAt FROM coach_notes WHERE student_id=? AND visibility='guardian_visible' ORDER BY created_at DESC LIMIT 10`);
  const skillStmt=db.prepare(`SELECT cs.code,cs.title,ss.status,ss.confidence,ss.last_assessed_at AS lastAssessedAt FROM student_skills ss JOIN curriculum_skills cs ON cs.id=ss.skill_id JOIN curriculum_tracks ct ON ct.id=cs.track_id WHERE ss.student_id=? AND ct.framework_id='FRAMEWORK-HMENA-2500' ORDER BY cs.sequence_no`);
  const at=now.toISOString();const locale=normalizeLocale(account.preferredLocale||'en');
  return {account:{...account,preferredLocale:locale},locale,students:students.map(student=>{const learning=localizedLearningPriorities(db,student.id,{locale,limit:5});const placement=learning.placement||getHmenaPlacement(db,student.id);const skills=localizeSkillRows(db,skillStmt.all(student.id),locale);const training=studentTrainingIntelligence(db,student.id,{locale});const practiceMissions=syncPracticeMissions(db,student.id,{locale,training});const assignments=assignmentStmt.all(student.id).filter(row=>{try{return JSON.parse(row.details||'{}').kind!=='external_practice';}catch{return true;}});return ({
    ...student,
    placement,
    priorities:learning.priorities,
    ratings:studentRatingProgress(db,student.id),
    training,
    nextPlan:(()=>{const plan=latestApprovedPlan(db,student.id,{locale});return plan?{id:plan.id,decision:plan.decision,lesson:plan.lesson,skill:plan.skill,createdAt:plan.createdAt}:null;})(),
    openingTrainer:studentOpeningProfile(db,student.id,{locale}),
    botArena:cisBotCatalog(db,student.id,{locale}),
    journey:familyJourney(db,student.id,{locale}),
    upcoming:upcomingStmt.all(student.id,at),
    assignments,
    practiceMissions,
    practiceBank:studentPracticeBank(db,student.id,{limit:3}),
    attendance:attendanceStmt.get(student.id),
    skills,
    sharedCoachNotes:account.role==='guardian'?noteStmt.all(student.id):[],
    progressReports:listProgressReports(db,student.id,{locale,publishedOnly:true,limit:6})
  })})};
}
