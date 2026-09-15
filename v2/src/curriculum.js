const SEEDS_SOURCE='1MidzxsD83mLc5nYGlYPyFgH5eyBrZYN4z-J2VgmozBs';

export const seedsLessons=[
  {n:1,title:'The Chessboard (Files & Ranks)',domain:'fundamentals',focus:'Board setup, files, ranks, square names, piece names and pawn movement',homework:null},
  {n:2,title:'The Bishop',domain:'fundamentals',focus:'Diagonal movement, captures, blocked paths and piece value',homework:'Bishop movement sheet'},
  {n:3,title:'The Knight',domain:'fundamentals',focus:'L-shape movement, jumping and center activity',homework:'Knight movement sheet'},
  {n:4,title:'The Rook',domain:'fundamentals',focus:'Files, ranks, straight-line movement and no jumping',homework:'Rook movement sheet'},
  {n:5,title:'The Queen',domain:'fundamentals',focus:'Queen as rook plus bishop; movement, captures and value',homework:'Queen movement sheet'},
  {n:6,title:'Check: King in Danger',domain:'thinking',focus:'King movement, check recognition and CBR: Capture, Block, Run',homework:'Check or Safe? positions'},
  {n:7,title:'Check vs Checkmate',domain:'thinking',focus:'Check vs checkmate, CBR drill and Italian Opening introduction',homework:'Check vs Checkmate sheet'},
  {n:8,title:"Opening Traps: Scholar's & Fool's Mate",domain:'openings',focus:'Recognize both traps and defend Scholar’s Mate with g6 and Nf6',homework:'Check vs Checkmate + Mate in 1'},
  {n:9,title:'Opening Rules (CCC)',domain:'openings',focus:'Control center, Castle, Connect rooks; Italian, back-rank mate and battery',homework:'CCC positions sheet'},
  {n:10,title:'Queen vs King Checkmate',domain:'endgames',focus:'No checks, knight-move distance, copycat, trap king, queen in front; avoid stalemate',homework:null}
];

const skillId=n=>`SKILL-SEEDS-L${n}`;
const lessonId=n=>`LESSON-SEEDS-L${n}`;

export function seedSeedsCurriculum(db){
  db.prepare(`INSERT INTO curriculum_tracks(id,code,title,stage,age_range,lesson_count,default_duration_minutes,main_focus,sequence_no,active) VALUES ('TRACK-SEEDS','seeds','Seeds','Beginner','4–7',10,60,'Board and pieces; check/checkmate; beginner openings; Queen vs King endgame',1,1) ON CONFLICT(id) DO UPDATE SET active=1`).run();
  const upsertSkill=db.prepare(`INSERT INTO curriculum_skills(id,code,title,track_id,domain,rating_min,rating_max,mastery_criteria,active)
    VALUES (@id,@code,@title,'TRACK-SEEDS',@domain,0,600,@mastery,1)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,track_id=excluded.track_id,domain=excluded.domain,mastery_criteria=excluded.mastery_criteria,active=1`);
  const upsertLesson=db.prepare(`INSERT INTO lessons(id,skill_id,title,objective,duration_minutes,difficulty,content_json,active)
    VALUES (@id,@skillId,@title,@objective,60,'Seeds',@content,1)
    ON CONFLICT(id) DO UPDATE SET skill_id=excluded.skill_id,title=excluded.title,objective=excluded.objective,duration_minutes=excluded.duration_minutes,difficulty=excluded.difficulty,content_json=excluded.content_json,active=1`);
  const dependency=db.prepare(`INSERT OR IGNORE INTO curriculum_skill_dependencies(skill_id,prerequisite_skill_id,dependency_type) VALUES (?,?, 'required')`);
  db.transaction(()=>{
    for(const row of seedsLessons){
      upsertSkill.run({id:skillId(row.n),code:`SEEDS-L${row.n}`,title:row.title,domain:row.domain,mastery:`Student can demonstrate the core objective of Seeds lesson ${row.n} independently.`});
      upsertLesson.run({id:lessonId(row.n),skillId:skillId(row.n),title:`Seeds L${row.n} — ${row.title}`,objective:row.focus,content:JSON.stringify({track:'Seeds',lessonNumber:row.n,focus:row.focus,homework:row.homework,sourceDocumentId:SEEDS_SOURCE})});
      if(row.n>1)dependency.run(skillId(row.n),skillId(row.n-1));
    }
  })();
  return {track:'Seeds',skills:seedsLessons.length,lessons:seedsLessons.length};
}

