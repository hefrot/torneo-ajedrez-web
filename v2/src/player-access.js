import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';

const TOKEN_PREFIX='mkp_';
const tokenDigest=token=>createHash('sha256').update(String(token||'')).digest();
export const hashPlayerToken=token=>tokenDigest(token).toString('hex');

export function issuePlayerToken(db,playerId,{now=new Date(),ttlDays=365,createdBy='registration',revokeExisting=false,rotatedFromId=null}={}){
  if(!db.prepare('SELECT 1 FROM players WHERE id=?').get(playerId))throw new TypeError('player not found');
  const token=TOKEN_PREFIX+randomBytes(32).toString('base64url');
  const id='PAT-'+randomUUID();
  const createdAt=now.toISOString();
  const expiresAt=ttlDays?new Date(now.getTime()+ttlDays*86400000).toISOString():null;
  db.transaction(()=>{
    if(revokeExisting)db.prepare('UPDATE player_access_tokens SET revoked_at=? WHERE player_id=? AND revoked_at IS NULL').run(createdAt,playerId);
    db.prepare('INSERT INTO player_access_tokens(id,player_id,token_hash,created_at,expires_at,created_by,rotated_from_id) VALUES (?,?,?,?,?,?,?)').run(id,playerId,hashPlayerToken(token),createdAt,expiresAt,createdBy,rotatedFromId);
  })();
  return {token,tokenId:id,createdAt,expiresAt};
}

export function authenticatePlayerToken(db,token,{now=new Date(),touch=true}={}){
  if(typeof token!=='string'||!token.startsWith(TOKEN_PREFIX)||token.length<40)return null;
  const supplied=tokenDigest(token);
  const rows=db.prepare('SELECT id,player_id,token_hash,expires_at,revoked_at FROM player_access_tokens WHERE revoked_at IS NULL').all();
  const row=rows.find(candidate=>{
    const stored=Buffer.from(candidate.token_hash,'hex');
    return stored.length===supplied.length&&timingSafeEqual(stored,supplied);
  });
  if(!row||row.revoked_at||(row.expires_at&&new Date(row.expires_at)<=now))return null;
  if(touch)db.prepare('UPDATE player_access_tokens SET last_used_at=? WHERE id=?').run(now.toISOString(),row.id);
  return {playerId:row.player_id,tokenId:row.id};
}

export function revokePlayerTokens(db,playerId,{now=new Date()}={}){
  return db.prepare('UPDATE player_access_tokens SET revoked_at=? WHERE player_id=? AND revoked_at IS NULL').run(now.toISOString(),playerId).changes;
}

export function regeneratePlayerToken(db,playerId,{now=new Date(),ttlDays=365,createdBy='admin'}={}){
  const previous=db.prepare('SELECT id FROM player_access_tokens WHERE player_id=? AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1').get(playerId);
  return issuePlayerToken(db,playerId,{now,ttlDays,createdBy,revokeExisting:true,rotatedFromId:previous?.id||null});
}

export function createRateLimiter({limit=20,windowMs=60000,now=()=>Date.now()}={}){
  const buckets=new Map();
  return {consume(key){const at=now();let bucket=buckets.get(key);if(!bucket||at-bucket.startedAt>=windowMs){bucket={startedAt:at,count:0};buckets.set(key,bucket);}bucket.count+=1;return bucket.count<=limit?{allowed:true,remaining:limit-bucket.count}:{allowed:false,retryAfterSeconds:Math.max(1,Math.ceil((bucket.startedAt+windowMs-at)/1000))};},clear(){buckets.clear();}};
}
