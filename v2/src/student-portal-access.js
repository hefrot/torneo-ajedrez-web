import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';

const digest=value=>createHash('sha256').update(String(value||'')).digest();
const hash=value=>digest(value).toString('hex');
const slug=value=>String(value||'student').normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase()||'student';
const accessCode=()=>`HC-${randomBytes(12).toString('base64url')}`;
const sessionToken=()=>`hps_${randomBytes(32).toString('base64url')}`;

export function createPortalAccount(db,{studentIds=[],role='guardian',displayName,loginName=null,preferredLocale='en',ttlDays=365}={}){
  if(!['guardian','student'].includes(role))throw new TypeError('invalid portal role');
  const locale=String(preferredLocale||'en').toLowerCase();if(!['en','es'].includes(locale))throw new TypeError('invalid preferredLocale');
  if(!Array.isArray(studentIds)||!studentIds.length)throw new TypeError('studentIds required');
  for(const studentId of studentIds)if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))throw new TypeError('student not found');
  const accountId=`PORTAL-${randomUUID()}`;
  const login=(loginName||`${slug(displayName)}-${randomBytes(3).toString('hex')}`).toLowerCase();
  const code=accessCode(); const now=new Date();
  const expiresAt=ttlDays?new Date(now.getTime()+ttlDays*86400000).toISOString():null;
  db.transaction(()=>{
    db.prepare('INSERT INTO portal_accounts(id,login_name,display_name,role,preferred_locale) VALUES (?,?,?,?,?)').run(accountId,login,String(displayName||'').trim()||login,role,locale);
    const link=db.prepare('INSERT INTO portal_account_students(account_id,student_id) VALUES (?,?)');
    for(const studentId of studentIds)link.run(accountId,studentId);
    db.prepare('INSERT INTO portal_access_codes(id,account_id,code_hash,created_at,expires_at) VALUES (?,?,?,?,?)').run(`PAC-${randomUUID()}`,accountId,hash(code),now.toISOString(),expiresAt);
  })();
  return {accountId,loginName:login,accessCode:code,preferredLocale:locale,expiresAt,warning:'El código se muestra una sola vez.'};
}
export function loginPortalAccount(db,{loginName,accessCode:code,now=new Date(),sessionDays=30}={}){
  const account=db.prepare("SELECT id,login_name,display_name,role,preferred_locale FROM portal_accounts WHERE lower(login_name)=lower(?) AND status='active'").get(String(loginName||'').trim());
  if(!account||!code)return null;
  const supplied=digest(code);
  const candidates=db.prepare('SELECT id,code_hash,expires_at,revoked_at FROM portal_access_codes WHERE account_id=? AND revoked_at IS NULL ORDER BY created_at DESC').all(account.id);
  const credential=candidates.find(row=>{const stored=Buffer.from(row.code_hash,'hex');return stored.length===supplied.length&&timingSafeEqual(stored,supplied);});
  if(!credential||(credential.expires_at&&new Date(credential.expires_at)<=now))return null;
  db.prepare('UPDATE portal_access_codes SET last_used_at=? WHERE id=?').run(now.toISOString(),credential.id);
  const token=sessionToken(),sessionId=`PSES-${randomUUID()}`,expiresAt=new Date(now.getTime()+sessionDays*86400000).toISOString();
  db.prepare('INSERT INTO portal_sessions(id,account_id,token_hash,created_at,expires_at) VALUES (?,?,?,?,?)').run(sessionId,account.id,hash(token),now.toISOString(),expiresAt);
  return {sessionToken:token,expiresAt,account:{id:account.id,loginName:account.login_name,displayName:account.display_name,role:account.role,preferredLocale:account.preferred_locale||'en'}};
}

export function authenticatePortalSession(db,token,{now=new Date(),touch=true}={}){
  if(typeof token!=='string'||!token.startsWith('hps_'))return null;
  const supplied=digest(token),rows=db.prepare(`SELECT ps.id,ps.account_id,ps.token_hash,ps.expires_at,pa.role,pa.display_name,pa.preferred_locale FROM portal_sessions ps JOIN portal_accounts pa ON pa.id=ps.account_id WHERE ps.revoked_at IS NULL AND pa.status='active'`).all();
  const row=rows.find(candidate=>{const stored=Buffer.from(candidate.token_hash,'hex');return stored.length===supplied.length&&timingSafeEqual(stored,supplied);});
  if(!row||(row.expires_at&&new Date(row.expires_at)<=now))return null;
  if(touch)db.prepare('UPDATE portal_sessions SET last_used_at=? WHERE id=?').run(now.toISOString(),row.id);
  return {accountId:row.account_id,role:row.role,displayName:row.display_name,preferredLocale:row.preferred_locale||'en',sessionId:row.id};
}
export function regeneratePortalCode(db,accountId,{ttlDays=365,now=new Date()}={}){
  if(!db.prepare("SELECT 1 FROM portal_accounts WHERE id=? AND status='active'").get(accountId))throw new TypeError('portal account not found');
  const code=accessCode(),expiresAt=ttlDays?new Date(now.getTime()+ttlDays*86400000).toISOString():null;
  db.transaction(()=>{
    db.prepare('UPDATE portal_access_codes SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL').run(now.toISOString(),accountId);
    db.prepare('UPDATE portal_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL').run(now.toISOString(),accountId);
    db.prepare('INSERT INTO portal_access_codes(id,account_id,code_hash,created_at,expires_at) VALUES (?,?,?,?,?)').run(`PAC-${randomUUID()}`,accountId,hash(code),now.toISOString(),expiresAt);
  })();
  return {accountId,accessCode:code,expiresAt,warning:'El código anterior y las sesiones activas quedaron revocados.'};
}

export function portalAccountStudents(db,accountId){
  return db.prepare(`SELECT s.id,s.display_name AS displayName,s.status,s.current_level AS currentLevel,s.target_level AS targetLevel FROM portal_account_students pas JOIN students s ON s.id=pas.student_id WHERE pas.account_id=? ORDER BY s.display_name`).all(accountId);
}


export function setPortalPreferredLocale(db,accountId,preferredLocale){
  const locale=String(preferredLocale||'').toLowerCase();if(!['en','es'].includes(locale))throw new TypeError('invalid preferredLocale');
  const result=db.prepare("UPDATE portal_accounts SET preferred_locale=? WHERE id=? AND status='active'").run(locale,accountId);if(!result.changes)throw new TypeError('portal account not found');
  return {accountId,preferredLocale:locale};
}
