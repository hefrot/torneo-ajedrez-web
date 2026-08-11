import {createHash} from 'node:crypto';

export function loadXpConfig(db) {
  return Object.fromEntries(db.prepare('SELECT key,value_json FROM community_xp_config').all().map(row => [row.key, JSON.parse(row.value_json)]));
}

const weekKey = value => {
  const date = new Date(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
};

const eventId = value => `XP-${createHash('sha256').update(value).digest('hex').slice(0, 20)}`;

export function rebuildHistoricalGameXp(db) {
  const config = loadXpConfig(db);
  const required = ['game_base_xp','daily_game_limit','daily_cap','weekly_cap','repeated_opponent_multipliers','distinct_opponent_bonus'];
  for (const key of required) if (config[key] == null) throw new Error(`Missing Community XP config: ${key}`);
  const games = db.prepare(`SELECT id,source_game_id,white_player_id,black_player_id,played_at FROM historical_games WHERE identity_status='CONFIRMED_SOURCE_ID' AND white_player_id IS NOT NULL AND black_player_id IS NOT NULL AND played_at IS NOT NULL ORDER BY played_at,id`).all();
  const insert = db.prepare(`INSERT OR REPLACE INTO community_xp_events (id,player_id,event_type,source_system,source_id,occurred_at,base_xp,multiplier,awarded_xp,verified,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,1,?)`);
  const dailyGames = new Map();
  const dailyOpponent = new Map();
  const dailyDistinct = new Map();
  const dailyXp = new Map();
  const weeklyXp = new Map();
  db.prepare("DELETE FROM community_xp_events WHERE source_system='historical_import' AND event_type='verified_casual_game'").run();
  let inserted = 0;
  db.transaction(() => {
    for (const game of games) {
      const day = new Date(game.played_at).toISOString().slice(0, 10);
      for (const [playerId, opponentId] of [[game.white_player_id,game.black_player_id],[game.black_player_id,game.white_player_id]]) {
        const dayPlayer = `${day}:${playerId}`;
        const weekPlayer = `${weekKey(game.played_at)}:${playerId}`;
        const pair = `${dayPlayer}:${opponentId}`;
        const gamesToday = dailyGames.get(dayPlayer) || 0;
        const repeated = dailyOpponent.get(pair) || 0;
        const distinct = dailyDistinct.get(dayPlayer) || new Set();
        const firstDistinct = !distinct.has(opponentId);
        const multipliers = config.repeated_opponent_multipliers;
        const multiplier = gamesToday < config.daily_game_limit ? Number(multipliers[Math.min(repeated,multipliers.length-1)] || 0) : 0;
        const base = Number(config.game_base_xp);
        const proposed = Math.round(base * multiplier + (firstDistinct && multiplier > 0 ? Number(config.distinct_opponent_bonus) : 0));
        const dayUsed = dailyXp.get(dayPlayer) || 0;
        const weekUsed = weeklyXp.get(weekPlayer) || 0;
        const awarded = Math.max(0, Math.min(proposed, Number(config.daily_cap) - dayUsed, Number(config.weekly_cap) - weekUsed));
        insert.run(eventId(`${game.id}:${playerId}`),playerId,'verified_casual_game','historical_import',game.source_game_id,game.played_at,base,multiplier,awarded,JSON.stringify({opponentId,dayGameNumber:gamesToday+1,opponentRepeatNumber:repeated+1,distinctOpponentBonus:firstDistinct&&multiplier>0}));
        dailyGames.set(dayPlayer,gamesToday+1);
        dailyOpponent.set(pair,repeated+1);
        distinct.add(opponentId);
        dailyDistinct.set(dayPlayer,distinct);
        dailyXp.set(dayPlayer,dayUsed+awarded);
        weeklyXp.set(weekPlayer,weekUsed+awarded);
        inserted += 1;
      }
    }
  })();
  return {events:inserted,config};
}