export function listCurriculum(db){
  const tracks=db.prepare(`SELECT id,code,title,stage,age_range AS ageRange,lesson_count AS lessonCount,default_duration_minutes AS defaultDurationMinutes,main_focus AS mainFocus FROM curriculum_tracks WHERE active=1 ORDER BY sequence_no`).all();
  const lessons=db.prepare(`SELECT l.id,l.title,l.objective,l.duration_minutes AS durationMinutes,l.content_json AS contentJson,cs.code AS skillCode,ct.code AS trackCode FROM lessons l LEFT JOIN curriculum_skills cs ON cs.id=l.skill_id LEFT JOIN curriculum_tracks ct ON ct.id=cs.track_id WHERE l.active=1 ORDER BY ct.sequence_no,CAST(substr(cs.code,instr(cs.code,'-L')+2) AS INTEGER)`).all().map(row=>({...row,content:JSON.parse(row.contentJson||'{}')}));
  return {tracks,lessons};
}

const legacySkillId=(trackCode,n)=>trackCode==='seeds'?skillId(n):genericSkillId(trackCode,n);
const legacyLessonId=(trackCode,n)=>trackCode==='seeds'?lessonId(n):genericLessonId(trackCode,n);
const legacyLessons=trackCode=>trackCode==='seeds'?seedsLessons:trackConfigs[trackCode]?.lessons;

export function recordLegacyLessonEvidence(db,{studentId,trackCode='seeds',lessonNumber,status='introduced',evidence={}}){
  const n=Number(lessonNumber),rows=legacyLessons(trackCode); if(!rows||!rows.some(r=>r.n===n))throw new TypeError('invalid legacy lesson');
  const skill=legacySkillId(trackCode,n);
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))throw new TypeError('student not found');
  if(!db.prepare('SELECT 1 FROM curriculum_skills WHERE id=?').get(skill))throw new TypeError('skill not found');
  const allowed=new Set(['unseen','introduced','practicing','drill_mastered','applied_in_game','regressed']);
  if(!allowed.has(status))throw new TypeError('invalid skill status');
  db.prepare(`INSERT INTO student_skills(student_id,skill_id,status,evidence_json,last_assessed_at,updated_at)
    VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(student_id,skill_id) DO UPDATE SET status=excluded.status,evidence_json=excluded.evidence_json,last_assessed_at=excluded.last_assessed_at,updated_at=CURRENT_TIMESTAMP`)
    .run(studentId,skill,status,JSON.stringify(evidence||{}));
  return {studentId,trackCode,skillId:skill,status};
}

export function recordStudentLessonEvidence(db,input={}){return recordLegacyLessonEvidence(db,{...input,trackCode:'seeds'});}

export function recommendNextLegacyLesson(db,studentId,trackCode='seeds'){
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))return null;
  const rows=legacyLessons(trackCode);if(!rows)return null;
  for(const row of rows){
    const sid=legacySkillId(trackCode,row.n);const state=db.prepare('SELECT status FROM student_skills WHERE student_id=? AND skill_id=?').get(studentId,sid);
    if(!state||state.status==='unseen'||state.status==='regressed')return db.prepare(`SELECT l.id,l.title,l.objective,l.duration_minutes AS durationMinutes FROM lessons l WHERE l.id=?`).get(legacyLessonId(trackCode,row.n));
  }
  return null;
}
export function recommendNextSeedsLesson(db,studentId){return recommendNextLegacyLesson(db,studentId,'seeds');}

