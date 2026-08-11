const DAY_MS = 86_400_000;

const resultFor = (game, playerId) => {
  if (!game.result) return null;
  if (game.result === '1/2-1/2' || game.result === '0.5-0.5') return 'D';
  if (game.result === '1-0') return game.white_player_id === playerId ? 'W' : 'L';
  if (game.result === '0-1') return game.black_player_id === playerId ? 'W' : 'L';
  return null;
};

const utcDay = value => new Date(value).toISOString().slice(0, 10);

function streaks(values, now) {
  const days = [...new Set(values.filter(Boolean).map(utcDay))].sort();
  if (!days.length) return { currentStreak: 0, longestStreak: 0 };
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    const gap = (Date.parse(`${days[i]}T00:00:00Z`) - Date.parse(`${days[i - 1]}T00:00:00Z`)) / DAY_MS;
    run = gap === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  const today = utcDay(now);
  const yesterday = utcDay(new Date(new Date(now).getTime() - DAY_MS));
  const last = days.at(-1);
  if (last !== today && last !== yesterday) return { currentStreak: 0, longestStreak: longest };
  let current = 1;
  for (let i = days.length - 1; i > 0; i -= 1) {
    const gap = (Date.parse(`${days[i]}T00:00:00Z`) - Date.parse(`${days[i - 1]}T00:00:00Z`)) / DAY_MS;
    if (gap !== 1) break;
    current += 1;
  }
  return { currentStreak: current, longestStreak: longest };
}

function ratingDelta(db, playerId, cutoff, now) {
  const rows = db.prepare(`SELECT rating,captured_at FROM historical_rating_snapshots WHERE player_id=? AND rating IS NOT NULL AND captured_at<=? ORDER BY captured_at`).all(playerId, now.toISOString());
  if (rows.length < 2) return null;
  const latest = rows.at(-1);
  const baseline = rows.filter(row => new Date(row.captured_at) <= cutoff).at(-1);
  return baseline ? latest.rating - baseline.rating : null;
}

const allowedSet = playerIds => Array.isArray(playerIds) ? new Set(playerIds) : null;

export function communityMetrics(db, { now = new Date(), playerIds = null } = {}) {
  const allowed = allowedSet(playerIds);
  const players = db.prepare('SELECT id,name FROM players ORDER BY name').all().filter(player => !allowed || allowed.has(player.id));
  const games = db.prepare("SELECT * FROM historical_games WHERE identity_status='CONFIRMED_SOURCE_ID' AND white_player_id IS NOT NULL AND black_player_id IS NOT NULL").all()
    .filter(game => !allowed || (allowed.has(game.white_player_id) && allowed.has(game.black_player_id)));
  const cutoff7 = new Date(now.getTime() - 7 * DAY_MS);
  const cutoff30 = new Date(now.getTime() - 30 * DAY_MS);
  return players.map(player => {
    const relevant = games.filter(game => game.white_player_id === player.id || game.black_player_id === player.id);
    const dated = relevant.filter(game => game.played_at && !Number.isNaN(Date.parse(game.played_at)));
    const outcomes = relevant.map(game => resultFor(game, player.id)).filter(Boolean);
    const opponents = new Set(relevant.map(game => game.white_player_id === player.id ? game.black_player_id : game.white_player_id).filter(Boolean));
    const analysisCount = db.prepare('SELECT COUNT(DISTINCT source_game_id) AS n FROM stockfish_analyses WHERE player_id=? OR opponent_id=?').get(player.id, player.id).n;
    const tournamentWins = db.prepare('SELECT COUNT(*) AS n FROM historical_tournaments WHERE winner_id=?').get(player.id).n;
    const tournamentParticipated = tournamentWins;
    const hallOfFame = db.prepare("SELECT COUNT(*) AS n FROM hall_of_fame_records WHERE player_id=? AND identity_status='CONFIRMED_STABLE_ID'").get(player.id).n;
    return {
      playerId: player.id,
      name: player.name,
      games7d: dated.filter(game => new Date(game.played_at) >= cutoff7).length,
      games30d: dated.filter(game => new Date(game.played_at) >= cutoff30).length,
      gamesAllTime: relevant.length,
      wins: outcomes.filter(x => x === 'W').length,
      draws: outcomes.filter(x => x === 'D').length,
      losses: outcomes.filter(x => x === 'L').length,
      distinctOpponents: opponents.size,
      ...streaks(dated.map(game => game.played_at), now),
      ratingDelta7d: ratingDelta(db, player.id, cutoff7, now),
      ratingDelta30d: ratingDelta(db, player.id, cutoff30, now),
      tournamentsParticipated: tournamentParticipated,
      tournamentsWon: tournamentWins,
      stockfishAnalysesAvailable: analysisCount,
      hallOfFame,
    };
  });
}

