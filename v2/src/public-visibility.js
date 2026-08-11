export function publicPlayerIds(db) {
  return db.prepare(`
    SELECT DISTINCT p.id
    FROM players p
    JOIN player_accounts a ON a.player_id=p.id
    WHERE p.registration_status='registered'
      AND a.account_status='verified'
      AND a.verified_at IS NOT NULL
    ORDER BY p.id
  `).all().map(row => row.id);
}

export function listPublicPlayers(db) {
  const rows = db.prepare(`
    SELECT p.id,p.name,p.registration_status,p.availability,p.last_activity_at,
           a.platform,a.username,a.verified_at,a.verification_source
    FROM players p
    JOIN player_accounts a ON a.player_id=p.id
    WHERE p.registration_status='registered'
      AND a.account_status='verified'
      AND a.verified_at IS NOT NULL
    ORDER BY p.name COLLATE NOCASE,a.platform,a.username COLLATE NOCASE
  `).all();

  const byId = new Map();
  for (const row of rows) {
    let player = byId.get(row.id);
    if (!player) {
      player = {
        id: row.id,
        name: row.name,
        registration_status: row.registration_status,
        availability: row.availability,
        last_activity_at: row.last_activity_at,
        accounts: [],
      };
      byId.set(row.id, player);
    }
    player.accounts.push({
      platform: row.platform,
      username: row.username,
      verifiedAt: row.verified_at,
      verificationSource: row.verification_source,
    });
  }

  return [...byId.values()].map(player => ({
    ...player,
    platform: player.accounts[0]?.platform ?? null,
    username: player.accounts[0]?.username ?? null,
  }));
}

export function isPublicPlayer(db, playerId) {
  return Boolean(db.prepare(`
    SELECT 1
    FROM players p
    JOIN player_accounts a ON a.player_id=p.id
    WHERE p.id=?
      AND p.registration_status='registered'
      AND a.account_status='verified'
      AND a.verified_at IS NOT NULL
    LIMIT 1
  `).get(playerId));
}
