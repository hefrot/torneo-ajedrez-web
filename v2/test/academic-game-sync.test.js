import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {createStudent} from '../src/academic.js';
import {seedHmenaCourse0800} from '../src/hmena-course.js';
import {normalizeLichessAcademicGame,normalizeChessComAcademicGame,syncAcademicGameMetadata,analyzePendingAcademicGames} from '../src/academic-game-sync.js';

const account={studentId:'S1',accountId:'A1',username:'KidChess'};

test('provider games normalize to one academic game shape',()=>{
  const l=normalizeLichessAcademicGame({id:'abc12345',rated:true,speed:'rapid',createdAt:1000,lastMoveAt:2000,winner:'white',moves:'e2e4 e7e5',players:{white:{userId:'KidChess'},black:{userId:'Other'}},opening:{eco:'C20',name:'King Pawn'}},{...account,platform:'lichess'});
  assert.equal(l.studentColor,'white');assert.equal(l.studentResult,'win');assert.equal(l.openingEco,'C20');assert.equal(l.movesUci,'e2e4 e7e5');
  const c=normalizeChessComAcademicGame({uuid:'u1',rated:true,time_class:'rapid',end_time:2,pgn:'[Result "0-1"]',white:{username:'Other',result:'resigned'},black:{username:'KidChess',result:'win'}},{...account,platform:'chesscom'});
  assert.equal(c.studentColor,'black');assert.equal(c.studentResult,'win');assert.equal(c.pgn,'[Result "0-1"]');
});

test('sync plus analysis is idempotent and creates pedagogical evidence',async()=>{
  const db=openDatabase(':memory:');seedHmenaCourse0800(db);
  db.prepare("INSERT INTO players(id,name,platform,username,registration_status) VALUES ('P1','Kid','lichess','KidChess','academic_only')").run();
  const student=createStudent(db,{displayName:'Kid',playerId:'P1'});
  db.prepare("INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES ('A1','P1','lichess','KidChess','kidchess','verified','test','1','test','2026-01-01','x')").run();
  const lichessClient={getGames:async()=>[{id:'abc12345',rated:true,speed:'rapid',createdAt:1000,lastMoveAt:2000,winner:'white',moves:'e2e4 e7e5',players:{white:{userId:'KidChess'},black:{userId:'Other'}},opening:{eco:'C20',name:'King Pawn'}}]};
  const first=await syncAcademicGameMetadata(db,{lichessClient,maxPerAccount:10});assert.equal(first.created,1);
  const analyzer=async()=>({analysisVersion:'test-v1',openingEco:'C20',openingName:'King Pawn',movesAnalyzed:2,avgCpLoss:210,criticalCount:1,critical:[{ply:3,moveNumber:2,fenBefore:'8/8/8/8/8/8/8/K6k w - - 0 1',movePlayedUci:'a1a2',movePlayedSan:'Ka2',bestMoveUci:'a1b1',bestMoveSan:'Kb1',cpLoss:300,severity:3,findingType:'missed_pin',suggestedSkillCode:'DEV-PIN',classifierConfidence:.9}]});
  const analyzed=await analyzePendingAcademicGames(db,{analyzeGame:analyzer});assert.equal(analyzed.analyzed,1);assert.equal(analyzed.findings,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_game_reviews').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_game_findings').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM training_puzzles').get().n,1);
  const finding=db.prepare('SELECT cs.code FROM student_game_findings f JOIN curriculum_skills cs ON cs.id=f.skill_id WHERE f.student_id=?').get(student.id);assert.equal(finding.code,'DEV-PIN');
  await syncAcademicGameMetadata(db,{lichessClient,maxPerAccount:10});await analyzePendingAcademicGames(db,{analyzeGame:analyzer});
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM academic_external_games').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_game_reviews').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM training_puzzles').get().n,1);db.close();
});

