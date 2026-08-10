export const DEFAULT_RULES = Object.freeze({
  gamesPerOpponent: 3,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  reminderHours: 18,
  urgentHours: 23,
  overdueHours: 24,
  mainPlayoffSize: 8,
});

function assertPlayers(players) {
  const ids = new Set();
  for (const player of players) {
    if (!player?.id) throw new Error('Every player needs a stable id');
    if (ids.has(player.id)) throw new Error(`Duplicate player id: ${player.id}`);
    ids.add(player.id);
  }
}

export function generateSeries(players, gamesPerOpponent = DEFAULT_RULES.gamesPerOpponent) {
  assertPlayers(players);
  if (!Number.isInteger(gamesPerOpponent) || gamesPerOpponent < 1) throw new Error('gamesPerOpponent must be a positive integer');
  const series = [];
  let sequence = 1;
  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const a = players[i]; const b = players[j];
      series.push({ id: `S${String(sequence).padStart(4, '0')}`, player1Id: a.id, player2Id: b.id, gamesRequired: gamesPerOpponent, gamesPlayed: 0, points1: 0, points2: 0, status: 'PENDING' });
      sequence += 1;
    }
  }
  return series;
}

export function generateGameSlots(series) {
  const games = [];
  for (const item of series) for (let gameNo = 1; gameNo <= item.gamesRequired; gameNo += 1) games.push({ id: `${item.id}-G${gameNo}`, seriesId: item.id, player1Id: item.player1Id, player2Id: item.player2Id, gameNo, result: null, status: 'PENDING' });
  return games;
}

export function scoreResult(result, rules = DEFAULT_RULES) {
  switch (result) {
    case '1-0': return { p1: rules.winPoints, p2: rules.lossPoints, p1Score: 1, p2Score: 0 };
    case '0-1': return { p1: rules.lossPoints, p2: rules.winPoints, p1Score: 0, p2Score: 1 };
    case '1/2-1/2': case '0.5-0.5': return { p1: rules.drawPoints, p2: rules.drawPoints, p1Score: 0.5, p2Score: 0.5 };
    default: throw new Error(`Unsupported result: ${result}`);
  }
}

const validatedGames = games => games.filter(g => g.status === 'VALIDATED' && g.result);

export function computeStandings(players, games, rules = DEFAULT_RULES) {
  assertPlayers(players);
  const byId = new Map(players.map(p => [p.id, { id: p.id, name: p.name ?? p.id, played: 0, wins: 0, draws: 0, losses: 0, points: 0, h2h: 0, sonnebornBerger: 0 }]));
  const played = validatedGames(games);
  for (const game of played) {
    const a = byId.get(game.player1Id); const b = byId.get(game.player2Id); if (!a || !b) continue;
    const score = scoreResult(game.result, rules); a.played += 1; b.played += 1; a.points += score.p1; b.points += score.p2;
    if (score.p1Score === 1) { a.wins += 1; b.losses += 1; } else if (score.p2Score === 1) { b.wins += 1; a.losses += 1; } else { a.draws += 1; b.draws += 1; }
  }
  const groups = new Map();
  for (const row of byId.values()) { const list = groups.get(row.points) ?? []; list.push(row.id); groups.set(row.points, list); }
  for (const ids of groups.values()) {
    if (ids.length < 2) continue; const tied = new Set(ids);
    for (const game of played) if (tied.has(game.player1Id) && tied.has(game.player2Id)) { const score = scoreResult(game.result, rules); byId.get(game.player1Id).h2h += score.p1; byId.get(game.player2Id).h2h += score.p2; }
  }
  for (const game of played) {
    const a = byId.get(game.player1Id); const b = byId.get(game.player2Id); if (!a || !b) continue;
    const score = scoreResult(game.result, rules); a.sonnebornBerger += b.points * score.p1Score; b.sonnebornBerger += a.points * score.p2Score;
  }
  return [...byId.values()].sort((a,b) => b.points-a.points || b.h2h-a.h2h || b.wins-a.wins || b.sonnebornBerger-a.sonnebornBerger || a.name.localeCompare(b.name)).map((row,index)=>({...row,rank:index+1}));
}

export const seriesForPlayer = (playerId, series) => series.filter(s => s.player1Id === playerId || s.player2Id === playerId);
export function eligibleOpponents(playerId, series) { return seriesForPlayer(playerId, series).filter(s => s.status !== 'COMPLETE').map(s => ({ seriesId:s.id, opponentId:s.player1Id===playerId?s.player2Id:s.player1Id, gamesRemaining:Math.max(0,s.gamesRequired-s.gamesPlayed), status:s.status })); }
export function seasonPlan(playerCount, gamesPerOpponent=3, maxDays=playerCount) { if(!Number.isInteger(playerCount)||playerCount<2) throw new Error('playerCount must be >= 2'); const series=playerCount*(playerCount-1)/2; const games=series*gamesPerOpponent; const gamesPerPlayer=(playerCount-1)*gamesPerOpponent; const days=Math.max(1,Math.ceil(maxDays)); return {playerCount,series,totalGames:games,gamesPerPlayer,maxDays:days,recommendedGamesPerPlayerPerDay:Math.ceil(gamesPerPlayer/days)}; }
export const dailyPace = (remainingGames, daysRemaining) => remainingGames<=0?0:Math.ceil(remainingGames/Math.max(1,daysRemaining));
export function activityStatus(lastGameAt, now=new Date(), rules=DEFAULT_RULES) { if(!lastGameAt) return {status:'NO_ACTIVITY',hours:null}; const hours=Math.max(0,(new Date(now).getTime()-new Date(lastGameAt).getTime())/3600000); if(hours>=rules.overdueHours)return{status:'OVERDUE',hours}; if(hours>=rules.urgentHours)return{status:'URGENT',hours}; if(hours>=rules.reminderHours)return{status:'REMINDER',hours}; return{status:'OK',hours}; }
function firstRound(entries){const seeded=entries.map((entry,index)=>({...entry,seed:index+1})); const bracketSize=2**Math.ceil(Math.log2(Math.max(2,seeded.length))); const padded=[...seeded,...Array(bracketSize-seeded.length).fill(null)]; const matches=[]; for(let i=0;i<bracketSize/2;i+=1)matches.push({match:i+1,highSeed:padded[i],lowSeed:padded[bracketSize-1-i]}); return{bracketSize,matches};}
export function seedPlayoffs(standings){const main=standings.slice(0,Math.min(DEFAULT_RULES.mainPlayoffSize,standings.length)); const secondary=standings.length>=12?standings.slice(8,Math.min(16,standings.length)):[]; return{main:firstRound(main),secondary:secondary.length>=4?firstRound(secondary):null};}
export function noAutomaticForfeitPolicy(){return{automaticForfeitAfter24h:false,reason:'The 24-hour rule measures activity, not opponent fault. Forfeits require a specific accepted challenge deadline or end-of-season adjudication.'};}
