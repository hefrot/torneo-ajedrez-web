export function publicPlayerIds(db) {
  return db.prepare(`SELECT DISTINCT id FROM v_public_league_accounts ORDER BY id`).all().map(row=>row.id);
}

export function listPublicPlayers(db) {
  const rows=db.prepare(`SELECT * FROM v_public_league_accounts ORDER BY name COLLATE NOCASE,platform,username COLLATE NOCASE`).all();
  const byId=new Map();
  for(const row of rows){
    let player=byId.get(row.id);
    if(!player){player={id:row.id,name:row.name,registration_status:row.registration_status,availability:row.availability,last_activity_at:row.last_activity_at,accounts:[]};byId.set(row.id,player);}
    player.accounts.push({platform:row.platform,username:row.username,verifiedAt:row.verified_at,verificationSource:row.verification_source});
  }
  return [...byId.values()].map(player=>({...player,platform:player.accounts[0]?.platform??null,username:player.accounts[0]?.username??null}));
}

export function isPublicPlayer(db,playerId){return Boolean(db.prepare('SELECT 1 FROM v_public_league_accounts WHERE id=? LIMIT 1').get(playerId));}
