import express from 'express';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {openDatabase,listPlayers,loadGames,loadSeries,importStatus} from './db.js';
import {generateSeries,generateGameSlots,computeStandings,eligibleOpponents,seasonPlan,activityStatus} from './league-engine.js';
import {sendGroupMessage} from './services/whatsapp.js';
import {communityMetrics,h2hMetrics,xpLeaderboard,communityHighlights} from './community-metrics.js';
import {submitVerifiedRegistration,linkVerifiedAccount,RegistrationConflictError} from './registration.js';
import {verifyPlatformAccount,AccountNotFoundError,AccountVerificationUnavailableError} from './account-verification.js';
import {listPublicPlayers,publicPlayerIds,isPublicPlayer} from './public-visibility.js';
import {buildSeasonReadiness,seasonPairKey} from './season-readiness.js';
import {getSeasonControl,registrationIsOpen,openRegistration,closeRegistration,markSeasonStarted} from './season-control.js';
import {issuePlayerToken,authenticatePlayerToken,revokePlayerTokens,regeneratePlayerToken,createRateLimiter} from './player-access.js';
import {recordProfileVerification,setOwnershipVerification} from './account-verification-state.js';
import {listLeagueRules,updateLeagueRule,leagueRuleMap} from './league-config.js';
import {buildReadinessDashboard} from './readiness-dashboard.js';
import {playerPrivateDashboard} from './player-dashboard.js';
import {reportOfficialGame,recordChallenge,validateReportedGame,disputeSubmission,DuplicateOfficialGameError} from './official-game-service.js';
import {GameValidationError} from './game-validation.js';
import {LichessClient} from './providers/lichess.js';
import {ChessComClient} from './providers/chesscom.js';
import {createStudent,listStudents,createSchool,listSchools,createProgram,listPrograms,enrollStudent} from './academic.js';

const app=express();
const db=openDatabase();
const here=dirname(fileURLToPath(import.meta.url));
const webRoot=join(here,'..','web');
app.use(express.json({limit:'64kb'}));
app.use(express.static(webRoot));
const playerLimiter=createRateLimiter({limit:30,windowMs:60000});
const adminLimiter=createRateLimiter({limit:60,windowMs:60000});

const cleanPlatform=value=>({lichess:'lichess','chess.com':'chesscom',chesscom:'chesscom'}[String(value||'').toLowerCase()]);
const adminOnly=(req,res,next)=>{
  if(!process.env.ADMIN_API_KEY||req.get('x-admin-key')!==process.env.ADMIN_API_KEY)return res.status(401).json({error:'admin key required'});
  const gate=adminLimiter.consume(req.ip||'admin');if(!gate.allowed){res.set('Retry-After',String(gate.retryAfterSeconds));return res.status(429).json({error:'rate limit exceeded'});}
  next();
};
const playerOnly=(req,res,next)=>{const header=String(req.get('authorization')||'');const token=header.startsWith('Bearer ')?header.slice(7):'';const auth=authenticatePlayerToken(db,token);if(!auth)return res.status(401).json({error:'player access token required'});const gate=playerLimiter.consume(auth.playerId);if(!gate.allowed){res.set('Retry-After',String(gate.retryAfterSeconds));return res.status(429).json({error:'rate limit exceeded'});}req.playerAuth=auth;next();};
const readiness=()=>buildSeasonReadiness(listPublicPlayers(db));

