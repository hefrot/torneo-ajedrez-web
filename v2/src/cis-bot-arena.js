import {randomUUID} from 'node:crypto';
import {getHmenaPlacement} from './hmena-curriculum.js';

export const CIS_BOT_VERSION='cis-bot-ladder-v1';
const profiles=[
  ['pawn-scout','Pawn Scout','Explorador Peón',200,{candidates:8,randomRate:.42,errorRate:.35,secondBestRate:.18,thinkSeconds:.02,maxAvgCpLoss:460},['FND-BOARD','FND-PIECES','FND-PAWNS','FND-LEGAL']],
  ['knight-rookie','Knight Rookie','Novato Caballo',400,{candidates:7,randomRate:.30,errorRate:.30,secondBestRate:.18,thinkSeconds:.025,maxAvgCpLoss:400},['FND-CHECK','FND-CBR','FND-MATE1','FND-THINK']],
  ['bishop-builder','Bishop Builder','Constructor Alfil',600,{candidates:6,randomRate:.18,errorRate:.27,secondBestRate:.20,thinkSeconds:.03,maxAvgCpLoss:350},['DEV-HANGING','DEV-MATERIAL','DEV-THREATS','DEV-FORK']],
  ['rook-challenger','Rook Challenger','Retador Torre',800,{candidates:5,randomRate:.10,errorRate:.22,secondBestRate:.20,thinkSeconds:.04,maxAvgCpLoss:310},['DEV-PIN','DEV-SKEWER','DEV-DISCOVERED','DEV-CCT','DEV-KP-END']],
  ['queen-tactician','Queen Tactician','Táctico Dama',1000,{candidates:4,randomRate:.04,errorRate:.16,secondBestRate:.18,thinkSeconds:.05,maxAvgCpLoss:270},['CMP-CANDIDATES','CMP-CALC2','CMP-REMOVE','CMP-MATE2']],
  ['king-strategist','King Strategist','Estratega Rey',1200,{candidates:3,randomRate:.01,errorRate:.10,secondBestRate:.15,thinkSeconds:.06,maxAvgCpLoss:235},['CMP-PAWNSTRUCT','CMP-WEAKSQUARE','CMP-ROOKACTIVE','CMP-OPPOSITION','CMP-REVIEW']]
].map(([code,nameEn,nameEs,targetLevel,config,skills],i)=>({id:`CISBOT-${code.toUpperCase()}`,code,nameEn,nameEs,targetLevel,sequence:i+1,config:{code,...config},skills}));

