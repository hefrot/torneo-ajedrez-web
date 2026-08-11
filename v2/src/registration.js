import {createHash,randomUUID} from 'node:crypto';

export class RegistrationConflictError extends Error {
  constructor() {
    super('A registration for that platform username is already pending');
    this.code = 'REGISTRATION_CONFLICT';
  }
}

const normalizeUsername = value => String(value || '').trim().toLowerCase();
const accountHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function exactPlayer(db, platform, usernameNormalized) {
  const exactAccount = db.prepare(
    'SELECT player_id FROM player_accounts WHERE platform=? AND username_normalized=?'
  ).get(platform, usernameNormalized);
  if (exactAccount) return exactAccount.player_id;
  return db.prepare(
    'SELECT id AS player_id FROM players WHERE platform=? AND lower(username)=?'
  ).get(platform, usernameNormalized)?.player_id || null;
}

export function submitRegistration(db, input, {idFactory = randomUUID} = {}) {
  const name = String(input.name || '').trim();
  const platform = input.platform;
  const username = String(input.username || '').trim();
  const usernameNormalized = normalizeUsername(username);
  if (!name || !username || !['lichess','chesscom'].includes(platform)) throw new TypeError('name, platform and username are required');
  const requestId = 'REG-' + idFactory().slice(0, 12);
  const matchedPlayerId = exactPlayer(db, platform, usernameNormalized);
  const matchBasis = matchedPlayerId ? 'EXACT_PLATFORM_USERNAME' : 'NEW_PLATFORM_USERNAME';
  const requestStatus = matchedPlayerId ? 'pending_exact_candidate' : 'pending';
  try {
    db.transaction(() => {
      let playerId = matchedPlayerId;
      if (!playerId) {
        playerId = 'P-' + idFactory().slice(0, 12);
        db.prepare("INSERT INTO players (id,name,platform,username,whatsapp,country,registration_status) VALUES (?,?,?,?,?,?,'pending')").run(playerId,name,platform,username,input.whatsapp || null,input.country || null);
        db.prepare("INSERT INTO player_accounts (id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES (?,?,?,?,?,'pending','web_registration',?,NULL,NULL,?)").run('ACC-' + idFactory().slice(0, 12),playerId,platform,username,usernameNormalized,requestId,accountHash({requestId,platform,usernameNormalized}));
      }
      db.prepare('INSERT INTO registration_requests (id,name,platform,username,username_normalized,whatsapp,country,matched_player_id,match_basis,status) VALUES (?,?,?,?,?,?,?,?,?,?)').run(requestId,name,platform,username,usernameNormalized,input.whatsapp || null,input.country || null,playerId,matchBasis,requestStatus);
    })();
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw new RegistrationConflictError();
    throw error;
  }
  return {id:requestId,status:'pending_review'};
}

