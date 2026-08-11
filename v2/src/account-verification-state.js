export function recordProfileVerification(db,playerId,verification){
  const account=db.prepare('SELECT id FROM player_accounts WHERE player_id=? AND platform=? AND username_normalized=?').get(playerId,verification.platform,String(verification.usernameNormalized||verification.username).toLowerCase());
  if(!account)throw new Error('verified account row not found');
  db.prepare(`INSERT INTO account_verification_state(account_id,profile_verified,profile_verification_source,profile_verified_at,ownership_verification,updated_at)
    VALUES (?,1,?,?,'pending',?)
    ON CONFLICT(account_id) DO UPDATE SET profile_verified=1,profile_verification_source=excluded.profile_verification_source,profile_verified_at=excluded.profile_verified_at,updated_at=excluded.updated_at`).run(account.id,verification.verificationSource,verification.verifiedAt,verification.verifiedAt);
  return account.id;
}

export function setOwnershipVerification(db,accountId,state,{now=new Date(),verifiedBy='admin'}={}){
  if(!['not_required','pending','oauth','manual'].includes(state))throw new TypeError('invalid ownership verification state');
  const verifiedAt=['oauth','manual'].includes(state)?now.toISOString():null;
  const result=db.prepare(`INSERT INTO account_verification_state(account_id,profile_verified,ownership_verification,ownership_verified_at,ownership_verified_by,updated_at)
    VALUES (?,0,?,?,?,?)
    ON CONFLICT(account_id) DO UPDATE SET ownership_verification=excluded.ownership_verification,ownership_verified_at=excluded.ownership_verified_at,ownership_verified_by=excluded.ownership_verified_by,updated_at=excluded.updated_at`).run(accountId,state,verifiedAt,verifiedAt?verifiedBy:null,now.toISOString());
  return result.changes;
}