export function assignLessonToSession(db,{sessionId,lessonId:targetLessonId,deliveryStage='theory_only'}){
  if(!db.prepare('SELECT 1 FROM class_sessions WHERE id=?').get(sessionId))throw new TypeError('session not found');
  if(!db.prepare('SELECT 1 FROM lessons WHERE id=?').get(targetLessonId))throw new TypeError('lesson not found');
  db.prepare(`INSERT INTO session_lessons(session_id,lesson_id,sequence_no,delivery_stage) VALUES (?,?,1,?)
    ON CONFLICT(session_id,lesson_id) DO UPDATE SET delivery_stage=excluded.delivery_stage`).run(sessionId,targetLessonId,deliveryStage);
  return {sessionId,lessonId:targetLessonId,deliveryStage};
}

const BUILDERS_SOURCE='14DE2Gi6eriNGq4b8d0bvFPuXTWdy6_t9sQX7VSnGbFE';
const THINKERS_SOURCE='1G3sUZIF5443agxa3gI2tEwnJ6gc8Fc75_P8KXgCKsRc';

export const buildersLessons=[
  {n:1,title:"Easy Win: Opening Traps (Scholar's Mate)",pillar:'Tactics',domain:'tactics',focus:"Scholar's Mate + Fool's Mate; learn the trap and how to stop it."},
  {n:2,title:"Opening Rules (CCC): Italian + Queen's Gambit",pillar:'Openings',domain:'openings',focus:'Center, Castle, Connect Rooks; Italian move by move; back-rank mate intro.'},
  {n:3,title:'Tactics Lab: Forks (Double Attack)',pillar:'Tactics',domain:'tactics',focus:'Attack two pieces at once; knight forks, queen forks and defending double attacks.'},
  {n:4,title:'Strategy Ideas 1: Material',pillar:'Strategy',domain:'strategy',focus:'Piece values; when to trade, when to keep and how to choose the best trade.'},
  {n:5,title:'Checkmate Skills 1: Ladder Mate',pillar:'Tactics',domain:'tactics',focus:'Cut off the king, drive it to the edge and avoid stalemate.'},
  {n:6,title:'Chess History 1: Chess Origins & Opera Game',pillar:'History',domain:'thinking',focus:"Chess origins and Morphy's Opera Game; reinforce forks."},
  {n:7,title:'Tactics Lab: Pin to Win',pillar:'Tactics',domain:'tactics',focus:'Absolute vs relative pins; win material from pinned pieces.'},
  {n:8,title:'Strategy Ideas 2: Safety (Activity)',pillar:'Strategy',domain:'strategy',focus:'Piece freedom, restriction and activity; reinforce pin patterns.'},
  {n:9,title:'Tactics Lab: Skewers',pillar:'Tactics',domain:'tactics',focus:'Attack through a valuable piece with diagonal and file skewers.'},
  {n:10,title:'Checkmate Skills 2: Queen vs King',pillar:'Tactics',domain:'endgames',focus:'Drive king to edge; box method; queen and king coordination.'},
  {n:11,title:'World Champions: Steinitz & Lasker',pillar:'History',domain:'thinking',focus:"First official World Champions; Steinitz's positional revolution and Lasker's long reign."},
  {n:12,title:'Discovered Check',pillar:'Tactics',domain:'tactics',focus:'Move one piece to reveal an attack from behind; use discovered check to win material.'},
  {n:13,title:'Strategy Ideas 3: King Safety (Activity)',pillar:'Strategy',domain:'strategy',focus:'Protect the castled king, identify weak squares and attack an unsafe king.'},
  {n:14,title:'Double Check',pillar:'Tactics',domain:'tactics',focus:'Two pieces check at once; understand why the king must move and use forcing sequences.'},
  {n:15,title:'Ladder Mate: Rook vs King',pillar:'Tactics',domain:'endgames',focus:'Drive the king to the edge with rook + king coordination; extend to queen + rook.'},
  {n:16,title:'World Champions: Mikhail Tal — The Magician',pillar:'History',domain:'thinking',focus:'Tal, initiative and sacrifice; reinforce double-check patterns.'},
  {n:17,title:'Double Attack to Mate',pillar:'Tactics',domain:'tactics',focus:'Combine double attack with a mating threat and calculate forcing sequences.'},
  {n:18,title:'Down the Last Pawn',pillar:'Endgames',domain:'endgames',focus:'King + pawn vs king; king support, opposition, win/draw recognition and stalemate.'},
  {n:19,title:'Mate in 2',pillar:'Tactics',domain:'calculation',focus:'Calculate a forcing first move and the required response before delivering mate.'},
  {n:20,title:'The Soviet School',pillar:'History',domain:'thinking',focus:'How the Soviet chess system shaped Botvinnik, Tal, Petrosian, Spassky, Karpov and Kasparov.'},
];

