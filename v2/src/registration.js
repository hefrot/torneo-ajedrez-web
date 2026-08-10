import {createHash,randomUUID} from 'node:crypto';

export class RegistrationConflictError extends Error {
  constructor() {
    super('A registration for that platform username is already pending');
    this.code = 'REGISTRATION_CONFLICT';
  }
}

const normalizeUsername = value => String(value || '').trim().toLowerCase();

const accountHash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function submitRegistration(db, input, {idFactory = randomUUID} = {}) {
  const name = String(input.name || '').trim();
  const platform = input.platform;
  const username = String(input.username || '').trim();
  const usernameNormalized = normalizeUsername(username);
  if (!name || !username || !['lichess','chesscom'].includes(platform)) {
    throw new TypeError('name, platform and username are required');
  }

  const requestId = 'REG-' + idFactory().slice(0, 12);
  const exactAccount = db.prepare(
    'SELECT player_id FROM player_accounts WHERE platform=? AND username_normalized=?'
  ).get(platform, usernameNormalized);
  const exactPrimary = exactAccount || db.prepare(
    'SELECT id AS player_id FROM players WHERE platform=? AND lower(username)=?'
  ).get(platform, usernameNormalized);
  const matchedPlayerId = exactPrimary ? exactPrimary.player_id : null;
  const matchBasis = matchedPlayerId ? 'EXACT_PLATFORM_USERNAME' : 'NEW_PLATFORM_USERNAME';
  const requestStatus = matchedPlayerId ? 'pending_exact_candidate' : 'pending';

  try {
    db.transaction(() => {
      let playerId = matchedPlayerId;
      if (!playerId) {
        playerId = 'P-' + idFactory().slice(0, 12);
        db.prepare(
          "INSERT INTO players (id,name,platform,username,whatsapp,country,registration_status) VALUES (?,?,?,?,?,?,'pending')"
        ).run(playerId,name,platform,username,input.whatsapp || null,input.country || null);
        db.prepare(
          "INSERT INTO player_accounts (id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256) VALUES (?,?,?,?,?,'pending','web_registration',?,NULL,NULL,?)"
        ).run('ACC-' + idFactory().slice(0, 12),playerId,platform,username,usernameNormalized,requestId,accountHash({requestId,platform,usernameNormalized}));
      }

      db.prepare(
        'INSERT INTO registration_requests (id,name,platform,username,username_normalized,whatsapp,country,matched_player_id,match_basis,status) VALUES (?,?,?,?,?,?,?,?,?,?)'
      ).run(requestId,name,platform,username,usernameNormalized,input.whatsapp || null,input.country || null,playerId,matchBasis,requestStatus);
    })();
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw new RegistrationConflictError();
    throw error;
  }

  return {id:requestId,status:'pending_review'};
}
