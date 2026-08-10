import express from 'express';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {openDatabase,listPlayers,loadGames,loadSeries,importStatus} from './db.js';
import {generateSeries,generateGameSlots,computeStandings,eligibleOpponents,seasonPlan,activityStatus} from './league-engine.js';
import {sendGroupMessage} from './services/whatsapp.js';
import {communityMetrics,h2hMetrics,xpLeaderboard,communityHighlights} from './community-metrics.js';
import {submitRegistration,RegistrationConflictError} from './registration.js';

const app=express();
const db=openDatabase();
const here=dirname(fileURLToPath(import.meta.url));
const webRoot=join(here,'..','web');
app.use(express.json({limit:'64kb'}));
app.use(express.static(webRoot));

const cleanPlatform=value=>({lichess:'lichess','chess.com':'chesscom',chesscom:'chesscom'}[String(value||'').toLowerCase()]);
const adminOnly=(req,res,next)=>{
  if(!process.env.ADMIN_API_KEY||req.get('x-admin-key')!==process.env.ADMIN_API_KEY)return res.status(401).json({error:'admin key required'});
  next();
};

app.get('/api/health',(_q,res)=>res.json({ok:true,service:'hmena-chess-v2'}));
app.get('/api/config',(_q,res)=>res.json({seasonName:process.env.SEASON_NAME||'HMENA Chess League 2026',gamesPerOpponent:3,scoring:{win:3,draw:1,loss:0},minActivityHours:24,playAhead:true,automatic24hForfeit:false}));
app.post('/api/season/preview',(req,res)=>{
  try{const count=Number(req.body?.playerCount);const days=Number(req.body?.maxDays||count);res.json(seasonPlan(count,3,days));}
  catch(error){res.status(400).json({error:error.message});}
});
app.post('/api/registration',(req,res)=>{
  const platform=cleanPlatform(req.body?.platform);
  try{
    const result=submitRegistration(db,Object.assign({},req.body,{platform}));
    res.status(201).json(result);
  }catch(error){
    if(error instanceof RegistrationConflictError)return res.status(409).json({error:'Registration already pending for that platform username'});
    if(error instanceof TypeError)return res.status(400).json({error:error.message});
    throw error;
  }
});
app.get('/api/players',(_q,res)=>res.json(listPlayers(db).map(({whatsapp,...safe})=>safe)));
app.patch('/api/admin/players/:id',adminOnly,(req,res)=>{
  const allowed=new Set(['pending','registered','declined','withdrawn']);
  const status=String(req.body?.registrationStatus||'').toLowerCase();
  if(!allowed.has(status))return res.status(400).json({error:'invalid registration status'});
  const result=db.prepare('UPDATE players SET registration_status=? WHERE id=?').run(status,req.params.id);
  if(!result.changes)return res.status(404).json({error:'player not found'});
  res.json({ok:true});
});
app.post('/api/admin/season/start',adminOnly,(req,res)=>{
  const players=listPlayers(db,{registeredOnly:true}).map(p=>({id:p.id,name:p.name}));
  if(players.length<2)return res.status(400).json({error:'At least 2 registered players are required'});
  if(db.prepare('SELECT COUNT(*) AS n FROM series').get().n>0)return res.status(409).json({error:'Season already generated'});
  const series=generateSeries(players,3);
  const games=generateGameSlots(series);
  const insertSeries=db.prepare('INSERT INTO series (id,player1_id,player2_id,games_required,games_played,points1,points2,status) VALUES (@id,@player1Id,@player2Id,@gamesRequired,@gamesPlayed,@points1,@points2,@status)');
  const insertGame=db.prepare('INSERT INTO games (id,series_id,player1_id,player2_id,game_no,status) VALUES (@id,@seriesId,@player1Id,@player2Id,@gameNo,@status)');
  db.transaction(()=>{for(const row of series)insertSeries.run(row);for(const row of games)insertGame.run(row);})();
  res.status(201).json(Object.assign({},seasonPlan(players.length,3,Number(process.env.SEASON_MAX_DAYS||players.length)),{generated:true}));
});
app.get('/api/standings',(_q,res)=>{
  const players=listPlayers(db,{registeredOnly:true}).map(p=>({id:p.id,name:p.name}));
  res.json(computeStandings(players,loadGames(db)));
});
app.get('/api/player/:id/opponents',(req,res)=>{
  const players=new Map(listPlayers(db).map(p=>[p.id,p]));
  if(!players.has(req.params.id))return res.status(404).json({error:'player not found'});
  res.json(eligibleOpponents(req.params.id,loadSeries(db)).map(o=>Object.assign({},o,{opponent:players.get(o.opponentId)?.name,opponentPlatform:players.get(o.opponentId)?.platform,opponentUsername:players.get(o.opponentId)?.username})));
});
app.patch('/api/player/:id/availability',(req,res)=>{
  const allowed=new Set(['available','busy','pause','unknown']);
  const availability=String(req.body?.availability||'').toLowerCase();
  if(!allowed.has(availability))return res.status(400).json({error:'invalid availability'});
  const result=db.prepare('UPDATE players SET availability=? WHERE id=?').run(availability,req.params.id);
  if(!result.changes)return res.status(404).json({error:'player not found'});
  res.json({ok:true});
});
app.post('/api/games/report',(req,res)=>{
  const {playerId,seriesId,platform,externalGameId,url}=req.body||{};
  const series=db.prepare('SELECT * FROM series WHERE id=?').get(seriesId);
  if(!series||![series.player1_id,series.player2_id].includes(playerId))return res.status(400).json({error:'invalid player/series'});
  const slot=db.prepare("SELECT * FROM games WHERE series_id=? AND status='PENDING' ORDER BY game_no LIMIT 1").get(seriesId);
  if(!slot)return res.status(409).json({error:'series has no pending game slots'});
  db.prepare("UPDATE games SET platform=?, external_game_id=?, url=?, status='REPORTED' WHERE id=?").run(cleanPlatform(platform)||platform,externalGameId||null,url||null,slot.id);
  res.status(202).json({gameId:slot.id,status:'REPORTED',note:'Worker/API validation must confirm the result before points count.'});
});
app.get('/api/activity',(_q,res)=>{
  const incomplete=new Set(loadSeries(db).filter(s=>s.status!=='COMPLETE').flatMap(s=>[s.player1Id,s.player2Id]));
  res.json(listPlayers(db,{registeredOnly:true}).map(p=>Object.assign({id:p.id,name:p.name,hasRemainingGames:incomplete.has(p.id)},activityStatus(p.last_activity_at))));
});
app.get('/api/community/metrics',(_q,res)=>res.json(communityMetrics(db)));
app.get('/api/community/highlights',(_q,res)=>res.json(communityHighlights(db)));
app.get('/api/community/h2h',(req,res)=>{
  const {playerA,playerB}=req.query;
  if(!playerA||!playerB)return res.status(400).json({error:'playerA and playerB are required'});
  res.json(h2hMetrics(db,String(playerA),String(playerB)));
});
app.get('/api/community/xp',(_q,res)=>res.json(xpLeaderboard(db)));
app.get('/api/hall-of-fame',(_q,res)=>res.json(db.prepare('SELECT season_name AS seasonName,cup,rank,player_name AS playerName,points,identity_status AS identityStatus FROM hall_of_fame_records ORDER BY season_name,rank').all()));
app.get('/api/import/status',(_q,res)=>res.json(importStatus(db)));
app.post('/api/admin/whatsapp/digest',adminOnly,async(_q,res,next)=>{
  try{
    const table=computeStandings(listPlayers(db,{registeredOnly:true}).map(p=>({id:p.id,name:p.name})),loadGames(db));
    const leaders=table.slice(0,5).map(r=>r.rank+'. '+r.name+' - '+r.points+' pts').join('\n');
    res.json(await sendGroupMessage('HMENA Chess League\n\nTabla actual:\n'+(leaders||'Aun sin partidas validadas.')));
  }catch(error){next(error);}
});
app.use((error,_q,res,_n)=>{console.error(error);res.status(500).json({error:'internal error'});});
const port=Number(process.env.PORT||3210);
const host=process.env.HOST||'127.0.0.1';
app.listen(port,host,()=>console.log('HMENA Chess League V2 listening on '+host+':'+port));