export function h2hMetrics(db, playerA, playerB) {
  const games = db.prepare(`SELECT * FROM historical_games WHERE identity_status='CONFIRMED_SOURCE_ID' AND ((white_player_id=? AND black_player_id=?) OR (white_player_id=? AND black_player_id=?)) ORDER BY played_at,id`).all(playerA, playerB, playerB, playerA);
  const outcomes = games.map(game => resultFor(game, playerA)).filter(Boolean);
  return { playerA, playerB, total: games.length, wins: outcomes.filter(x => x === 'W').length, draws: outcomes.filter(x => x === 'D').length, losses: outcomes.filter(x => x === 'L').length, games: games.map(({id,source_game_id,platform,url,played_at,result})=>({id,sourceGameId:source_game_id,platform,url,playedAt:played_at,result})) };
}

export function xpLeaderboard(db, {playerIds = null} = {}) {
  const allowed = allowedSet(playerIds);
  return db.prepare(`SELECT p.id AS playerId,p.name,COALESCE(SUM(e.awarded_xp),0) AS communityXp,COUNT(e.id) AS xpEvents FROM players p LEFT JOIN community_xp_events e ON e.player_id=p.id AND e.verified=1 GROUP BY p.id,p.name ORDER BY communityXp DESC,p.name`).all()
    .filter(row => !allowed || allowed.has(row.playerId));
}

export function communityHighlights(db, {now = new Date(), playerIds = null} = {}) {
  const allowed = allowedSet(playerIds);
  const metrics = communityMetrics(db,{now,playerIds});
  const active = metrics.filter(row => row.games7d > 0).sort((a,b) => b.games7d-a.games7d || a.name.localeCompare(b.name))[0] || null;
  const rating = metrics.filter(row => Number.isFinite(row.ratingDelta30d)).sort((a,b) => b.ratingDelta30d-a.ratingDelta30d || a.name.localeCompare(b.name))[0] || null;
  const opponents = metrics.filter(row => row.distinctOpponents > 0).sort((a,b) => b.distinctOpponents-a.distinctOpponents || a.name.localeCompare(b.name))[0] || null;
  const games = db.prepare("SELECT white_player_id,black_player_id FROM historical_games WHERE identity_status='CONFIRMED_SOURCE_ID' AND white_player_id IS NOT NULL AND black_player_id IS NOT NULL").all()
    .filter(game => !allowed || (allowed.has(game.white_player_id) && allowed.has(game.black_player_id)));
  const pairs = new Map();
  for (const game of games) {
    const [a,b] = [game.white_player_id,game.black_player_id].sort();
    const key = `${a}|${b}`;
    pairs.set(key,(pairs.get(key)||0)+1);
  }
  const topPair = [...pairs.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0] || null;
  let rivalry = null;
  if (topPair) {
    const [a,b] = topPair[0].split('|');
    const names = db.prepare('SELECT id,name FROM players WHERE id IN (?,?)').all(a,b);
    const byId = new Map(names.map(row => [row.id,row.name]));
    rivalry = Object.assign({nameA:byId.get(a),nameB:byId.get(b)},h2hMetrics(db,a,b));
  }
  const hallRows = db.prepare('SELECT player_id FROM hall_of_fame_records WHERE player_id IS NOT NULL').all()
    .filter(row => !allowed || allowed.has(row.player_id));
  return {
    mostActive7d: active,
    featuredRivalry: rivalry,
    largestRatingChange30d: rating,
    mostDistinctOpponents: opponents,
    hallOfFame: {records:hallRows.length,linked:hallRows.length}
  };
}
