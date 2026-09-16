import {createHash,randomUUID} from 'node:crypto';
import {linkVerifiedAccount,RegistrationConflictError} from './registration.js';

const normalize=value=>String(value||'').trim().toLowerCase();
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function linkStudentVerifiedAccount(db,studentId,verification){
  if(!verification?.verified||!['lichess','chesscom'].includes(verification.platform))throw new TypeError('verified platform account is required');
  const student=db.prepare('SELECT id,display_name AS displayName,player_id AS playerId FROM students WHERE id=?').get(studentId);
  if(!student)throw new TypeError('student not found');
  const platform=verification.platform,username=String(verification.username||'').trim(),usernameNormalized=normalize(verification.usernameNormalized||username);
  let owner=db.prepare('SELECT player_id AS playerId FROM player_accounts WHERE platform=? AND username_normalized=?').get(platform,usernameNormalized);
  if(!owner)owner=db.prepare('SELECT id AS playerId FROM players WHERE platform=? AND lower(username)=?').get(platform,usernameNormalized);
  if(student.playerId){
    if(owner&&owner.playerId!==student.playerId)throw new RegistrationConflictError();
    const linked=linkVerifiedAccount(db,student.playerId,verification);
    db.prepare(`INSERT INTO account_verification_state(account_id,profile_verified,profile_verification_source,profile_verified_at,ownership_verification,updated_at)
      SELECT id,1,?,?,COALESCE((SELECT ownership_verification FROM account_verification_state WHERE account_id=player_accounts.id),'pending'),CURRENT_TIMESTAMP FROM player_accounts WHERE player_id=? AND platform=? AND username_normalized=?
      ON CONFLICT(account_id) DO UPDATE SET profile_verified=1,profile_verification_source=excluded.profile_verification_source,profile_verified_at=excluded.profile_verified_at,updated_at=CURRENT_TIMESTAMP`)
      .run(verification.verificationSource,verification.verifiedAt,student.playerId,platform,usernameNormalized);
    return {...linked,studentId};
  }
  if(owner){
    const used=db.prepare('SELECT id FROM students WHERE player_id=? AND id<>?').get(owner.playerId,studentId);
    if(used)throw new RegistrationConflictError();
    db.prepare('UPDATE students SET player_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(owner.playerId,studentId);
    return {studentId,playerId:owner.playerId,platform,username,status:'linked_existing'};
  }
  const playerId=`P-${randomUUID().slice(0,12)}`,accountId=`ACC-${randomUUID().slice(0,12)}`,sourceId=`ACADEMIC-${randomUUID().slice(0,12)}`;
  db.transaction(()=>{
    db.prepare("INSERT INTO players(id,name,platform,username,registration_status) VALUES (?,?,?,?,'academic_only')").run(playerId,student.displayName,platform,username);
    db.prepare(`INSERT INTO player_accounts(id,player_id,platform,username,username_normalized,account_status,source_system,source_record_id,verification_source,verified_at,source_sha256)
      VALUES (?,?,?,?,?,'verified','academic_link',?,?,?,?)`).run(accountId,playerId,platform,username,usernameNormalized,sourceId,verification.verificationSource,verification.verifiedAt,sha({studentId,platform,usernameNormalized,verifiedAt:verification.verifiedAt}));
    db.prepare(`INSERT INTO account_verification_state(account_id,profile_verified,profile_verification_source,profile_verified_at,ownership_verification,updated_at)
      VALUES (?,1,?,?,'pending',CURRENT_TIMESTAMP)`).run(accountId,verification.verificationSource,verification.verifiedAt);
    db.prepare('UPDATE students SET player_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(playerId,studentId);
  })();
  return {studentId,playerId,platform,username,status:'linked_new_academic_player'};
}
