import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {createPortalAccount} from '../src/student-portal-access.js';
import {seedHmenaFramework,placeStudentInHmena,getHmenaPlacement} from '../src/hmena-curriculum.js';
import {seedAdvancedDiagnostics,startAdvancedDiagnostic,advancedDiagnosticState,submitAdvancedDiagnosticAnswer} from '../src/diagnostic-advanced.js';
import {familyJourney} from '../src/family-journey.js';

function setup(){const db=openDatabase(':memory:');seedHmenaFramework(db);seedAdvancedDiagnostics(db);const student=createStudent(db,{displayName:'Advanced Pilot'});const portal=createPortalAccount(db,{studentIds:[student.id],displayName:'Pilot'});placeStudentInHmena(db,{studentId:student.id,bandCode:'hmena-1200-1600',source:'assessment'});return {db,student,portal};}
function finishBand(db,student,portal,{wrong=0}={}){const start=startAdvancedDiagnostic(db,{accountId:portal.accountId,studentId:student.id});let result=null,i=0;while(true){const state=advancedDiagnosticState(db,{accountId:portal.accountId,attemptId:start.attemptId});if(state.status==='completed')break;const item=db.prepare('SELECT correct_answer AS answer FROM diagnostic_items WHERE id=?').get(state.item.id);let answer=item.answer;if(i<wrong)answer=answer==='A'?'B':'A';i++;result=submitAdvancedDiagnosticAnswer(db,{accountId:portal.accountId,attemptId:start.attemptId,itemId:state.item.id,answerKey:answer});if(result.completed)break;}return result;}

test('advanced screen advances one band and never grants mastery',()=>{const {db,student,portal}=setup();let j=familyJourney(db,student.id);assert.equal(j.mission.kind,'assessment');const result=finishBand(db,student,portal);assert.equal(result.summary.score.correct,7);assert.equal(result.placementBandCode,'hmena-1600-2000');assert.equal(getHmenaPlacement(db,student.id).bandCode,'hmena-1600-2000');j=familyJourney(db,student.id);assert.equal(j.mission.kind,'assessment');const skills=db.prepare('SELECT status FROM student_skills WHERE student_id=?').all(student.id);assert.ok(skills.every(x=>!['drill_mastered','applied_in_game'].includes(x.status)));db.close();});

test('advanced screen stops on first band with reinforcement gaps',()=>{const {db,student,portal}=setup();const result=finishBand(db,student,portal,{wrong:3});assert.equal(result.summary.passed,false);assert.equal(result.summary.score.correct,4);assert.equal(result.placementBandCode,'hmena-1200-1600');assert.equal(result.summary.gaps.length,3);const j=familyJourney(db,student.id);assert.equal(j.mission.kind,'practice');db.close();});

test('perfect advanced ladder can clear through high performance without mastery',()=>{const {db,student,portal}=setup();let result=null;for(let i=0;i<4;i++)result=finishBand(db,student,portal);assert.equal(result.summary.cleared2500,true);assert.equal(getHmenaPlacement(db,student.id).bandCode,'hmena-2300-2500');const j=familyJourney(db,student.id);assert.equal(j.steps[0].complete,true);assert.notEqual(j.mission.kind,'assessment');const mastered=db.prepare("SELECT COUNT(*) n FROM student_skills WHERE student_id=? AND status IN ('drill_mastered','applied_in_game')").get(student.id).n;assert.equal(mastered,0);db.close();});
