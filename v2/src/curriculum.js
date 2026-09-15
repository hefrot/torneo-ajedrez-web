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
  const lessons=db.prepare(`SELECT l.id,l.title,l.objective,l.duration_minutes AS durationMinutes,l.content_json AS contentJson,cs.code AS skillCode,ct.code AS trackCode FROM lessons l LEFT JOIN curriculum_skills cs ON cs.id=l.skill_id LEFT JOIN curriculum_tracks ct ON ct.id=cs.track_id WHERE l.active=1 ORDER BY ct.sequence_no,CAST(substr(cs.code,8) AS INTEGER)`).all().map(row=>({...row,content:JSON.parse(row.contentJson||'{}')}));
  return {tracks,lessons};
}

export function recordStudentLessonEvidence(db,{studentId,lessonNumber,status='introduced',evidence={}}){
  const skill=skillId(Number(lessonNumber));
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))throw new TypeError('student not found');
  if(!db.prepare('SELECT 1 FROM curriculum_skills WHERE id=?').get(skill))throw new TypeError('skill not found');
  const allowed=new Set(['unseen','introduced','practicing','drill_mastered','applied_in_game','regressed']);
  if(!allowed.has(status))throw new TypeError('invalid skill status');
  db.prepare(`INSERT INTO student_skills(student_id,skill_id,status,evidence_json,last_assessed_at,updated_at)
    VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(student_id,skill_id) DO UPDATE SET status=excluded.status,evidence_json=excluded.evidence_json,last_assessed_at=excluded.last_assessed_at,updated_at=CURRENT_TIMESTAMP`)
    .run(studentId,skill,status,JSON.stringify(evidence||{}));
  return {studentId,skillId:skill,status};
}

export function recommendNextSeedsLesson(db,studentId){
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))return null;
  for(const row of seedsLessons){
    const state=db.prepare('SELECT status FROM student_skills WHERE student_id=? AND skill_id=?').get(studentId,skillId(row.n));
    if(!state||state.status==='unseen'||state.status==='regressed')return db.prepare(`SELECT l.id,l.title,l.objective,l.duration_minutes AS durationMinutes FROM lessons l WHERE l.id=?`).get(lessonId(row.n));
  }
  return null;
}

export function assignLessonToSession(db,{sessionId,lessonId:targetLessonId,deliveryStage='theory_only'}){
  if(!db.prepare('SELECT 1 FROM class_sessions WHERE id=?').get(sessionId))throw new TypeError('session not found');
  if(!db.prepare('SELECT 1 FROM lessons WHERE id=?').get(targetLessonId))throw new TypeError('lesson not found');
  db.prepare(`INSERT INTO session_lessons(session_id,lesson_id,sequence_no,delivery_stage) VALUES (?,?,1,?)
    ON CONFLICT(session_id,lesson_id) DO UPDATE SET delivery_stage=excluded.delivery_stage`).run(sessionId,targetLessonId,deliveryStage);
  return {sessionId,lessonId:targetLessonId,deliveryStage};
}
