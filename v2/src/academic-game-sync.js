import {createHash} from 'node:crypto';
import {recordStudentGameReview,createPuzzlesFromFindings} from './training-intelligence.js';

const norm=value=>String(value||'').trim().toLowerCase();
const stableId=value=>createHash('sha256').update(String(value)).digest('hex').slice(0,24);
const isoFromMs=value=>Number.isFinite(Number(value))?new Date(Number(value)).toISOString():null;
const accountRows=(db,{studentId=null}={})=>{
  const sql=`SELECT s.id AS studentId,pa.id AS accountId,pa.player_id AS playerId,pa.platform,pa.username
  FROM students s JOIN player_accounts pa ON pa.player_id=s.player_id
  WHERE s.status='active' AND pa.account_status='verified' AND pa.verified_at IS NOT NULL${studentId?' AND s.id=?':''}
  ORDER BY pa.platform,pa.username`;
  return studentId?db.prepare(sql).all(studentId):db.prepare(sql).all();
};

function lichessName(side={}){
  return norm(side?.userId||side?.user?.id||side?.user?.name||side?.name);
}
function chessComId(game={}){
  const url=String(game.url||'');
  return String(game.uuid||url.match(/\/(\d+)(?:\/?$|\?)/)?.[1]||stableId(url||JSON.stringify(game)));
}
function resultForWinner(studentColor,winner){
  if(!winner)return 'draw';
  return winner===studentColor?'win':'loss';
}

export function normalizeLichessAcademicGame(game,account){
  const username=norm(account.username);
  const white=lichessName(game?.players?.white),black=lichessName(game?.players?.black);
  const studentColor=white===username?'white':black===username?'black':null;
  if(!studentColor||!game?.id)return null;
  const clock=game.clock?`${Number(game.clock.initial||0)/100}+${Number(game.clock.increment||0)/100}`:null;
  return {studentId:account.studentId,accountId:account.accountId,platform:'lichess',externalGameId:String(game.id),
    url:`https://lichess.org/${game.id}`,playedAt:isoFromMs(game.lastMoveAt||game.createdAt),studentColor,
    studentResult:resultForWinner(studentColor,game.winner),rated:game.rated?1:0,timeClass:game.speed||game.perf||null,
    timeControl:clock,openingName:game.opening?.name||null,openingEco:game.opening?.eco||null,pgn:game.pgn||null,
    movesUci:game.moves||null,initialFen:game.initialFen&&game.initialFen!=='startpos'?game.initialFen:null};
}

export function normalizeChessComAcademicGame(game,account){
  const username=norm(account.username),white=norm(game?.white?.username),black=norm(game?.black?.username);
  const studentColor=white===username?'white':black===username?'black':null;
  if(!studentColor)return null;
  const own=studentColor==='white'?game.white:game.black,opp=studentColor==='white'?game.black:game.white;
  const studentResult=own?.result==='win'?'win':opp?.result==='win'?'loss':'draw';
  return {studentId:account.studentId,accountId:account.accountId,platform:'chesscom',externalGameId:chessComId(game),url:game.url||null,
    playedAt:game.end_time?isoFromMs(Number(game.end_time)*1000):null,studentColor,studentResult,rated:game.rated?1:0,
    timeClass:game.time_class||null,timeControl:game.time_control||null,openingName:null,openingEco:null,pgn:game.pgn||null,movesUci:null,initialFen:null};
}

export function saveAcademicExternalGame(db,row){
  if(!row?.externalGameId||!row?.studentId||!row?.accountId)throw new TypeError('invalid academic game');
  const id=`AG-${stableId(`${row.accountId}:${row.externalGameId}`)}`;
  const existing=db.prepare('SELECT id,analysis_status AS analysisStatus FROM academic_external_games WHERE account_id=? AND external_game_id=?').get(row.accountId,row.externalGameId);
  db.prepare(`INSERT INTO academic_external_games(id,student_id,account_id,platform,external_game_id,url,played_at,student_color,student_result,rated,time_class,time_control,opening_name,opening_eco,pgn,moves_uci,initial_fen)
    VALUES (@id,@studentId,@accountId,@platform,@externalGameId,@url,@playedAt,@studentColor,@studentResult,@rated,@timeClass,@timeControl,@openingName,@openingEco,@pgn,@movesUci,@initialFen)
    ON CONFLICT(account_id,external_game_id) DO UPDATE SET url=excluded.url,played_at=COALESCE(excluded.played_at,academic_external_games.played_at),student_color=excluded.student_color,student_result=excluded.student_result,rated=excluded.rated,time_class=excluded.time_class,time_control=excluded.time_control,opening_name=COALESCE(excluded.opening_name,academic_external_games.opening_name),opening_eco=COALESCE(excluded.opening_eco,academic_external_games.opening_eco),pgn=COALESCE(excluded.pgn,academic_external_games.pgn),moves_uci=COALESCE(excluded.moves_uci,academic_external_games.moves_uci),initial_fen=COALESCE(excluded.initial_fen,academic_external_games.initial_fen),updated_at=CURRENT_TIMESTAMP`).run({...row,id});
  return {id,created:!existing,analysisStatus:existing?.analysisStatus||'pending'};
}

