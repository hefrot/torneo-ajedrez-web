export function getSeasonControl(db){
  return db.prepare('SELECT * FROM season_control WHERE id=1').get();
}

export function registrationIsOpen(db){
  return getSeasonControl(db)?.registration_state==='OPEN';
}

export function openRegistration(db,{now=new Date()}={}){
  if(db.prepare('SELECT COUNT(*) AS n FROM series').get().n>0)throw new Error('season already generated');
  db.prepare("UPDATE season_control SET registration_state='OPEN',season_status='REGISTRATION',registration_opened_at=?,registration_closed_at=NULL,roster_frozen_at=NULL WHERE id=1").run(now.toISOString());
  return getSeasonControl(db);
}

export function closeRegistration(db,{now=new Date()}={}){
  db.prepare("UPDATE season_control SET registration_state='CLOSED',registration_closed_at=?,roster_frozen_at=? WHERE id=1").run(now.toISOString(),now.toISOString());
  return getSeasonControl(db);
}

export function markSeasonStarted(db,{now=new Date()}={}){
  db.prepare("UPDATE season_control SET registration_state='CLOSED',season_status='STARTED',started_at=?,roster_frozen_at=COALESCE(roster_frozen_at,?) WHERE id=1").run(now.toISOString(),now.toISOString());
  return getSeasonControl(db);
}
