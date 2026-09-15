import {openDatabase,listPlayers,loadSeries} from './db.js';
import {activityStatus,dailyPace} from './league-engine.js';
import {LichessClient,lichessRating} from './providers/lichess.js';
import {ChessComClient,chessComRating} from './providers/chesscom.js';
import {sendGroupMessage} from './services/whatsapp.js';
import {validateReportedGame,reconcileSeries} from './official-game-service.js';
import {runJobs} from './job-runner.js';
const db=openDatabase(),now=new Date(),lichess=new LichessClient();let chesscom=null;try{chesscom=new ChessComClient();}catch{}
const jobs={
  async refreshRatings(){let refreshed=0,errors=0;for(const player of listPlayers(db,{registeredOnly:true})){try{let snapshot;if(player.platform==='lichess')snapshot=lichessRating(await lichess.getUser(player.username));else if(player.platform==='chesscom'&&chesscom)snapshot=chessComRating(await chesscom.getStats(player.username));if(snapshot?.rating!=null){db.prepare('INSERT INTO rating_snapshots(player_id,platform,rating,rating_type,captured_at) VALUES (?,?,?,?,?)').run(player.id,player.platform,snapshot.rating,snapshot.type,now.toISOString());refreshed+=1;}}catch{errors+=1;}}return{refreshed,errors};},
  async validateOfficialGames(){const rows=db.prepare("SELECT id FROM official_game_submissions WHERE status IN ('REPORTED','PENDING_PROVIDER') AND (next_retry_at IS NULL OR next_retry_at<=?) ORDER BY submitted_at LIMIT 100").all(now.toISOString());let validated=0,pending=0,rejected=0,errors=0;for(const row of rows){try{const result=await validateReportedGame(db,row.id,{lichessClient:lichess,chessComClient:chesscom},{now});if(result.status==='VALIDATED')validated+=1;else if(result.status==='PENDING_PROVIDER')pending+=1;else if(result.status==='REJECTED')rejected+=1;}catch{errors+=1;}}return{processed:rows.length,validated,pending,rejected,errors};},
  async reconcileSeries(){const rows=loadSeries(db);for(const row of rows)reconcileSeries(db,row.id);return{series:rows.length};},
  async calculateActivity(){const players=listPlayers(db,{registeredOnly:true}),series=loadSeries(db).filter(row=>row.status!=='COMPLETE');let alerts=0;for(const player of players){const remaining=series.filter(row=>row.player1Id===player.id||row.player2Id===player.id).reduce((sum,row)=>sum+Math.max(0,row.gamesRequired-row.gamesPlayed),0);if(remaining&&['REMINDER','URGENT','OVERDUE','NO_ACTIVITY'].includes(activityStatus(player.last_activity_at,now).status)){dailyPace(remaining,Math.max(1,players.length));alerts+=1;}}return{players:players.length,alerts};},
  async whatsappDryRunDigest(){if(String(process.env.WHATSAPP_DRY_RUN).toLowerCase()!=='true')throw Object.assign(new Error('live WhatsApp disabled for worker'),{code:'LIVE_SEND_BLOCKED'});const pending=db.prepare("SELECT COUNT(*) AS n FROM official_game_submissions WHERE status IN ('REPORTED','PENDING_PROVIDER')").get().n;if(!pending)return{skipped:true,pending:0};const result=await sendGroupMessage(`HMENA Chess League V2 dry-run: ${pending} partidas pendientes de validación.`);return{pending,dryRun:result?.dryRun===true};},
};
console.log(JSON.stringify({jobs:await runJobs(db,jobs),at:now.toISOString()}));