const lastPlayedMs=(db,accountId)=>{
  const value=db.prepare('SELECT MAX(played_at) AS lastPlayed FROM academic_external_games WHERE account_id=?').get(accountId)?.lastPlayed;
  const ms=value?Date.parse(value):NaN;return Number.isFinite(ms)?ms:null;
};

export async function syncAcademicGameMetadata(db,{lichessClient,chessComClient,maxPerAccount=30,months=2,studentId=null}={}){
  const accounts=accountRows(db,{studentId});let fetched=0,created=0,updated=0,errors=0;
  for(const account of accounts){
    try{
      let games=[];
      if(account.platform==='lichess'&&lichessClient){
        const last=lastPlayedMs(db,account.accountId);const since=last?Math.max(0,last-86400000):undefined;
        games=await lichessClient.getGames(account.username,{since,max:maxPerAccount,moves:true,opening:true,pgnInJson:true});
        games=games.map(g=>normalizeLichessAcademicGame(g,account)).filter(Boolean);
      }else if(account.platform==='chesscom'&&chessComClient){
        const all=await chessComClient.getRecentGames(account.username,months);
        games=all.map(g=>normalizeChessComAcademicGame(g,account)).filter(Boolean).sort((a,b)=>String(b.playedAt||'').localeCompare(String(a.playedAt||''))).slice(0,maxPerAccount);
      }
      fetched+=games.length;
      for(const game of games){const saved=saveAcademicExternalGame(db,game);if(saved.created)created++;else updated++;}
    }catch{errors++;}
  }
  return {accounts:accounts.length,fetched,created,updated,errors};
}

const skillIdByCode=(db,code)=>code?db.prepare(`SELECT s.id FROM curriculum_skills s JOIN curriculum_tracks t ON t.id=s.track_id WHERE s.code=? AND t.framework_id='FRAMEWORK-HMENA-2500'`).get(code)?.id||null:null;