test('ambiguous automatic engine positions remain findings but do not become puzzles',async()=>{
  const db=openDatabase(':memory:');seedHmenaCourse0800(db);
  db.prepare("INSERT INTO players(id,name,platform,username,registration_status) VALUES ('P2','Kid2','lichess','Kid2','academic_only')").run();
  const student=createStudent(db,{displayName:'Kid2',playerId:'P2'});
  db.prepare("INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES ('A2','P2','lichess','Kid2','kid2','verified','test','2','test','2026-01-01','x')").run();
  db.prepare("INSERT INTO academic_external_games(id,student_id,account_id,platform,external_game_id,played_at,student_color,student_result,time_class,pgn,analysis_status) VALUES ('AG2',?,'A2','lichess','g2','2026-09-15T18:00:00Z','white','loss','rapid','[Result \"*\"]\n\n*','pending')").run(student.id);
  const analyzer=async()=>({analysisVersion:'academic-stockfish-v2',movesAnalyzed:1,avgCpLoss:300,criticalCount:1,critical:[{ply:1,moveNumber:1,fenBefore:'8/8/8/8/8/8/8/K6k w - - 0 1',movePlayedUci:'a1a2',bestMoveUci:'a1b1',cpLoss:300,severity:3,findingType:'missed_pin',suggestedSkillCode:'DEV-PIN',classifierConfidence:.9,solutionMarginCp:120}]});
  await analyzePendingAcademicGames(db,{analyzeGame:analyzer});assert.equal(db.prepare('SELECT COUNT(*) AS n FROM student_game_findings').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM training_puzzles').get().n,0);db.close();
});

test('severe Rapid finding can regress mastered skill while Bullet cannot',async()=>{
  const db=openDatabase(':memory:');seedHmenaCourse0800(db);
  db.prepare("INSERT INTO players(id,name,platform,username,registration_status) VALUES ('P3','Kid3','lichess','Kid3','academic_only')").run();const student=createStudent(db,{displayName:'Kid3',playerId:'P3'});
  db.prepare("INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES ('A3','P3','lichess','Kid3','kid3','verified','test','3','test','2026-01-01','x')").run();
  const skill=db.prepare("SELECT id FROM curriculum_skills WHERE code='DEV-PIN'").get();db.prepare("INSERT INTO student_skills(student_id,skill_id,status,confidence,evidence_json) VALUES (?,?,'drill_mastered',90,'{}')").run(student.id,skill.id);
  const analyzer=async()=>({analysisVersion:'academic-stockfish-v2',movesAnalyzed:1,avgCpLoss:400,criticalCount:1,critical:[{ply:1,moveNumber:1,fenBefore:'8/8/8/8/8/8/8/K6k w - - 0 1',movePlayedUci:'a1a2',bestMoveUci:'a1b1',cpLoss:400,severity:4,findingType:'missed_pin',suggestedSkillCode:'DEV-PIN',classifierConfidence:.9,solutionMarginCp:300}]});
  db.prepare("INSERT INTO academic_external_games(id,student_id,account_id,platform,external_game_id,played_at,student_color,student_result,time_class,pgn,analysis_status) VALUES ('AG3B',?,'A3','lichess','gb','2026-09-15T17:00:00Z','white','loss','bullet','[Result \"*\"]\n\n*','pending')").run(student.id);await analyzePendingAcademicGames(db,{analyzeGame:analyzer});assert.equal(db.prepare('SELECT status FROM student_skills WHERE student_id=? AND skill_id=?').get(student.id,skill.id).status,'drill_mastered');
  db.prepare("INSERT INTO academic_external_games(id,student_id,account_id,platform,external_game_id,played_at,student_color,student_result,time_class,pgn,analysis_status) VALUES ('AG3R',?,'A3','lichess','gr','2026-09-15T18:00:00Z','white','loss','rapid','[Result \"*\"]\n\n*','pending')").run(student.id);await analyzePendingAcademicGames(db,{analyzeGame:analyzer});assert.equal(db.prepare('SELECT status FROM student_skills WHERE student_id=? AND skill_id=?').get(student.id,skill.id).status,'regressed');db.close();
});

test('student-scoped sync only touches the selected student',async()=>{
  const db=openDatabase(':memory:');seedHmenaCourse0800(db);
  const ids=[];
  for(const [p,a,u] of [['PX1','AX1','KidOne'],['PX2','AX2','KidTwo']]){
    db.prepare("INSERT INTO players(id,name,platform,username,registration_status) VALUES (?,?, 'lichess',?,'academic_only')").run(p,u,u);
    const student=createStudent(db,{displayName:u,playerId:p});ids.push(student.id);
    db.prepare("INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES (?,?, 'lichess',?,?, 'verified','test',?,'test','2026-01-01','x')").run(a,p,u,u.toLowerCase(),a);
  }
  const lichessClient={getGames:async username=>[{id:`g-${username}`,rated:true,speed:'rapid',createdAt:1000,lastMoveAt:2000,winner:'white',moves:'e2e4 e7e5',players:{white:{userId:username},black:{userId:'Other'}}}]};
  const result=await syncAcademicGameMetadata(db,{lichessClient,studentId:ids[0]});
  assert.equal(result.accounts,1);assert.equal(result.created,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM academic_external_games WHERE student_id=?').get(ids[0]).n,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM academic_external_games WHERE student_id=?').get(ids[1]).n,0);
  db.close();
});

test('reanalysis keeps one representative skill finding per game and type',async()=>{
  const db=openDatabase(':memory:');seedHmenaCourse0800(db);
  db.prepare("INSERT INTO players(id,name,platform,username,registration_status) VALUES ('P4','Kid4','lichess','Kid4','academic_only')").run();
  const student=createStudent(db,{displayName:'Kid4',playerId:'P4'});
  db.prepare("INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES ('A4','P4','lichess','Kid4','kid4','verified','test','4','test','2026-01-01','x')").run();
  db.prepare("INSERT INTO academic_external_games(id,student_id,account_id,platform,external_game_id,played_at,student_color,student_result,time_class,pgn,analysis_status) VALUES ('AG4',?,'A4','lichess','g4','2026-09-15T18:00:00Z','white','loss','rapid','[Result \"*\"]\n\n*','pending')").run(student.id);
  const analyzer=async()=>({analysisVersion:'academic-stockfish-v3',movesAnalyzed:2,avgCpLoss:500,criticalCount:2,critical:[{ply:3,moveNumber:2,fenBefore:'8/8/8/8/8/8/8/K6k w - - 0 1',movePlayedUci:'a1a2',bestMoveUci:'a1b1',cpLoss:300,severity:3,findingType:'missed_capture',suggestedSkillCode:'DEV-HANGING',classifierConfidence:.9,solutionMarginCp:300},{ply:5,moveNumber:3,fenBefore:'8/8/8/8/8/8/8/K6k w - - 0 1',movePlayedUci:'a1a2',bestMoveUci:'a1b1',cpLoss:700,severity:5,findingType:'missed_capture',suggestedSkillCode:'DEV-HANGING',classifierConfidence:.9,solutionMarginCp:700}]});
  await analyzePendingAcademicGames(db,{analyzeGame:analyzer,studentId:student.id});
  const rows=db.prepare("SELECT engine_cp_loss AS cpLoss FROM student_game_findings WHERE student_id=? AND finding_type='missed_capture'").all(student.id);
  assert.equal(rows.length,1);assert.equal(rows[0].cpLoss,700);db.close();
});