app.get('/api/health',(_q,res)=>res.json({ok:true,service:'hmena-chess-v2'}));
app.get('/api/config',(_q,res)=>{
  const control=getSeasonControl(db);
  const rules=leagueRuleMap(db);res.json({seasonName:process.env.SEASON_NAME||'HMENA Chess League 2026',gamesPerOpponent:rules.games_per_opponent,scoring:rules.scoring,minActivityHours:24,playAhead:true,automatic24hForfeit:false,registrationRequiresVerifiedPlatformAccount:true,ownershipPolicy:rules.ownership_requirement,registrationOpen:control.registration_state==='OPEN',registrationState:control.registration_state,seasonStatus:control.season_status});
});
app.post('/api/season/preview',(req,res)=>{
  try{const count=Number(req.body?.playerCount);const days=Number(req.body?.maxDays||count);res.json(seasonPlan(count,3,days));}
  catch(error){res.status(400).json({error:error.message});}
});
app.post('/api/registration',async(req,res,next)=>{
  if(!registrationIsOpen(db))return res.status(409).json({error:'Las inscripciones están cerradas para esta temporada',code:'REGISTRATION_CLOSED'});
  const platform=cleanPlatform(req.body?.platform);
  const username=String(req.body?.username||'').trim();
  try{
    if(!platform||!username||!String(req.body?.name||'').trim())return res.status(400).json({error:'Nombre, plataforma y usuario son obligatorios'});
    const verification=await verifyPlatformAccount(platform,username);
    const result=db.transaction(()=>{const registered=submitVerifiedRegistration(db,Object.assign({},req.body,{platform}),verification);recordProfileVerification(db,registered.playerId,verification);const access=issuePlayerToken(db,registered.playerId);return Object.assign({},registered,{playerAccessToken:access.token,playerAccessTokenExpiresAt:access.expiresAt,playerAccessWarning:'Guarda este acceso en este dispositivo. Solo se muestra una vez.'});})();
    res.status(201).json(result);
  }catch(error){
    if(error instanceof AccountNotFoundError)return res.status(422).json({error:error.message,code:error.code});
    if(error instanceof AccountVerificationUnavailableError)return res.status(503).json({error:error.message,code:error.code});
    if(error instanceof RegistrationConflictError)return res.status(409).json({error:error.message,code:error.code});
    if(error instanceof TypeError)return res.status(400).json({error:error.message});
    next(error);
  }
});
app.get('/api/players',(_q,res)=>res.json(listPublicPlayers(db)));
app.patch('/api/admin/players/:id',adminOnly,(req,res)=>{
  const allowed=new Set(['pending','registered','declined','withdrawn']);
  const status=String(req.body?.registrationStatus||'').toLowerCase();
  if(!allowed.has(status))return res.status(400).json({error:'invalid registration status'});
  const result=db.prepare('UPDATE players SET registration_status=? WHERE id=?').run(status,req.params.id);
  if(!result.changes)return res.status(404).json({error:'player not found'});
  res.json({ok:true});
});
app.post('/api/admin/players/:id/accounts/verify',adminOnly,async(req,res,next)=>{
  if(getSeasonControl(db).season_status==='STARTED')return res.status(409).json({error:'season already started'});
  const platform=cleanPlatform(req.body?.platform);
  const username=String(req.body?.username||'').trim();
  try{
    if(!platform||!username)return res.status(400).json({error:'platform and username are required'});
    const verification=await verifyPlatformAccount(platform,username);
    const result=db.transaction(()=>{const linked=linkVerifiedAccount(db,req.params.id,verification);recordProfileVerification(db,req.params.id,verification);return linked;})();res.status(201).json(result);
  }catch(error){
    if(error instanceof AccountNotFoundError)return res.status(422).json({error:error.message,code:error.code});
    if(error instanceof AccountVerificationUnavailableError)return res.status(503).json({error:error.message,code:error.code});
    if(error instanceof RegistrationConflictError)return res.status(409).json({error:error.message,code:error.code});
    if(error instanceof TypeError)return res.status(400).json({error:error.message});
    next(error);
  }
});
app.get('/api/admin/students',adminOnly,(_q,res)=>res.json(listStudents(db)));
app.post('/api/admin/students',adminOnly,(req,res)=>{try{res.status(201).json(createStudent(db,req.body));}catch(error){res.status(400).json({error:error.message});}});
app.get('/api/admin/schools',adminOnly,(_q,res)=>res.json(listSchools(db)));
app.post('/api/admin/schools',adminOnly,(req,res)=>{try{res.status(201).json(createSchool(db,req.body));}catch(error){res.status(400).json({error:error.message});}});
app.get('/api/admin/programs',adminOnly,(_q,res)=>res.json(listPrograms(db)));
app.post('/api/admin/programs',adminOnly,(req,res)=>{try{res.status(201).json(createProgram(db,req.body));}catch(error){res.status(400).json({error:error.message});}});
app.post('/api/admin/programs/:id/enrollments',adminOnly,(req,res)=>{try{res.status(201).json(enrollStudent(db,{programId:req.params.id,studentId:req.body?.studentId,initialLevel:req.body?.initialLevel??null}));}catch(error){res.status(400).json({error:error.message});}});
app.get('/api/admin/season/readiness',adminOnly,(_q,res)=>res.json(Object.assign({control:getSeasonControl(db),compatibility:readiness()},buildReadinessDashboard(db))));
app.get('/api/admin/rules',adminOnly,(_q,res)=>res.json(listLeagueRules(db)));
app.put('/api/admin/rules/:key',adminOnly,(req,res)=>{try{res.json(updateLeagueRule(db,req.params.key,req.body?.value,{approved:req.body?.approved===true}));}catch(error){res.status(400).json({error:error.message});}});
app.patch('/api/admin/accounts/:id/ownership',adminOnly,(req,res)=>{try{setOwnershipVerification(db,req.params.id,String(req.body?.state||''));res.json({ok:true});}catch(error){res.status(400).json({error:error.message});}});
app.post('/api/admin/players/:id/access/regenerate',adminOnly,(req,res)=>{try{const access=regeneratePlayerToken(db,req.params.id);res.status(201).json({playerId:req.params.id,playerAccessToken:access.token,expiresAt:access.expiresAt,warning:'Token shown once'});}catch(error){res.status(400).json({error:error.message});}});
app.post('/api/admin/players/:id/access/revoke',adminOnly,(req,res)=>res.json({revoked:revokePlayerTokens(db,req.params.id)}));
app.post('/api/admin/registration/open',adminOnly,(_q,res)=>{
  try{res.json({ok:true,control:openRegistration(db)});}catch(error){res.status(409).json({error:error.message});}
});
app.post('/api/admin/registration/close',adminOnly,(_q,res)=>{
  const state=readiness();
  if(!state.ready)return res.status(409).json({error:state.playerCount<2?'Se necesitan al menos 2 jugadores verificados':'Hay parejas sin una plataforma en común',readiness:state});
  res.json({ok:true,control:closeRegistration(db),readiness:state});
});
app.post('/api/admin/season/start',adminOnly,(req,res)=>{
  const control=getSeasonControl(db);
  if(control.season_status!=='REGISTRATION'||control.registration_state!=='CLOSED')return res.status(409).json({error:'Close and freeze registration before starting the season'});
  const players=listPublicPlayers(db);
  const state=buildSeasonReadiness(players);
  if(!state.ready)return res.status(409).json({error:'Season readiness failed',readiness:state});
  if(db.prepare('SELECT COUNT(*) AS n FROM series').get().n>0)return res.status(409).json({error:'Season already generated'});
  const series=generateSeries(players.map(p=>({id:p.id,name:p.name})),3);
  const games=generateGameSlots(series);
  const compatibility=new Map(state.pairs.map(pair=>[pair.key,pair.allowedPlatforms]));
  const insertSeries=db.prepare('INSERT INTO series (id,player1_id,player2_id,games_required,games_played,points1,points2,status) VALUES (@id,@player1Id,@player2Id,@gamesRequired,@gamesPlayed,@points1,@points2,@status)');
  const insertGame=db.prepare('INSERT INTO games (id,series_id,player1_id,player2_id,game_no,status) VALUES (@id,@seriesId,@player1Id,@player2Id,@gameNo,@status)');
  const insertPlatforms=db.prepare('INSERT INTO series_platforms (series_id,allowed_platforms_json) VALUES (?,?)');
  db.transaction(()=>{
    for(const row of series){insertSeries.run(row);insertPlatforms.run(row.id,JSON.stringify(compatibility.get(seasonPairKey(row.player1Id,row.player2Id))||[]));}
    for(const row of games)insertGame.run(row);
    markSeasonStarted(db);
  })();
  res.status(201).json(Object.assign({},seasonPlan(players.length,3,Number(process.env.SEASON_MAX_DAYS||players.length)),{generated:true,control:getSeasonControl(db)}));
});
app.get('/api/standings',(_q,res)=>{
  const players=listPublicPlayers(db).map(p=>({id:p.id,name:p.name}));
  res.json(computeStandings(players,loadGames(db)));
});
app.get('/api/player/:id/opponents',(req,res)=>{
  const players=new Map(listPublicPlayers(db).map(p=>[p.id,p]));
  if(!players.has(req.params.id))return res.status(404).json({error:'player not found'});
  res.json(eligibleOpponents(req.params.id,loadSeries(db)).filter(o=>players.has(o.opponentId)).map(o=>{
    const row=db.prepare('SELECT allowed_platforms_json FROM series_platforms WHERE series_id=?').get(o.seriesId);
    return Object.assign({},o,{opponent:players.get(o.opponentId)?.name,opponentPlatform:players.get(o.opponentId)?.platform,opponentUsername:players.get(o.opponentId)?.username,allowedPlatforms:row?JSON.parse(row.allowed_platforms_json):[]});
  }));
});
app.patch('/api/player/:id/availability',playerOnly,(req,res)=>{
  if(req.playerAuth.playerId!==req.params.id)return res.status(403).json({error:'token does not authorize this player'});
  if(!isPublicPlayer(db,req.params.id))return res.status(404).json({error:'player not found'});
  const allowed=new Set(['available','busy','pause','unknown']);
  const availability=String(req.body?.availability||'').toLowerCase();
  if(!allowed.has(availability))return res.status(400).json({error:'invalid availability'});
  const result=db.prepare('UPDATE players SET availability=? WHERE id=?').run(availability,req.params.id);
  if(!result.changes)return res.status(404).json({error:'player not found'});
  res.json({ok:true});
});
app.get('/api/player/me',playerOnly,(req,res)=>{const data=playerPrivateDashboard(db,req.playerAuth.playerId);if(!data)return res.status(404).json({error:'player not found'});res.json(data);});
app.patch('/api/player/me/availability',playerOnly,(req,res)=>{const allowed=new Set(['available','busy','pause','unknown']);const availability=String(req.body?.availability||'').toLowerCase();if(!allowed.has(availability))return res.status(400).json({error:'invalid availability'});db.prepare('UPDATE players SET availability=? WHERE id=?').run(availability,req.playerAuth.playerId);res.json({ok:true});});
const reportHandler=(req,res)=>{try{const result=reportOfficialGame(db,{playerId:req.playerAuth.playerId,seriesId:req.body?.seriesId,platform:cleanPlatform(req.body?.platform),url:req.body?.url,externalGameId:req.body?.externalGameId,challengeId:req.body?.challengeId});res.status(202).json(result);}catch(error){if(error instanceof DuplicateOfficialGameError)return res.status(409).json({error:error.message,code:error.code});if(error instanceof GameValidationError)return res.status(422).json({error:error.message,code:error.code});res.status(400).json({error:error.message});}};
app.post('/api/games/report',playerOnly,reportHandler);
app.post('/api/player/me/games/report',playerOnly,reportHandler);
app.post('/api/player/me/challenges',playerOnly,(req,res)=>{try{res.status(201).json(recordChallenge(db,{playerId:req.playerAuth.playerId,seriesId:req.body?.seriesId,platform:cleanPlatform(req.body?.platform),challengeUrl:req.body?.challengeUrl,providerChallengeId:req.body?.providerChallengeId}));}catch(error){res.status(400).json({error:error.message,code:error.code});}});
app.post('/api/player/me/submissions/:id/dispute',playerOnly,(req,res)=>{const submission=db.prepare('SELECT submitted_by_player_id FROM official_game_submissions WHERE id=?').get(req.params.id);if(!submission||submission.submitted_by_player_id!==req.playerAuth.playerId)return res.status(404).json({error:'submission not found'});try{res.status(201).json(disputeSubmission(db,req.params.id,{actorType:'player',actorId:req.playerAuth.playerId,reason:String(req.body?.reason||'')}));}catch(error){res.status(400).json({error:error.message});}});
app.post('/api/admin/games/:id/validate',adminOnly,async(req,res,next)=>{try{let chessComClient=null;try{chessComClient=new ChessComClient();}catch{}res.json(await validateReportedGame(db,req.params.id,{lichessClient:new LichessClient(),chessComClient}));}catch(error){next(error);}});
app.post('/api/admin/games/:id/dispute',adminOnly,(req,res)=>{try{res.status(201).json(disputeSubmission(db,req.params.id,{reason:String(req.body?.reason||''),actorType:'admin'}));}catch(error){res.status(400).json({error:error.message});}});
app.get('/api/activity',(_q,res)=>{
  const incomplete=new Set(loadSeries(db).filter(s=>s.status!=='COMPLETE').flatMap(s=>[s.player1Id,s.player2Id]));
  res.json(listPublicPlayers(db).map(p=>Object.assign({id:p.id,name:p.name,hasRemainingGames:incomplete.has(p.id)},activityStatus(p.last_activity_at))));
});
app.get('/api/community/metrics',(_q,res)=>{const ids=publicPlayerIds(db);res.json(communityMetrics(db,{playerIds:ids}));});
app.get('/api/community/highlights',(_q,res)=>{const ids=publicPlayerIds(db);res.json(communityHighlights(db,{playerIds:ids}));});
app.get('/api/community/h2h',(req,res)=>{
  const {playerA,playerB}=req.query;
  if(!playerA||!playerB)return res.status(400).json({error:'playerA and playerB are required'});
  if(!isPublicPlayer(db,String(playerA))||!isPublicPlayer(db,String(playerB)))return res.status(404).json({error:'verified players required'});
  res.json(h2hMetrics(db,String(playerA),String(playerB)));
});
app.get('/api/community/xp',(_q,res)=>{const ids=publicPlayerIds(db);res.json(xpLeaderboard(db,{playerIds:ids}));});
app.get('/api/hall-of-fame',(_q,res)=>{
  const ids=publicPlayerIds(db);
  if(!ids.length)return res.json([]);
  const placeholders=ids.map(()=>'?').join(',');
  res.json(db.prepare(`SELECT season_name AS seasonName,cup,rank,player_name AS playerName,points,identity_status AS identityStatus FROM hall_of_fame_records WHERE player_id IN (${placeholders}) ORDER BY season_name,rank`).all(...ids));
});
app.get('/api/import/status',(_q,res)=>res.json(importStatus(db)));
app.post('/api/admin/whatsapp/digest',adminOnly,async(_q,res,next)=>{
  try{
    const table=computeStandings(listPublicPlayers(db).map(p=>({id:p.id,name:p.name})),loadGames(db));
    const leaders=table.slice(0,5).map(r=>r.rank+'. '+r.name+' - '+r.points+' pts').join('\n');
    res.json(await sendGroupMessage('HMENA Chess League\n\nTabla actual:\n'+(leaders||'Aun sin partidas validadas.')));
  }catch(error){next(error);}
});
app.use((error,_q,res,_n)=>{console.error(error);res.status(500).json({error:'internal error'});});
const port=Number(process.env.PORT||3210);
const host=process.env.HOST||'127.0.0.1';
app.listen(port,host,()=>console.log('HMENA Chess League V2 listening on '+host+':'+port));
