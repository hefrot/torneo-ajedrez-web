const normalizeMode=value=>String(value||'unknown').trim().toLowerCase();

export function modeBucket(value){
  const mode=normalizeMode(value);
  if(['bullet','ultrabullet','ultra_bullet'].includes(mode))return 'bullet';
  if(mode==='blitz')return 'blitz';
  if(mode==='rapid')return 'rapid';
  if(['classical','correspondence','daily'].includes(mode))return 'slow';
  return 'other';
}

const emphasis={
  bullet:{label:'Speed / tactical',primary:['calculation','tactics','defense','time-pressure'],crossChecks:['strategy','endgames']},
  blitz:{label:'Fast practical',primary:['calculation','tactics','strategy','defense'],crossChecks:['endgames']},
  rapid:{label:'Balanced calculation',primary:['calculation','strategy','endgames','openings'],crossChecks:['tactics']},
  slow:{label:'Deep strategic',primary:['strategy','endgames','calculation','prophylaxis'],crossChecks:['tactics']},
  mixed:{label:'Mixed',primary:['calculation','strategy','tactics','endgames'],crossChecks:[]},
  unknown:{label:'Not enough games',primary:['calculation','strategy','tactics','endgames'],crossChecks:[]},
};

export function studentPlayStyleProfile(db,studentId,{limit=50}={}){
  const cap=Math.max(1,Math.min(50,Number(limit)||50));
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))return null;
  const rows=db.prepare(`SELECT platform,time_class AS timeClass,played_at AS playedAt,analysis_status AS analysisStatus
    FROM academic_external_games WHERE student_id=?
    ORDER BY COALESCE(played_at,created_at) DESC,created_at DESC LIMIT ?`).all(studentId,cap);
  const buckets={bullet:0,blitz:0,rapid:0,slow:0,other:0},rawModes={},platforms={};
  let analyzed=0;
  for(const row of rows){
    const raw=normalizeMode(row.timeClass),bucket=modeBucket(raw);
    buckets[bucket]+=1;rawModes[raw]=(rawModes[raw]||0)+1;platforms[row.platform]=(platforms[row.platform]||0)+1;
    if(row.analysisStatus==='analyzed')analyzed+=1;
  }
  const sampleSize=rows.length,entries=Object.entries(buckets).filter(([key])=>key!=='other').sort((a,b)=>b[1]-a[1]);
  const [topMode='other',topCount=0]=entries[0]||[];const secondCount=entries[1]?.[1]||0;
  const topShare=sampleSize?topCount/sampleSize:0;
  const style=sampleSize<10?'unknown':topCount===secondCount?'mixed':topShare>=0.5?topMode:'mixed';
  const confidence=sampleSize>=40?'high':sampleSize>=20?'medium':'low';
  const percentages=Object.fromEntries(Object.entries(buckets).map(([key,value])=>[key,sampleSize?Math.round(value*1000/sampleSize)/10:0]));
  return {
    studentId,targetSample:50,sampleSize,analyzedGames:analyzed,coverage:Math.round(sampleSize*100/50),
    sufficient:sampleSize>=20,confidence,style,dominantMode:style==='mixed'||style==='unknown'?null:style,
    dominantShare:Math.round(topShare*1000)/10,buckets,percentages,rawModes,platforms,
    assessmentEmphasis:emphasis[style]||emphasis.mixed,
    windowStart:rows.at(-1)?.playedAt||null,windowEnd:rows[0]?.playedAt||null,
  };
}