export function submitVerifiedRegistration(db,input,verification,{idFactory=randomUUID}={}) {
  const name=String(input.name||'').trim();
  const platform=input.platform;
  if(!verification?.verified||verification.platform!==platform)throw new TypeError('verified platform account is required');
  const username=String(verification.username||input.username||'').trim();
  const usernameNormalized=normalizeUsername(verification.usernameNormalized||username);
  if(!name||!username||!['lichess','chesscom'].includes(platform))throw new TypeError('name, platform and username are required');
  const requestId='REG-'+idFactory().slice(0,12);
  const matchedPlayerId=exactPlayer(db,platform,usernameNormalized);
  const existingPlayer=matchedPlayerId?db.prepare('SELECT registration_status FROM players WHERE id=?').get(matchedPlayerId):null;
  const matchedHistory=Boolean(existingPlayer&&existingPlayer.registration_status==='historical_unconfirmed');
  const matchBasis=matchedPlayerId?'EXACT_PLATFORM_USERNAME':'NEW_PLATFORM_USERNAME';
  db.transaction(()=>{
    let playerId=matchedPlayerId;
    if(!playerId){
      playerId='P-'+idFactory().slice(0,12);
      db.prepare("INSERT INTO players (id,name,platform,username,whatsapp,country,registration_status) VALUES (?,?,?,?,?,?,'registered')").run(playerId,name,platform,username,input.whatsapp||null,input.country||null);
      db.prepare("INSERT INTO player_accounts (id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES (?,?,?,?,?,'verified','web_registration',?,?,?,?)").run('ACC-'+idFactory().slice(0,12),playerId,platform,username,usernameNormalized,requestId,verification.verificationSource,verification.verifiedAt,accountHash({requestId,platform,usernameNormalized,verifiedAt:verification.verifiedAt}));
    }else{
      db.prepare("UPDATE players SET registration_status='registered', whatsapp=COALESCE(?,whatsapp) WHERE id=?").run(input.whatsapp||null,playerId);
      const updated=db.prepare("UPDATE player_accounts SET username=?,username_normalized=?,account_status='verified',verification_source=?,verified_at=? WHERE player_id=? AND platform=? AND username_normalized=?").run(username,usernameNormalized,verification.verificationSource,verification.verifiedAt,playerId,platform,usernameNormalized);
      if(!updated.changes)db.prepare("INSERT INTO player_accounts (id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES (?,?,?,?,?,'verified','web_registration',?,?,?,?)").run('ACC-'+idFactory().slice(0,12),playerId,platform,username,usernameNormalized,requestId,verification.verificationSource,verification.verifiedAt,accountHash({requestId,platform,usernameNormalized,verifiedAt:verification.verifiedAt}));
    }
    db.prepare('INSERT INTO registration_requests (id,name,platform,username,username_normalized,whatsapp,country,matched_player_id,match_basis,status,reviewed_at,reviewed_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(requestId,name,platform,username,usernameNormalized,input.whatsapp||null,input.country||null,playerId,matchBasis,'verified',verification.verifiedAt,'platform_api');
  })();
  return {id:requestId,status:'verified',playerId:matchedPlayerId||db.prepare('SELECT matched_player_id FROM registration_requests WHERE id=?').get(requestId).matched_player_id,platform,username,matchedHistory};
}

export function linkVerifiedAccount(db,playerId,verification,{idFactory=randomUUID}={}){
  if(!verification?.verified||!['lichess','chesscom'].includes(verification.platform))throw new TypeError('verified platform account is required');
  const player=db.prepare('SELECT id FROM players WHERE id=?').get(playerId);
  if(!player)throw new TypeError('player not found');
  const platform=verification.platform;
  const username=String(verification.username||'').trim();
  const usernameNormalized=normalizeUsername(verification.usernameNormalized||username);
  const owner=db.prepare('SELECT player_id FROM player_accounts WHERE platform=? AND username_normalized=?').get(platform,usernameNormalized);
  if(owner&&owner.player_id!==playerId)throw new RegistrationConflictError();
  const existing=db.prepare('SELECT id FROM player_accounts WHERE player_id=? AND platform=? AND username_normalized=?').get(playerId,platform,usernameNormalized);
  if(existing){
    db.prepare("UPDATE player_accounts SET username=?,account_status='verified',verification_source=?,verified_at=? WHERE id=?").run(username,verification.verificationSource,verification.verifiedAt,existing.id);
  }else{
    const sourceRecordId='ADMIN-LINK-'+idFactory().slice(0,12);
    db.prepare("INSERT INTO player_accounts (id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES (?,?,?,?,?,'verified','admin_link',?,?,?,?)").run('ACC-'+idFactory().slice(0,12),playerId,platform,username,usernameNormalized,sourceRecordId,verification.verificationSource,verification.verifiedAt,accountHash({playerId,platform,usernameNormalized,verifiedAt:verification.verifiedAt}));
  }
  return {playerId,platform,username,status:'verified'};
}