export const thinkersLessons=[
  {n:1,title:'Checkmate Review',pillar:'Tactics',domain:'tactics',focus:'Q+R mate, queen vs king and rook vs king as a bridge from Builders.'},
  {n:2,title:'Forks & Pins: Level Up',pillar:'Tactics',domain:'tactics',focus:'Multi-step forks, cross-pins and winning pinned pieces.'},
  {n:3,title:'Skewer',pillar:'Tactics',domain:'tactics',focus:'Long-range diagonal and file skewers with calculation.'},
  {n:4,title:'Tempo & Initiative',pillar:'Strategy',domain:'strategy',focus:'Gain time, maintain pressure and prevent the opponent from consolidating.'},
  {n:5,title:'World Champions: William Steinitz',pillar:'History + Tactic',domain:'tactics',focus:'Steinitz and positional chess; introduce Remove the Defender.'},
  {n:6,title:'Discovered Attack & Discovered Check',pillar:'Tactics',domain:'tactics',focus:'Pattern recognition plus calculation: moving piece versus revealed attacker.'},
  {n:7,title:'Double Check (Mate in 2)',pillar:'Tactics',domain:'calculation',focus:'Use double check inside forcing mating sequences.'},
  {n:8,title:'Pawn Structure & Weak Pawns',pillar:'Strategy',domain:'strategy',focus:'Doubled, isolated and passed pawns; weak squares and structure-based planning.'},
  {n:9,title:'Pawn vs King / Square of the Pawn',pillar:'Endgames',domain:'endgames',focus:'Opposition, key squares and the square of the pawn.'},
  {n:10,title:'History: Kasparov',pillar:'History + Tactic',domain:'tactics',focus:"Kasparov's preparation and attacking energy; introduce Deflection."},
  {n:11,title:'Trap a Piece',pillar:'Tactics',domain:'tactics',focus:'Cut off escape routes and distinguish positional from tactical trapping.'},
  {n:12,title:'Deflection',pillar:'Tactics',domain:'tactics',focus:'Pull defenders away from key duties and exploit the newly unguarded target.'},
  {n:13,title:'Opening Principles',pillar:'Openings',domain:'openings',focus:'Revisit CCC at Thinkers depth and explain why each opening principle works.'},
  {n:14,title:'Rooks on the 7th & Active Rooks',pillar:'Endgames',domain:'endgames',focus:'Active versus passive rooks, seventh-rank penetration and dominant placement.'},
  {n:15,title:'History: Fischer + Windmill',pillar:'History + Tactic',domain:'tactics',focus:"Fischer's precision and windmill discovered checks; forcing-move mastery."},
  {n:16,title:'Overload',pillar:'Tactics',domain:'tactics',focus:'Identify a piece defending too many targets and exploit the overload.'},
  {n:17,title:'Trading Queens & Pieces',pillar:'Strategy',domain:'strategy',focus:'Know when to simplify into a win and when to preserve complexity.'},
  {n:18,title:'Playing Black: vs e4 & d4',pillar:'Openings',domain:'openings',focus:'Build one solid system versus e4 and one versus d4 with clear development plans.'},
  {n:19,title:'Weak Squares & Outposts',pillar:'Strategy',domain:'strategy',focus:'Identify durable weak squares and establish a knight outpost for a long-term edge.'},
  {n:20,title:'History: Magnus + Overload',pillar:'History + Tactic',domain:'tactics',focus:'Magnus, multi-threat positions and endgame technique; reinforce overload.'},
];