export function seedCisBots(db){
  const upsert=db.prepare(`INSERT INTO cis_bot_profiles(id,code,name_en,name_es,target_level,sequence_no,config_json,skill_focus_json,active) VALUES (?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET name_en=excluded.name_en,name_es=excluded.name_es,target_level=excluded.target_level,sequence_no=excluded.sequence_no,config_json=excluded.config_json,skill_focus_json=excluded.skill_focus_json,active=1`);
  db.transaction(()=>{for(const p of profiles)upsert.run(p.id,p.code,p.nameEn,p.nameEs,p.targetLevel,p.sequence,JSON.stringify(p.config),JSON.stringify(p.skills));})();
  return {bots:profiles.length,min:profiles[0].targetLevel,max:profiles.at(-1).targetLevel};
}
const parse=v=>{try{return JSON.parse(v||'{}');}catch{return {};}};
const parseArray=v=>{try{const x=JSON.parse(v||'[]');return Array.isArray(x)?x:[];}catch{return [];}};
function placementUnlock(db,studentId){
  const p=getHmenaPlacement(db,studentId);if(!p)return 200;
  if(p.bandCode==='hmena-0-400')return 400;
  if(p.bandCode==='hmena-400-800')return 800;
  if(p.bandCode==='hmena-800-1200')return 1200;
  return 1200;
}
function placementRecommendedLevel(db,studentId){
  const p=getHmenaPlacement(db,studentId);if(!p)return 200;
  if(p.bandCode==='hmena-0-400')return 200;
  if(p.bandCode==='hmena-400-800')return 600;
  if(p.bandCode==='hmena-800-1200')return 1000;
  return 1200;
}
function passedCodes(db,studentId){return new Set(db.prepare(`SELECT bp.code FROM cis_bot_challenges c JOIN cis_bot_profiles bp ON bp.id=c.bot_id WHERE c.student_id=? AND c.status='passed'`).all(studentId).map(r=>r.code));}
export function cisBotCatalog(db,studentId,{locale='en'}={}){
  seedCisBots(db);const unlock=placementUnlock(db,studentId),passed=passedCodes(db,studentId);
  const rows=db.prepare(`SELECT id,code,name_en AS nameEn,name_es AS nameEs,target_level AS targetLevel,sequence_no AS sequence,skill_focus_json AS skillsJson FROM cis_bot_profiles WHERE active=1 ORDER BY sequence_no`).all();
  let maxPassed=0;for(const r of rows)if(passed.has(r.code))maxPassed=Math.max(maxPassed,r.targetLevel);
  const cap=Math.max(unlock,maxPassed?maxPassed+200:0),nameKey=locale==='es'?'nameEs':'nameEn';
  const recommendedTarget=maxPassed?Math.min(cap,maxPassed+200):Math.min(cap,placementRecommendedLevel(db,studentId));
  const recommended=rows.filter(r=>r.targetLevel<=recommendedTarget&&!passed.has(r.code)).at(-1)?.code||rows.filter(r=>r.targetLevel<=cap&&!passed.has(r.code))[0]?.code||rows.find(r=>!passed.has(r.code))?.code||rows.at(-1)?.code;
  const history=db.prepare(`SELECT bp.code,c.status,c.points,c.summary_json AS summaryJson,c.started_at AS startedAt,c.completed_at AS completedAt FROM cis_bot_challenges c JOIN cis_bot_profiles bp ON bp.id=c.bot_id WHERE c.student_id=? ORDER BY c.started_at DESC`).all(studentId);
  const latest=new Map();for(const h of history)if(!latest.has(h.code))latest.set(h.code,{status:h.status,points:h.points,summary:parse(h.summaryJson),startedAt:h.startedAt,completedAt:h.completedAt});
  return {version:CIS_BOT_VERSION,studentId,recommendedCode:recommended,bots:rows.map(r=>({code:r.code,name:r[nameKey],targetLevel:r.targetLevel,skills:parseArray(r.skillsJson),passed:passed.has(r.code),unlocked:r.targetLevel<=cap,recommended:r.code===recommended,lastChallenge:latest.get(r.code)||null}))};
}
export function startCisBotChallenge(db,{studentId,botCode}={}){
  seedCisBots(db);if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))throw new TypeError('student not found');
  const catalog=cisBotCatalog(db,studentId),entry=catalog.bots.find(b=>b.code===botCode);if(!entry)throw new TypeError('bot not found');if(!entry.unlocked)throw new TypeError('bot is locked');
  const existing=db.prepare(`SELECT c.id,c.status FROM cis_bot_challenges c JOIN cis_bot_profiles bp ON bp.id=c.bot_id WHERE c.student_id=? AND bp.code=? AND c.status='in_progress' ORDER BY c.started_at DESC LIMIT 1`).get(studentId,botCode);
  if(existing)return {...existing,reused:true};
  const bot=db.prepare('SELECT id FROM cis_bot_profiles WHERE code=?').get(botCode),id=`BOTCH-${randomUUID()}`;
  db.prepare(`INSERT INTO cis_bot_challenges(id,student_id,bot_id,status,games_required,points,summary_json) VALUES (?,?,?,'in_progress',3,0,'{}')`).run(id,studentId,bot.id);
  return {id,status:'in_progress',botCode,reused:false};
}
function challengeRow(db,challengeId,studentId){return db.prepare(`SELECT c.id,c.student_id AS studentId,c.status,c.games_required AS gamesRequired,c.points,c.summary_json AS summaryJson,b.id AS botId,b.code AS botCode,b.name_en AS nameEn,b.name_es AS nameEs,b.target_level AS targetLevel,b.config_json AS configJson,b.skill_focus_json AS skillsJson FROM cis_bot_challenges c JOIN cis_bot_profiles b ON b.id=c.bot_id WHERE c.id=? AND c.student_id=?`).get(challengeId,studentId);}
function publicGame(row){return {id:row.id,gameNo:row.game_no,studentColor:row.student_color,status:row.status,fen:row.fen,result:row.result||null,analysis:parse(row.analysis_json)};}
function studentPoints(result,color){if(result==='1/2-1/2')return .5;if(result==='1-0')return color==='white'?1:0;if(result==='0-1')return color==='black'?1:0;return 0;}
export async function startCisBotGame(db,{studentId,challengeId,botMove}={}){
  const challenge=challengeRow(db,challengeId,studentId);if(!challenge)throw new TypeError('challenge not found');if(challenge.status!=='in_progress')throw new TypeError('challenge is complete');
  const current=db.prepare(`SELECT * FROM cis_bot_games WHERE challenge_id=? AND status='in_progress' ORDER BY game_no DESC LIMIT 1`).get(challengeId);if(current)return {...publicGame(current),reused:true};
  const completed=db.prepare(`SELECT COUNT(*) AS n FROM cis_bot_games WHERE challenge_id=? AND status='completed'`).get(challengeId).n;if(completed>=challenge.gamesRequired)throw new TypeError('challenge already has required games');
  const gameNo=completed+1,studentColor=gameNo%2===1?'white':'black',id=`BOTGAME-${randomUUID()}`;let fen='startpos',moves=[];
  fen='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  if(studentColor==='black'){
    const opening=await botMove({fen,bot:parse(challenge.configJson)});if(opening.botMove)moves.push(opening.botMove);fen=opening.fen;
  }
  db.prepare(`INSERT INTO cis_bot_games(id,challenge_id,game_no,student_color,status,fen,moves_uci) VALUES (?,?,?,?,'in_progress',?,?)`).run(id,challengeId,gameNo,studentColor,fen,moves.join(' '));
  return {id,gameNo,studentColor,status:'in_progress',fen,result:null,reused:false};
}
function summarizeChallenge(db,challenge){
  const games=db.prepare(`SELECT * FROM cis_bot_games WHERE challenge_id=? AND status='completed' ORDER BY game_no`).all(challenge.id);
  const points=games.reduce((n,g)=>n+studentPoints(g.result,g.student_color),0);
  const analyses=games.map(g=>parse(g.analysis_json)).filter(x=>Number.isFinite(Number(x.avgCpLoss)));
  const avgCpLoss=analyses.length?Number((analyses.reduce((n,x)=>n+Number(x.avgCpLoss||0),0)/analyses.length).toFixed(1)):null;
  const critical=analyses.reduce((n,x)=>n+Number(x.criticalCount||0),0);
  const weaknesses=new Map();for(const a of analyses)for(const f of a.critical||[]){if(!f.suggestedSkillCode)continue;weaknesses.set(f.suggestedSkillCode,(weaknesses.get(f.suggestedSkillCode)||0)+1);}
  const config=parse(challenge.configJson),qualityPass=avgCpLoss==null||avgCpLoss<=Number(config.maxAvgCpLoss||9999),passed=games.length>=challenge.gamesRequired&&points>=2&&qualityPass;
  return {gamesPlayed:games.length,points,avgCpLoss,criticalCount:critical,qualityPass,passed,targetLevel:challenge.targetLevel,skillsTested:parseArray(challenge.skillsJson),weaknessesObserved:[...weaknesses.entries()].sort((a,b)=>b[1]-a[1]).map(([code,count])=>({code,count})),practicalStrength:passed?challenge.targetLevel:Math.max(0,challenge.targetLevel-200)};
}
function maybeFinalize(db,challenge){
  const summary=summarizeChallenge(db,challenge);if(summary.gamesPlayed<challenge.gamesRequired){db.prepare('UPDATE cis_bot_challenges SET points=?,summary_json=? WHERE id=?').run(summary.points,JSON.stringify(summary),challenge.id);return {status:'in_progress',summary};}
  const status=summary.passed?'passed':'failed';db.prepare(`UPDATE cis_bot_challenges SET status=?,points=?,summary_json=?,completed_at=CURRENT_TIMESTAMP WHERE id=?`).run(status,summary.points,JSON.stringify(summary),challenge.id);return {status,summary};
}
export async function playCisBotMove(db,{studentId,gameId,moveUci,botMove,analyzeGame}={}){
  const game=db.prepare(`SELECT g.*,c.student_id AS studentId,c.id AS challengeId,c.status AS challengeStatus,b.code AS botCode,b.target_level AS targetLevel,b.config_json AS configJson,b.skill_focus_json AS skillsJson FROM cis_bot_games g JOIN cis_bot_challenges c ON c.id=g.challenge_id JOIN cis_bot_profiles b ON b.id=c.bot_id WHERE g.id=? AND c.student_id=?`).get(gameId,studentId);
  if(!game)throw new TypeError('bot game not found');if(game.status!=='in_progress')throw new TypeError('bot game is complete');
  const response=await botMove({fen:game.fen,studentMove:moveUci,bot:parse(game.configJson)});const moves=String(game.moves_uci||'').trim().split(/\s+/).filter(Boolean);moves.push(moveUci);if(response.botMove)moves.push(response.botMove);
  if(!response.gameOver){db.prepare(`UPDATE cis_bot_games SET fen=?,moves_uci=? WHERE id=?`).run(response.fen,moves.join(' '),game.id);return {game:{...publicGame({...game,fen:response.fen,moves_uci:moves.join(' ')}),fen:response.fen},botMove:response.botMove,botMoveSan:response.botMoveSan||null,challenge:null};}
  let analysis={};if(typeof analyzeGame==='function'){try{analysis=await analyzeGame({movesUci:moves.join(' '),studentColor:game.student_color,maxPlies:160,thinkSeconds:.04});}catch{}}
  db.prepare(`UPDATE cis_bot_games SET fen=?,moves_uci=?,status='completed',result=?,analysis_json=?,completed_at=CURRENT_TIMESTAMP WHERE id=?`).run(response.fen,moves.join(' '),response.result,JSON.stringify(analysis||{}),game.id);
  const challenge=challengeRow(db,game.challengeId,studentId),finalized=maybeFinalize(db,challenge);
  return {game:{id:game.id,gameNo:game.game_no,studentColor:game.student_color,status:'completed',fen:response.fen,result:response.result,analysis},botMove:response.botMove,botMoveSan:response.botMoveSan||null,challenge:finalized};
}