function persistAnalysis(db,game,analysis){
  const openingName=analysis.openingName||game.opening_name||null,openingEco=analysis.openingEco||game.opening_eco||null;
  db.prepare(`UPDATE academic_external_games SET opening_name=?,opening_eco=?,analysis_status='analyzed',analysis_error=NULL,analysis_version=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(openingName,openingEco,analysis.analysisVersion||'academic-stockfish-v1',game.id);
  recordStudentGameReview(db,{studentId:game.student_id,sourceType:'external',sourceGameId:game.external_game_id,platform:game.platform,playedAt:game.played_at,result:game.student_result,openingName,openingEco,summary:{avgCpLoss:analysis.avgCpLoss,openingAvgCpLoss:analysis.openingAvgCpLoss,openingCriticalCount:analysis.openingCriticalCount,firstCriticalPly:analysis.firstCriticalPly,movesAnalyzed:analysis.movesAnalyzed,criticalCount:analysis.criticalCount,analysisVersion:analysis.analysisVersion}});
  const insertFinding=db.prepare(`INSERT INTO student_game_findings(id,student_id,source_type,source_game_id,skill_id,finding_type,severity,engine_cp_loss,classifier_confidence,solution_margin_cp,classifier_source,ply,move_number,fen_before,move_played,best_move,note)
    VALUES (@id,@studentId,'external',@sourceGameId,@skillId,@findingType,@severity,@cpLoss,@confidence,@solutionMarginCp,@classifierSource,@ply,@moveNumber,@fenBefore,@movePlayed,@bestMove,@note)`);
  const updateFinding=db.prepare(`UPDATE student_game_findings SET skill_id=@skillId,finding_type=@findingType,severity=@severity,engine_cp_loss=@cpLoss,classifier_confidence=@confidence,solution_margin_cp=@solutionMarginCp,classifier_source=@classifierSource,ply=@ply,move_number=@moveNumber,fen_before=@fenBefore,move_played=@movePlayed,best_move=@bestMove,note=@note WHERE id=@existingId`);
  const byId=db.prepare('SELECT id FROM student_game_findings WHERE id=?');
  const byComposite=db.prepare(`SELECT id FROM student_game_findings WHERE student_id=? AND source_type='external' AND source_game_id=? AND skill_id=? AND finding_type=? LIMIT 1`);
  const selected=new Map();
  for(const item of analysis.critical||[]){
    const skillId=Number(item.classifierConfidence)>=0.65?skillIdByCode(db,item.suggestedSkillCode):null;
    const key=skillId?`${skillId}:${item.findingType||'engine_mistake'}`:`generic:${item.ply}:${item.findingType||'engine_mistake'}`;
    const prior=selected.get(key);if(!prior||Number(item.cpLoss||0)>Number(prior.item.cpLoss||0))selected.set(key,{item,skillId});
  }
  let findings=0;
  for(const {item,skillId} of selected.values()){
    const findingType=item.findingType||'engine_mistake';
    const id=`FIND-${stableId(`${game.id}:${item.ply}:${findingType}`)}`;
    const row={id,studentId:game.student_id,sourceGameId:game.external_game_id,skillId,findingType,severity:item.severity||1,cpLoss:item.cpLoss??null,confidence:item.classifierConfidence??null,solutionMarginCp:item.solutionMarginCp??null,classifierSource:analysis.analysisVersion||'academic-stockfish-v1',ply:item.ply??null,moveNumber:item.moveNumber??null,fenBefore:item.fenBefore||null,movePlayed:item.movePlayedUci||null,bestMove:item.bestMoveUci||null,note:item.movePlayedSan&&item.bestMoveSan?`${item.movePlayedSan} → ${item.bestMoveSan}`:null};
    const existing=byId.get(id)||(skillId?byComposite.get(game.student_id,game.external_game_id,skillId,findingType):null);
    if(existing)updateFinding.run({...row,existingId:existing.id});else insertFinding.run(row);
    if(skillId&&Number(item.cpLoss||0)>250&&['rapid','classical'].includes(String(game.time_class||'').toLowerCase())){const state=db.prepare('SELECT status,evidence_json AS evidenceJson FROM student_skills WHERE student_id=? AND skill_id=?').get(game.student_id,skillId);if(['drill_mastered','applied_in_game'].includes(state?.status)){let evidence={};try{evidence=JSON.parse(state.evidenceJson||'{}');}catch{};evidence={...evidence,regression:{gameId:game.external_game_id,cpLoss:item.cpLoss,timeClass:game.time_class,at:game.played_at||new Date().toISOString()}};db.prepare("UPDATE student_skills SET status='regressed',confidence=40,evidence_json=?,last_assessed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE student_id=? AND skill_id=?").run(JSON.stringify(evidence),game.student_id,skillId);}}
    findings++;
  }
  createPuzzlesFromFindings(db,game.student_id);
  return findings;
}

export async function analyzePendingAcademicGames(db,{analyzeGame,limit=12,studentId=null}={}){
  if(typeof analyzeGame!=='function')throw new TypeError('analyzeGame is required');
  const cap=Math.max(1,Math.min(100,Number(limit)||12));
  const sql=`SELECT * FROM academic_external_games WHERE analysis_status='pending' AND student_color IS NOT NULL AND (pgn IS NOT NULL OR moves_uci IS NOT NULL)${studentId?' AND student_id=?':''} ORDER BY COALESCE(played_at,created_at) DESC LIMIT ?`;
  const games=studentId?db.prepare(sql).all(studentId,cap):db.prepare(sql).all(cap);
  let analyzed=0,findings=0,failed=0;
  for(const game of games){
    try{
      const analysis=await analyzeGame({pgn:game.pgn,movesUci:game.moves_uci,initialFen:game.initial_fen,studentColor:game.student_color,openingName:game.opening_name,openingEco:game.opening_eco});
      findings+=db.transaction(()=>persistAnalysis(db,game,analysis))();analyzed++;
    }catch(error){
      db.prepare("UPDATE academic_external_games SET analysis_status='failed',analysis_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(String(error?.message||error).slice(0,500),game.id);failed++;
    }
  }
  return {queued:games.length,analyzed,findings,failed};
}

export async function syncAndAnalyzeAcademicGames(db,options={}){
  const sync=await syncAcademicGameMetadata(db,options);
  const analysis=await analyzePendingAcademicGames(db,{analyzeGame:options.analyzeGame,limit:options.analysisLimit||12,studentId:options.studentId||null});
  return {sync,analysis};
}