const trackConfigs={
  builders:{id:'TRACK-BUILDERS',title:'Builders',stage:'Intermediate',ageRange:'5–9',count:20,duration:75,source:BUILDERS_SOURCE,sequence:2,lessons:buildersLessons},
  thinkers:{id:'TRACK-THINKERS',title:'Thinkers',stage:'Advanced',ageRange:'6–12',count:20,duration:90,source:THINKERS_SOURCE,sequence:3,lessons:thinkersLessons},
};

const genericSkillId=(code,n)=>`SKILL-${code.toUpperCase()}-L${n}`;
const genericLessonId=(code,n)=>`LESSON-${code.toUpperCase()}-L${n}`;

export function seedTrackCurriculum(db,code){
  const config=trackConfigs[code]; if(!config)throw new TypeError('unknown curriculum track');
  db.prepare(`INSERT INTO curriculum_tracks(id,code,title,stage,age_range,lesson_count,default_duration_minutes,main_focus,sequence_no,active)
    VALUES (?,?,?,?,?,?,?,?,?,1)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,stage=excluded.stage,age_range=excluded.age_range,lesson_count=excluded.lesson_count,default_duration_minutes=excluded.default_duration_minutes,sequence_no=excluded.sequence_no,active=1`)
    .run(config.id,code,config.title,config.stage,config.ageRange,config.count,config.duration,`${config.title} structured lesson map`,config.sequence);
  const skill=db.prepare(`INSERT INTO curriculum_skills(id,code,title,track_id,domain,rating_min,rating_max,mastery_criteria,active)
    VALUES (?,?,?,?,?,NULL,NULL,?,1) ON CONFLICT(id) DO UPDATE SET title=excluded.title,track_id=excluded.track_id,domain=excluded.domain,mastery_criteria=excluded.mastery_criteria,active=1`);
  const lesson=db.prepare(`INSERT INTO lessons(id,skill_id,title,objective,duration_minutes,difficulty,content_json,active)
    VALUES (?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET skill_id=excluded.skill_id,title=excluded.title,objective=excluded.objective,duration_minutes=excluded.duration_minutes,difficulty=excluded.difficulty,content_json=excluded.content_json,active=1`);
  const dependency=db.prepare(`INSERT OR IGNORE INTO curriculum_skill_dependencies(skill_id,prerequisite_skill_id,dependency_type) VALUES (?,?,'required')`);
  db.transaction(()=>{for(const row of config.lessons){
    const sid=genericSkillId(code,row.n),lid=genericLessonId(code,row.n);
    skill.run(sid,`${code.toUpperCase()}-L${row.n}`,row.title,config.id,row.domain,`Student can demonstrate the core objective of ${config.title} lesson ${row.n} independently.`);
    lesson.run(lid,sid,`${config.title} L${row.n} — ${row.title}`,row.focus,config.duration,config.title,JSON.stringify({track:config.title,lessonNumber:row.n,pillar:row.pillar,focus:row.focus,sourceDocumentId:config.source,mapOnly:row.n>10}));
    if(row.n>1)dependency.run(sid,genericSkillId(code,row.n-1));
  }})();
  return {track:config.title,skills:config.lessons.length,lessons:config.lessons.length};
}

export function seedAllCurriculum(db){
  return [seedSeedsCurriculum(db),seedTrackCurriculum(db,'builders'),seedTrackCurriculum(db,'thinkers')];
}
