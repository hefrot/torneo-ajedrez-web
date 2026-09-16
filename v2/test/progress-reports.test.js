import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent,createProgram,enrollStudent,saveSessionAttendance,addCoachNote} from '../src/academic.js';
import {seedHmenaFramework,placeStudentInHmena,setHmenaSkillStatus} from '../src/hmena-curriculum.js';
import {seedCurriculumLocalizations} from '../src/curriculum-localization.js';
import {createPortalAccount} from '../src/student-portal-access.js';
import {studentPortalDashboard} from '../src/student-portal.js';
import {createProgressReportDraft,publishProgressReport,listProgressReports,progressReportPreview} from '../src/progress-reports.js';

function setup(){const db=openDatabase(':memory:');seedHmenaFramework(db);seedCurriculumLocalizations(db);const student=createStudent(db,{displayName:'Report Student'});placeStudentInHmena(db,{studentId:student.id,bandCode:'hmena-400-800'});const program=createProgram(db,{name:'Private Chess',programType:'private'});enrollStudent(db,{programId:program.id,studentId:student.id});const now=new Date(),when=new Date(now.getTime()-86400000).toISOString();db.prepare("INSERT INTO class_sessions(id,program_id,starts_at,status) VALUES ('RPT-S1',?,?,'completed')").run(program.id,when);saveSessionAttendance(db,'RPT-S1',[{studentId:student.id,status:'present',comprehensionScore:4,engagementFlag:'focused'}]);setHmenaSkillStatus(db,{studentId:student.id,skillCode:'DEV-PIN',status:'drill_mastered',confidence:90});addCoachNote(db,student.id,{visibility:'coach_only',note:'Private billing note'});addCoachNote(db,student.id,{visibility:'guardian_visible',note:'Great focus this month'});return {db,student};}
test('draft report is private until coach publishes it',()=>{
  const {db,student}=setup();const draft=createProgressReportDraft(db,student.id,{days:30});
  assert.equal(listProgressReports(db,student.id,{publishedOnly:true}).length,0);
  publishProgressReport(db,draft.id);
  const published=listProgressReports(db,student.id,{locale:'es',publishedOnly:true});assert.equal(published.length,1);assert.equal(published[0].status,'published');
  assert.equal(published[0].report.guardianNotes.length,1);assert.equal(published[0].report.guardianNotes[0].note,'Great focus this month');
  assert.ok(published[0].report.skills.mastered.some(x=>x.code==='DEV-PIN'&&x.title==='Clavadas'));db.close();
});

test('family portal receives only published progress reports',()=>{
  const {db,student}=setup();const portal=createPortalAccount(db,{studentIds:[student.id],displayName:'Family',preferredLocale:'en'});
  const draft=createProgressReportDraft(db,student.id,{days:30});let dashboard=studentPortalDashboard(db,portal.accountId);assert.equal(dashboard.students[0].progressReports.length,0);
  publishProgressReport(db,draft.id);dashboard=studentPortalDashboard(db,portal.accountId);assert.equal(dashboard.students[0].progressReports.length,1);assert.match(dashboard.students[0].progressReports[0].report.headline,/classes attended/);db.close();
});

test('report preview localizes the same canonical evidence',()=>{
  const {db,student}=setup();const en=progressReportPreview(db,student.id,{locale:'en'}),es=progressReportPreview(db,student.id,{locale:'es'});
  assert.equal(en.skills.mastered[0].code,es.skills.mastered[0].code);assert.notEqual(en.skills.mastered[0].title,es.skills.mastered[0].title);db.close();
});
