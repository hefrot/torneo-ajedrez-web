const pacificDate=now=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const sumRecord=record=>['win','wins','loss','losses','draw','draws'].reduce((n,key)=>n+(Number(record?.[key])||0),0);

export function lichessRatings(profile){
  const keys=['rapid','blitz','bullet','classical','correspondence'];
  return keys.flatMap(type=>{
    const perf=profile?.perfs?.[type];
    return Number.isFinite(perf?.rating)?[{ratingType:type,rating:perf.rating,gamesCount:Number(perf.games)||null}]:[];
  });
}

export function chessComRatings(stats){
  const keys=['chess_rapid','chess_blitz','chess_bullet','chess_daily'];
  return keys.flatMap(type=>{
    const item=stats?.[type];
    const rating=item?.last?.rating;
    return Number.isFinite(rating)?[{ratingType:type.replace('chess_',''),rating,gamesCount:sumRecord(item?.record)||null}]:[];
  });
}

export function saveDailyRatings(db,account,ratings,{now=new Date()}={}){
  const day=pacificDate(now),capturedAt=now.toISOString();
  const upsert=db.prepare(`INSERT INTO external_rating_snapshots(account_id,player_id,platform,rating_type,rating,games_count,snapshot_date,captured_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(account_id,rating_type,snapshot_date) DO UPDATE SET rating=excluded.rating,games_count=excluded.games_count,captured_at=excluded.captured_at`);
  let saved=0; for(const row of ratings){upsert.run(account.accountId,account.playerId,account.platform,row.ratingType,row.rating,row.gamesCount??null,day,capturedAt);saved+=1;}
  return saved;
}
export async function syncAcademicRatings(db,{lichessClient,chessComClient,now=new Date()}={}){
  const accounts=db.prepare(`SELECT DISTINCT pa.id AS accountId,pa.player_id AS playerId,pa.platform,pa.username
    FROM students s JOIN player_accounts pa ON pa.player_id=s.player_id
    WHERE s.status='active' AND pa.account_status='verified' AND pa.verified_at IS NOT NULL
    ORDER BY pa.platform,pa.username`).all();
  let refreshed=0,snapshots=0,errors=0;
  for(const account of accounts){
    try{
      let rows=[];
      if(account.platform==='lichess'&&lichessClient)rows=lichessRatings(await lichessClient.getUser(account.username));
      if(account.platform==='chesscom'&&chessComClient)rows=chessComRatings(await chessComClient.getStats(account.username));
      snapshots+=saveDailyRatings(db,account,rows,{now}); refreshed+=1;
    }catch{errors+=1;}
  }
  return {accounts:accounts.length,refreshed,snapshots,errors};
}

export function studentRatingProgress(db,studentId){
  const student=db.prepare('SELECT id,player_id AS playerId FROM students WHERE id=?').get(studentId);
  if(!student)return null;
  if(!student.playerId)return {studentId,accounts:[],series:[]};
  const accounts=db.prepare(`SELECT id,platform,username FROM player_accounts WHERE player_id=? AND account_status='verified' ORDER BY platform,username`).all(student.playerId);
  const rows=db.prepare(`SELECT ers.account_id AS accountId,ers.platform,pa.username,ers.rating_type AS ratingType,ers.rating,ers.games_count AS gamesCount,ers.snapshot_date AS snapshotDate,ers.captured_at AS capturedAt
    FROM external_rating_snapshots ers JOIN player_accounts pa ON pa.id=ers.account_id
    WHERE ers.player_id=? ORDER BY ers.platform,pa.username,ers.rating_type,ers.snapshot_date`).all(student.playerId);
  const groups=new Map();
  for(const row of rows){const key=`${row.accountId}:${row.ratingType}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
  const series=[...groups.values()].map(points=>({platform:points[0].platform,username:points[0].username,ratingType:points[0].ratingType,firstRating:points[0].rating,latestRating:points.at(-1).rating,delta:points.at(-1).rating-points[0].rating,points}));
  return {studentId,accounts,series};
}
