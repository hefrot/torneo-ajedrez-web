import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent,createProgram,enrollStudent,setProgramInstructionLocale} from '../src/academic.js';
import {seedHmenaFramework,placeStudentInHmena,setHmenaSkillStatus} from '../src/hmena-curriculum.js';
import {seedCurriculumLocalizations,localizedHmenaOverview,localizedLearningPriorities} from '../src/curriculum-localization.js';
import {createPortalAccount,setPortalPreferredLocale} from '../src/student-portal-access.js';
import {studentPortalDashboard} from '../src/student-portal.js';

test('HMENA curriculum resolves the same canonical skills in English and Spanish',()=>{
  const db=openDatabase(':memory:');seedHmenaFramework(db);seedCurriculumLocalizations(db);
  const en=localizedHmenaOverview(db,'en'),es=localizedHmenaOverview(db,'es');
  assert.equal(en.bands[0].code,es.bands[0].code);
  assert.equal(en.bands[0].title,'Foundations');assert.equal(es.bands[0].title,'Fundamentos');
  const student=createStudent(db,{displayName:'Bilingual Student'});placeStudentInHmena(db,{studentId:student.id,bandCode:'hmena-0-400'});
  setHmenaSkillStatus(db,{studentId:student.id,skillCode:'FND-BOARD',status:'introduced'});
  const pEn=localizedLearningPriorities(db,student.id,{locale:'en',limit:1});const pEs=localizedLearningPriorities(db,student.id,{locale:'es',limit:1});
  assert.equal(pEn.priorities[0].code,pEs.priorities[0].code);assert.equal(pEn.priorities[0].title,'Board Coordinates & Setup');assert.equal(pEs.priorities[0].title,'Coordenadas y colocación del tablero');
  assert.match(pEn.priorities[0].reason,/mastery/i);assert.match(pEs.priorities[0].reason,/dominio/i);db.close();
});
test('portal language and class instruction language remain independent',()=>{
  const db=openDatabase(':memory:');seedHmenaFramework(db);seedCurriculumLocalizations(db);
  const student=createStudent(db,{displayName:'Online Student'});placeStudentInHmena(db,{studentId:student.id,bandCode:'hmena-0-400'});
  const program=createProgram(db,{name:'Online Chess',programType:'private',instructionLocale:'es'});enrollStudent(db,{programId:program.id,studentId:student.id});
  db.prepare("INSERT INTO class_sessions(id,program_id,starts_at) VALUES ('I18N-S1',?,'2099-01-10T17:00:00-08:00')").run(program.id);
  const access=createPortalAccount(db,{studentIds:[student.id],role:'guardian',displayName:'Family',preferredLocale:'es'});
  const es=studentPortalDashboard(db,access.accountId,{now:new Date('2099-01-01T12:00:00Z')});
  assert.equal(es.locale,'es');assert.equal(es.students[0].placement.bandTitle,'Fundamentos');assert.equal(es.students[0].upcoming[0].instructionLocale,'es');
  setPortalPreferredLocale(db,access.accountId,'en');setProgramInstructionLocale(db,program.id,'bilingual');
  const en=studentPortalDashboard(db,access.accountId,{now:new Date('2099-01-01T12:00:00Z')});
  assert.equal(en.locale,'en');assert.equal(en.students[0].placement.bandTitle,'Foundations');assert.equal(en.students[0].upcoming[0].instructionLocale,'bilingual');db.close();
});

test('new programs default to English instruction',()=>{
  const db=openDatabase(':memory:');const p=createProgram(db,{name:'School Chess',programType:'school'});assert.equal(p.instructionLocale,'en');db.close();
});