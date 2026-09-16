import {createHash,randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';

const SESSION_PREFIX='hcs_';
const tokenHash=value=>createHash('sha256').update(String(value||'')).digest('hex');
const passwordHash=(password,salt)=>scryptSync(String(password||''),salt,64).toString('hex');
const generatedPassword=()=>`HC-${randomBytes(15).toString('base64url')}`;
const cleanLogin=value=>String(value||'').trim().toLowerCase();

export function createStaffAccount(db,{loginName,displayName,role='coach',password=null}={}){
  const login=cleanLogin(loginName);if(!login)throw new TypeError('loginName required');
  if(!['admin','coach'].includes(role))throw new TypeError('invalid staff role');
  if(db.prepare('SELECT 1 FROM staff_accounts WHERE lower(login_name)=lower(?)').get(login))throw new TypeError('staff login already exists');
  const plain=password||generatedPassword();if(String(plain).length<10)throw new TypeError('password must be at least 10 characters');
  const salt=randomBytes(16).toString('hex'),id=`STAFF-${randomUUID()}`;
  db.prepare('INSERT INTO staff_accounts(id,login_name,display_name,role,password_salt,password_hash) VALUES (?,?,?,?,?,?)').run(id,login,String(displayName||login).trim(),role,salt,passwordHash(plain,salt));
  return {id,loginName:login,displayName:String(displayName||login).trim(),role,password:plain,warning:'Password shown once. Store it securely.'};
}

export function loginStaffAccount(db,{loginName,password,now=new Date(),sessionDays=7}={}){
  const row=db.prepare("SELECT id,login_name AS loginName,display_name AS displayName,role,password_salt AS salt,password_hash AS passwordHash FROM staff_accounts WHERE lower(login_name)=lower(?) AND status='active'").get(cleanLogin(loginName));
  if(!row||!password)return null;
  const supplied=Buffer.from(passwordHash(password,row.salt),'hex'),stored=Buffer.from(row.passwordHash,'hex');
  if(stored.length!==supplied.length||!timingSafeEqual(stored,supplied))return null;
  const token=SESSION_PREFIX+randomBytes(32).toString('base64url'),id=`SSES-${randomUUID()}`,createdAt=now.toISOString(),expiresAt=new Date(now.getTime()+sessionDays*86400000).toISOString();
  db.prepare('INSERT INTO staff_sessions(id,account_id,token_hash,created_at,expires_at) VALUES (?,?,?,?,?)').run(id,row.id,tokenHash(token),createdAt,expiresAt);
  return {sessionToken:token,expiresAt,account:{id:row.id,loginName:row.loginName,displayName:row.displayName,role:row.role}};
}

export function authenticateStaffSession(db,token,{now=new Date(),touch=true}={}){
  if(typeof token!=='string'||!token.startsWith(SESSION_PREFIX))return null;
  const hash=tokenHash(token);
  const row=db.prepare(`SELECT ss.id AS sessionId,ss.account_id AS accountId,ss.expires_at AS expiresAt,sa.login_name AS loginName,sa.display_name AS displayName,sa.role
    FROM staff_sessions ss JOIN staff_accounts sa ON sa.id=ss.account_id
    WHERE ss.token_hash=? AND ss.revoked_at IS NULL AND sa.status='active'`).get(hash);
  if(!row||(row.expiresAt&&new Date(row.expiresAt)<=now))return null;
  if(touch)db.prepare('UPDATE staff_sessions SET last_used_at=? WHERE id=?').run(now.toISOString(),row.sessionId);
  return {sessionId:row.sessionId,accountId:row.accountId,loginName:row.loginName,displayName:row.displayName,role:row.role};
}
export function revokeStaffSession(db,sessionId,{now=new Date()}={}){
  return db.prepare('UPDATE staff_sessions SET revoked_at=? WHERE id=? AND revoked_at IS NULL').run(now.toISOString(),sessionId).changes;
}
export function listStaffAccounts(db){
  return db.prepare(`SELECT id,login_name AS loginName,display_name AS displayName,role,status,created_at AS createdAt,updated_at AS updatedAt FROM staff_accounts ORDER BY display_name`).all();
}
export function resetStaffPassword(db,staffId,{password=null,now=new Date()}={}){
  if(!db.prepare('SELECT 1 FROM staff_accounts WHERE id=?').get(staffId))throw new TypeError('staff account not found');
  const plain=password||generatedPassword();if(String(plain).length<10)throw new TypeError('password must be at least 10 characters');
  const salt=randomBytes(16).toString('hex');
  db.transaction(()=>{db.prepare('UPDATE staff_accounts SET password_salt=?,password_hash=?,updated_at=? WHERE id=?').run(salt,passwordHash(plain,salt),now.toISOString(),staffId);db.prepare('UPDATE staff_sessions SET revoked_at=? WHERE account_id=? AND revoked_at IS NULL').run(now.toISOString(),staffId);})();
  return {staffId,password:plain,warning:'Previous sessions were revoked. Password shown once.'};
}
