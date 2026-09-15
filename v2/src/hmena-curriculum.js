export const HMENA_FRAMEWORK_ID='FRAMEWORK-HMENA-2500';
export const LEGACY_FRAMEWORK_ID='FRAMEWORK-SVCHESS-LEGACY';

export const hmenaBands=[
  {code:'hmena-0-400',title:'Foundations',min:0,max:400,sequence:10,focus:'Rules, board vision, legal play, checkmate and safe opening habits'},
  {code:'hmena-400-800',title:'Development',min:400,max:800,sequence:20,focus:'Material, threats, basic tactics, basic calculation and fundamental endings'},
  {code:'hmena-800-1200',title:'Competitive Fundamentals',min:800,max:1200,sequence:30,focus:'Candidate moves, combinations, pawn structure, active pieces and game review'},
  {code:'hmena-1200-1600',title:'Intermediate',min:1200,max:1600,sequence:40,focus:'Planning, prophylaxis, imbalances, calculation, repertoire and technical conversion'},
  {code:'hmena-1600-2000',title:'Advanced',min:1600,max:2000,sequence:50,focus:'Dynamic/static evaluation, initiative, deeper calculation, defense and advanced endings'},
  {code:'hmena-2000-2300',title:'Expert',min:2000,max:2300,sequence:60,focus:'Precision, deep preparation, complex defense/endgames and tournament execution'},
  {code:'hmena-2300-2500',title:'High Performance',min:2300,max:2500,sequence:70,focus:'Individualized weakness model, opponent preparation, research and elite practical decision-making'}
];

export const hmenaSkills=[
  // 0-400
  ['FND-BOARD','hmena-0-400','Board Coordinates & Setup','fundamentals',[], 'Set up the board and name files, ranks and common squares without help.'],
  ['FND-PIECES','hmena-0-400','Piece Movement & Captures','fundamentals',['FND-BOARD'],'Move every piece legally and explain blocking/jumping rules.'],
  ['FND-PAWNS','hmena-0-400','Pawn Rules & Promotion','fundamentals',['FND-BOARD'],'Play pawn moves, captures and promotion correctly.'],
  ['FND-LEGAL','hmena-0-400','Legal Moves & King Safety','thinking',['FND-PIECES','FND-PAWNS'],'Reject illegal king moves and recognize attacked squares.'],
  ['FND-CHECK','hmena-0-400','Recognize Check','thinking',['FND-LEGAL'],'Identify when a king is in check and name the attacker.'],
  ['FND-CBR','hmena-0-400','Escape Check: Capture, Block, Run','thinking',['FND-CHECK'],'Find legal CBR responses in simple positions.'],
  ['FND-MATE1','hmena-0-400','Checkmate & Mate in 1','tactics',['FND-CBR'],'Distinguish check from mate and solve basic mate-in-one positions.'],
  ['FND-OPENING','hmena-0-400','Opening Habits: Center, Develop, Castle','openings',['FND-LEGAL'],'Play the first moves with center control, development and king safety.'],
  ['FND-TRAPS','hmena-0-400','Basic Opening Traps & Defenses','openings',['FND-MATE1','FND-OPENING'],'Recognize Scholar’s/Fool’s Mate ideas and defend safely.'],
  ['FND-QK-MATE','hmena-0-400','Queen vs King Checkmate','endgames',['FND-MATE1'],'Convert queen versus lone king without stalemating.'],
  ['FND-THINK','hmena-0-400','Think Before You Move','thinking',['FND-LEGAL'],'Before moving, check opponent threats and own hanging pieces.'],

  // 400-800
  ['DEV-HANGING','hmena-400-800','Hanging Pieces & One-Move Blunders','tactics',['FND-THINK'],'Spot undefended or under-defended pieces before moving.'],
  ['DEV-MATERIAL','hmena-400-800','Material & Fair Trades','strategy',['DEV-HANGING'],'Use piece values to judge simple captures and exchanges.'],
  ['DEV-THREATS','hmena-400-800','Threats: Attack, Defend, Move','thinking',['DEV-HANGING'],'Identify the opponent’s immediate threat and answer it efficiently.'],
  ['DEV-FORK','hmena-400-800','Forks & Double Attacks','tactics',['DEV-THREATS'],'Create and detect forks with knights, pawns and major pieces.'],
  ['DEV-PIN','hmena-400-800','Pins','tactics',['DEV-THREATS'],'Recognize absolute/relative pins and exploit pinned pieces.'],
  ['DEV-SKEWER','hmena-400-800','Skewers','tactics',['DEV-MATERIAL'],'Recognize and execute basic skewers on files, ranks and diagonals.'],
  ['DEV-DISCOVERED','hmena-400-800','Discovered Attack & Check','tactics',['DEV-PIN'],'Recognize moving-piece/revealed-piece tactical relationships.'],
  ['DEV-BACKRANK','hmena-400-800','Back-Rank Mate & Escape Squares','tactics',['FND-OPENING','FND-MATE1'],'Recognize back-rank mating patterns and create luft.'],
  ['DEV-LADDER','hmena-400-800','Ladder Mate / Rook Mate','endgames',['FND-MATE1'],'Mate a lone king with two major pieces or rook+king technique.'],
  ['DEV-KP-END','hmena-400-800','King + Pawn vs King Basics','endgames',['FND-PAWNS','FND-LEGAL'],'Use king support and recognize basic win/draw positions.'],
  ['DEV-CCT','hmena-400-800','Checks, Captures, Threats Scan','calculation',['DEV-THREATS'],'Generate forcing candidates using checks, captures and threats.'],

  // 800-1200
  ['CMP-CANDIDATES','hmena-800-1200','Candidate Moves','calculation',['DEV-CCT'],'Generate 2–4 serious candidates before calculating.'],
  ['CMP-CALC2','hmena-800-1200','Calculate 2–3 Ply','calculation',['CMP-CANDIDATES'],'Calculate short forcing lines without moving the pieces.'],
  ['CMP-REMOVE','hmena-800-1200','Remove the Defender','tactics',['DEV-PIN','CMP-CALC2'],'Remove a key defender to win material or mate.'],
  ['CMP-DEFLECTION','hmena-800-1200','Deflection','tactics',['CMP-REMOVE'],'Force a defending piece away from a critical duty.'],
  ['CMP-OVERLOAD','hmena-800-1200','Overload','tactics',['CMP-REMOVE'],'Exploit a piece that must defend multiple targets.'],
  ['CMP-TRAP','hmena-800-1200','Trap a Piece','tactics',['DEV-MATERIAL'],'Restrict escape squares and win trapped pieces.'],
  ['CMP-MATE2','hmena-800-1200','Mate in 2 & Forcing Sequences','calculation',['CMP-CALC2','FND-MATE1'],'Find a forcing first move and calculate the mate.'],
  ['CMP-PAWNSTRUCT','hmena-800-1200','Pawn Structure Basics','strategy',['DEV-KP-END'],'Identify isolated, doubled, passed and backward pawns.'],
  ['CMP-WEAKSQUARE','hmena-800-1200','Weak Squares & Outposts','strategy',['CMP-PAWNSTRUCT'],'Identify durable weak squares and useful outposts.'],
  ['CMP-ROOKACTIVE','hmena-800-1200','Active Rooks & Open Files','strategy',['DEV-LADDER'],'Place rooks on open files and active ranks.'],
  ['CMP-OPPOSITION','hmena-800-1200','Opposition & Key Squares','endgames',['DEV-KP-END'],'Use opposition/key squares in king-pawn endings.'],
  ['CMP-REVIEW','hmena-800-1200','Self-Review: Find the Turning Point','thinking',['CMP-CANDIDATES'],'Explain the main mistake and better alternative after a game.'],

  // 1200-1600
  ['INT-PROPHYLAXIS','hmena-1200-1600','Prophylaxis: What Does My Opponent Want?','thinking',['CMP-REVIEW'],'Identify and prevent the opponent’s strongest plan.'],
  ['INT-WORSTPIECE','hmena-1200-1600','Improve the Worst Piece','strategy',['CMP-WEAKSQUARE'],'Identify the least useful piece and improve it.'],
  ['INT-OPENFILES','hmena-1200-1600','Open Files, Ranks & Invasion','strategy',['CMP-ROOKACTIVE'],'Create and occupy useful open files and invasion squares.'],
  ['INT-MINOR','hmena-1200-1600','Bishop vs Knight & Piece Quality','strategy',['INT-WORSTPIECE'],'Evaluate minor pieces by structure, squares and activity.'],
  ['INT-PAWNBREAK','hmena-1200-1600','Pawn Breaks & Structure Changes','strategy',['CMP-PAWNSTRUCT'],'Choose pawn breaks that improve the position or open lines.'],
  ['INT-IMBALANCE','hmena-1200-1600','Position Imbalances & Planning','strategy',['INT-MINOR','CMP-WEAKSQUARE'],'Build a plan from material, structure, space and piece activity.'],
  ['INT-CALC4','hmena-1200-1600','Calculate 4–6 Ply','calculation',['CMP-CALC2'],'Calculate forcing and quiet branches with disciplined visualization.'],
  ['INT-EXCHANGE','hmena-1200-1600','When to Trade / When to Keep','strategy',['DEV-MATERIAL','INT-IMBALANCE'],'Judge exchanges by resulting position rather than piece value alone.'],
  ['INT-OPENPLAN','hmena-1200-1600','Opening Plans & Repertoire Skeleton','openings',['FND-OPENING','INT-IMBALANCE'],'Know plans, pawn breaks and piece placement in a small repertoire.'],
  ['INT-ROOKEND','hmena-1200-1600','Rook Endgame Fundamentals','endgames',['CMP-ROOKACTIVE','CMP-OPPOSITION'],'Use active king/rook, cut-off and basic Lucena/Philidor ideas.'],
  ['INT-CONVERT','hmena-1200-1600','Convert an Advantage','strategy',['INT-EXCHANGE'],'Simplify, restrict counterplay and convert extra material/space.'],
  ['INT-CLOCK','hmena-1200-1600','Clock & Practical Decision-Making','competition',['CMP-REVIEW'],'Allocate time by position complexity and avoid avoidable time trouble.'],

  // 1600-2000
  ['ADV-STATICDYN','hmena-1600-2000','Static vs Dynamic Advantages','strategy',['INT-IMBALANCE'],'Distinguish lasting advantages from temporary initiative.'],
  ['ADV-INITIATIVE','hmena-1600-2000','Initiative & Tempo','strategy',['ADV-STATICDYN'],'Maintain or neutralize initiative using forcing and improving moves.'],
  ['ADV-SACRIFICE','hmena-1600-2000','Sacrifice Evaluation','calculation',['INT-CALC4','ADV-INITIATIVE'],'Evaluate compensation before sacrificing material.'],
  ['ADV-CALCTREE','hmena-1600-2000','Calculation Tree & Branch Control','calculation',['INT-CALC4'],'Calculate multiple candidate branches without losing the main line.'],
  ['ADV-QUIET','hmena-1600-2000','Quiet Moves in Tactical Positions','calculation',['ADV-CALCTREE'],'Find non-forcing moves that create decisive threats.'],
  ['ADV-DEFENSE','hmena-1600-2000','Active Defense & Counterplay','strategy',['INT-PROPHYLAXIS'],'Find defensive resources, exchanges and counterplay under pressure.'],
  ['ADV-PAWNEND','hmena-1600-2000','Advanced Pawn Endgames','endgames',['CMP-OPPOSITION'],'Use corresponding squares, reserve tempi and breakthrough ideas.'],
  ['ADV-ROOKEND','hmena-1600-2000','Advanced Rook Endgames','endgames',['INT-ROOKEND'],'Handle active rook, checking distance, rook-behind-pawn and transitions.'],
  ['ADV-MINOREND','hmena-1600-2000','Minor-Piece Endgames','endgames',['INT-MINOR'],'Evaluate bishop/knight endgames through pawn structure and king activity.'],
  ['ADV-REPERTOIRE','hmena-1600-2000','Repertoire Depth & Move Orders','openings',['INT-OPENPLAN'],'Understand move-order nuances and typical middlegames.'],
  ['ADV-OPPPREP','hmena-1600-2000','Opponent Preparation','competition',['ADV-REPERTOIRE'],'Prepare a practical plan from opponent games and tendencies.'],
  ['ADV-ANNOTATE','hmena-1600-2000','Deep Game Annotation','thinking',['CMP-REVIEW','ADV-CALCTREE'],'Annotate plans, candidates, calculation errors and strategic turning points.'],

  // 2000-2300
  ['EXP-DEEPCALC','hmena-2000-2300','Deep Calculation & Verification','calculation',['ADV-CALCTREE'],'Calculate deep critical lines and verify final positions accurately.'],
  ['EXP-MOVEORDER','hmena-2000-2300','Move-Order Precision','openings',['ADV-REPERTOIRE'],'Use transpositions and move orders to reach favorable structures.'],
  ['EXP-PROPHY','hmena-2000-2300','Advanced Prophylaxis','thinking',['INT-PROPHYLAXIS'],'Prevent hidden resources before executing a plan.'],
  ['EXP-TRANSFORM','hmena-2000-2300','Transform One Advantage into Another','strategy',['INT-CONVERT','ADV-STATICDYN'],'Convert space/activity/material advantages into favorable endgames or attacks.'],
  ['EXP-TECHDEF','hmena-2000-2300','Technical Defense','strategy',['ADV-DEFENSE'],'Defend inferior positions using fortress, activity and simplification resources.'],
  ['EXP-COMPLEXEND','hmena-2000-2300','Complex Endgame Calculation','endgames',['ADV-ROOKEND','ADV-MINOREND'],'Calculate technical endings with multiple transitions.'],
  ['EXP-OPENRESEARCH','hmena-2000-2300','Opening Research Workflow','openings',['EXP-MOVEORDER'],'Build/update repertoire files from games, engine and model positions.'],
  ['EXP-MODELGAMES','hmena-2000-2300','Model Games by Structure','strategy',['ADV-ANNOTATE'],'Extract plans and recurring ideas from elite model games.'],
  ['EXP-ENGINE','hmena-2000-2300','Engine Use Without Engine Dependence','thinking',['ADV-ANNOTATE'],'Use engine output to test human analysis rather than replace it.'],
  ['EXP-TOURNAMENT','hmena-2000-2300','Tournament Strategy & Pairing Preparation','competition',['ADV-OPPPREP','INT-CLOCK'],'Adapt risk, time and preparation to event situation.'],
  ['EXP-ROUTINE','hmena-2000-2300','Pre-Game / Post-Game Routine','competition',['EXP-TOURNAMENT'],'Run consistent preparation, focus and review routines.'],

  // 2300-2500+
  ['HP-WEAKMODEL','hmena-2300-2500','Individual Weakness Model','thinking',['EXP-ENGINE'],'Maintain an evidence-based model of recurring decision errors.'],
  ['HP-OPPMODEL','hmena-2300-2500','Opponent Style Model','competition',['ADV-OPPPREP'],'Profile opponent structures, openings, time use and practical tendencies.'],
  ['HP-NOVELTY','hmena-2300-2500','Novelty Research & Testing','openings',['EXP-OPENRESEARCH'],'Research, test and rehearse opening novelties.'],
  ['HP-ENDSTUDY','hmena-2300-2500','Specialized Endgame Study','endgames',['EXP-COMPLEXEND'],'Study endgames tailored to repertoire and recurring practical positions.'],
  ['HP-CALCROUTINE','hmena-2300-2500','Elite Calculation Training Cycle','calculation',['EXP-DEEPCALC'],'Run timed calculation blocks with error taxonomy and verification.'],
  ['HP-PRACTICAL','hmena-2300-2500','Practical Decision-Making Under Uncertainty','competition',['EXP-TOURNAMENT'],'Choose moves balancing objective quality, risk, clock and opponent.'],
  ['HP-DEFENSE','hmena-2300-2500','High-Level Defensive Resourcefulness','strategy',['EXP-TECHDEF'],'Find only-move defenses and maximize practical resistance.'],
  ['HP-TIME','hmena-2300-2500','Time-Trouble Performance','competition',['INT-CLOCK','HP-PRACTICAL'],'Use robust decision rules in severe time pressure.'],
  ['HP-CYCLE','hmena-2300-2500','Tournament Training Cycles','competition',['EXP-ROUTINE'],'Periodize preparation, competition and recovery across events.'],
  ['HP-SELF','hmena-2300-2500','Self-Analysis Before Engine','thinking',['HP-WEAKMODEL'],'Produce complete human analysis before consulting tools.'],
  ['HP-COACHLOOP','hmena-2300-2500','Coach Feedback Loop','thinking',['HP-SELF'],'Turn game evidence into measurable training priorities and reassessment.']
].map(([code,band,title,domain,prerequisites,mastery],i)=>({code,band,title,domain,prerequisites,mastery,sequence:i+1}));

const trackId=code=>`TRACK-${code.toUpperCase()}`;
const skillId=code=>`SKILL-HMENA-${code}`;

export function seedHmenaFramework(db){
  db.prepare(`INSERT INTO curriculum_frameworks(id,code,title,version,description,canonical,active)
    VALUES (?,?,?,?,?,1,1) ON CONFLICT(id) DO UPDATE SET title=excluded.title,version=excluded.version,description=excluded.description,canonical=1,active=1`)
    .run(HMENA_FRAMEWORK_ID,'hmena-0-2500','HMENA Chess 0–2500','1.0','Canonical skill framework for private students, schools and competitive training.');
  const track=db.prepare(`INSERT INTO curriculum_tracks(id,code,title,stage,age_range,lesson_count,default_duration_minutes,main_focus,sequence_no,active,framework_id,rating_min,rating_max,track_kind)
    VALUES (?,?,?,?,NULL,NULL,60,?,?,1,?,?,?,'band')
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,stage=excluded.stage,main_focus=excluded.main_focus,sequence_no=excluded.sequence_no,active=1,framework_id=excluded.framework_id,rating_min=excluded.rating_min,rating_max=excluded.rating_max,track_kind='band'`);
  for(const b of hmenaBands)track.run(trackId(b.code),b.code,b.title,b.title,b.focus,b.sequence,HMENA_FRAMEWORK_ID,b.min,b.max);
  const skill=db.prepare(`INSERT INTO curriculum_skills(id,code,title,track_id,domain,rating_min,rating_max,mastery_criteria,sequence_no,active)
    VALUES (?,?,?,?,?,?,?,?,?,1)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,track_id=excluded.track_id,domain=excluded.domain,rating_min=excluded.rating_min,rating_max=excluded.rating_max,mastery_criteria=excluded.mastery_criteria,sequence_no=excluded.sequence_no,active=1`);
  const dep=db.prepare(`INSERT OR IGNORE INTO curriculum_skill_dependencies(skill_id,prerequisite_skill_id,dependency_type) VALUES (?,?,'required')`);
  const bandMap=new Map(hmenaBands.map(b=>[b.code,b]));
  db.transaction(()=>{
    for(const s of hmenaSkills){const b=bandMap.get(s.band);skill.run(skillId(s.code),s.code,s.title,trackId(s.band),s.domain,b.min,b.max,s.mastery,s.sequence);}
    for(const s of hmenaSkills)for(const p of s.prerequisites)dep.run(skillId(s.code),skillId(p));
  })();
  return {framework:'HMENA Chess 0–2500',bands:hmenaBands.length,skills:hmenaSkills.length};
}

export function seedLegacyFramework(db){
  db.prepare(`INSERT INTO curriculum_frameworks(id,code,title,version,description,canonical,active)
    VALUES (?,?,?,?,?,0,1) ON CONFLICT(id) DO UPDATE SET active=1`)
    .run(LEGACY_FRAMEWORK_ID,'svchess-legacy','SV Chess Legacy Curriculum','2026','Seeds, Builders and Thinkers retained as source material.');
  db.prepare(`UPDATE curriculum_tracks SET framework_id=?,track_kind='legacy' WHERE code IN ('seeds','builders','thinkers')`).run(LEGACY_FRAMEWORK_ID);
}

const legacyMap={
  'SEEDS-L1':['FND-BOARD'],'SEEDS-L2':['FND-PIECES'],'SEEDS-L3':['FND-PIECES'],'SEEDS-L4':['FND-PIECES'],'SEEDS-L5':['FND-PIECES'],
  'SEEDS-L6':['FND-CHECK','FND-CBR'],'SEEDS-L7':['FND-MATE1'],'SEEDS-L8':['FND-TRAPS'],'SEEDS-L9':['FND-OPENING'],'SEEDS-L10':['FND-QK-MATE'],
  'BUILDERS-L1':['FND-TRAPS'],'BUILDERS-L2':['FND-OPENING'],'BUILDERS-L3':['DEV-FORK'],'BUILDERS-L4':['DEV-MATERIAL'],'BUILDERS-L5':['DEV-LADDER'],
  'BUILDERS-L6':['DEV-FORK'],'BUILDERS-L7':['DEV-PIN'],'BUILDERS-L8':['DEV-THREATS'],'BUILDERS-L9':['DEV-SKEWER'],'BUILDERS-L10':['FND-QK-MATE'],
  'BUILDERS-L11':['CMP-REVIEW'],'BUILDERS-L12':['DEV-DISCOVERED'],'BUILDERS-L13':['DEV-THREATS'],'BUILDERS-L14':['CMP-MATE2'],'BUILDERS-L15':['DEV-LADDER'],
  'BUILDERS-L16':['ADV-SACRIFICE'],'BUILDERS-L17':['DEV-FORK','CMP-MATE2'],'BUILDERS-L18':['DEV-KP-END'],'BUILDERS-L19':['CMP-MATE2'],'BUILDERS-L20':['CMP-REVIEW'],
  'THINKERS-L1':['DEV-LADDER','FND-QK-MATE'],'THINKERS-L2':['DEV-FORK','DEV-PIN'],'THINKERS-L3':['DEV-SKEWER'],'THINKERS-L4':['ADV-INITIATIVE'],
  'THINKERS-L5':['CMP-REMOVE'],'THINKERS-L6':['DEV-DISCOVERED'],'THINKERS-L7':['CMP-MATE2'],'THINKERS-L8':['CMP-PAWNSTRUCT'],'THINKERS-L9':['CMP-OPPOSITION'],
  'THINKERS-L10':['CMP-DEFLECTION'],'THINKERS-L11':['CMP-TRAP'],'THINKERS-L12':['CMP-DEFLECTION'],'THINKERS-L13':['INT-OPENPLAN'],'THINKERS-L14':['CMP-ROOKACTIVE'],
  'THINKERS-L15':['DEV-DISCOVERED'],'THINKERS-L16':['CMP-OVERLOAD'],'THINKERS-L17':['INT-EXCHANGE'],'THINKERS-L18':['INT-OPENPLAN'],'THINKERS-L19':['CMP-WEAKSQUARE'],'THINKERS-L20':['CMP-OVERLOAD']
};

export function mapLegacyToHmena(db){
  seedLegacyFramework(db); seedHmenaFramework(db);
  const findSource=db.prepare('SELECT id FROM curriculum_skills WHERE code=?');
  const insert=db.prepare(`INSERT INTO curriculum_skill_mappings(source_skill_id,target_skill_id,relation_type,weight) VALUES (?,?, 'covers',1.0) ON CONFLICT(source_skill_id,target_skill_id) DO NOTHING`);
  let mappings=0;
  db.transaction(()=>{for(const [sourceCode,targets] of Object.entries(legacyMap)){const src=findSource.get(sourceCode);if(!src)continue;for(const target of targets){insert.run(src.id,skillId(target));mappings++;}}})();
  return {mappings};
}

const statusRank={unseen:0,introduced:1,practicing:2,drill_mastered:3,applied_in_game:4,regressed:-1};
export function syncLegacyEvidenceToHmena(db,studentId){
  const rows=db.prepare(`SELECT ss.status,m.target_skill_id AS targetSkillId,ss.evidence_json AS evidenceJson
    FROM student_skills ss JOIN curriculum_skill_mappings m ON m.source_skill_id=ss.skill_id
    JOIN curriculum_skills src ON src.id=ss.skill_id JOIN curriculum_tracks t ON t.id=src.track_id
    WHERE ss.student_id=? AND t.framework_id=?`).all(studentId,LEGACY_FRAMEWORK_ID);
  const get=db.prepare('SELECT status FROM student_skills WHERE student_id=? AND skill_id=?');
  const upsert=db.prepare(`INSERT INTO student_skills(student_id,skill_id,status,evidence_json,last_assessed_at,updated_at)
    VALUES (?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(student_id,skill_id) DO UPDATE SET status=excluded.status,evidence_json=excluded.evidence_json,last_assessed_at=excluded.last_assessed_at,updated_at=CURRENT_TIMESTAMP`);
  let synced=0;
  db.transaction(()=>{for(const r of rows){const existing=get.get(studentId,r.targetSkillId);const sourceStatus=r.status==='regressed'?'regressed':r.status; if(existing&&statusRank[existing.status]>=statusRank[sourceStatus]&&sourceStatus!=='regressed')continue;upsert.run(studentId,r.targetSkillId,sourceStatus,JSON.stringify({source:'legacy_mapping',legacyEvidence:JSON.parse(r.evidenceJson||'{}')}));synced++;}})();
  return {studentId,synced};
}

export function placeStudentInHmena(db,{studentId,bandCode,source='manual',confidence=80,note=null}){
  const student=db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId);if(!student)throw new TypeError('student not found');
  const band=db.prepare(`SELECT id FROM curriculum_tracks WHERE code=? AND framework_id=? AND track_kind='band'`).get(bandCode,HMENA_FRAMEWORK_ID);if(!band)throw new TypeError('HMENA band not found');
  db.prepare(`INSERT INTO student_curriculum_placements(student_id,framework_id,track_id,placement_source,confidence,note,updated_at)
    VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(student_id,framework_id) DO UPDATE SET track_id=excluded.track_id,placement_source=excluded.placement_source,confidence=excluded.confidence,note=excluded.note,updated_at=CURRENT_TIMESTAMP`)
    .run(studentId,HMENA_FRAMEWORK_ID,band.id,source,confidence,note);
  return {studentId,bandCode,source,confidence};
}

const hmenaStatuses=new Set(['unseen','introduced','practicing','drill_mastered','applied_in_game','regressed']);
export function setHmenaSkillStatus(db,{studentId,skillCode,status,confidence=null,evidence={}}){
  if(!hmenaStatuses.has(status))throw new TypeError('invalid skill status');
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))throw new TypeError('student not found');
  const skill=db.prepare(`SELECT s.id FROM curriculum_skills s JOIN curriculum_tracks t ON t.id=s.track_id WHERE s.code=? AND t.framework_id=?`).get(skillCode,HMENA_FRAMEWORK_ID);
  if(!skill)throw new TypeError('HMENA skill not found');
  const conf=confidence==null||confidence===''?null:Number(confidence);if(conf!==null&&(!Number.isInteger(conf)||conf<0||conf>100))throw new TypeError('confidence must be 0-100');
  db.prepare(`INSERT INTO student_skills(student_id,skill_id,status,confidence,evidence_json,last_assessed_at,updated_at)
    VALUES (?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    ON CONFLICT(student_id,skill_id) DO UPDATE SET status=excluded.status,confidence=excluded.confidence,evidence_json=excluded.evidence_json,last_assessed_at=excluded.last_assessed_at,updated_at=CURRENT_TIMESTAMP`)
    .run(studentId,skill.id,status,conf,JSON.stringify({source:'coach_manual',...(evidence||{})}));
  return {studentId,skillCode,status,confidence:conf};
}

export function getHmenaPlacement(db,studentId){
  return db.prepare(`SELECT p.student_id AS studentId,t.code AS bandCode,t.title AS bandTitle,t.rating_min AS ratingMin,t.rating_max AS ratingMax,p.placement_source AS source,p.confidence,p.note,p.updated_at AS updatedAt
    FROM student_curriculum_placements p JOIN curriculum_tracks t ON t.id=p.track_id WHERE p.student_id=? AND p.framework_id=?`).get(studentId,HMENA_FRAMEWORK_ID)||null;
}

export function recommendLearningPriorities(db,studentId,{limit=5}={}){
  const placement=getHmenaPlacement(db,studentId);if(!placement)return {placement:null,needsAssessment:true,priorities:[]};
  const skills=db.prepare(`SELECT s.id,s.code,s.title,s.domain,s.sequence_no AS sequenceNo,COALESCE(ss.status,'unseen') AS status
    FROM curriculum_skills s LEFT JOIN student_skills ss ON ss.student_id=? AND ss.skill_id=s.id
    WHERE s.track_id=(SELECT track_id FROM student_curriculum_placements WHERE student_id=? AND framework_id=?) AND s.active=1 ORDER BY s.sequence_no`).all(studentId,studentId,HMENA_FRAMEWORK_ID);
  const prereqStmt=db.prepare(`SELECT p.id,COALESCE(ss.status,'unseen') AS status FROM curriculum_skill_dependencies d JOIN curriculum_skills p ON p.id=d.prerequisite_skill_id LEFT JOIN student_skills ss ON ss.student_id=? AND ss.skill_id=p.id WHERE d.skill_id=? AND d.dependency_type='required'`);
  const priorities=[];
  for(const s of skills){
    const prereqs=prereqStmt.all(studentId,s.id);const prereqsReady=prereqs.every(p=>['drill_mastered','applied_in_game'].includes(p.status));
    let score=0,reason='';
    if(s.status==='regressed'){score=100;reason='Regresión detectada: requiere reevaluación.';}
    else if(s.status==='practicing'){score=90;reason='Está en práctica y aún no está dominada.';}
    else if(s.status==='introduced'){score=80;reason='Ya fue introducida, pero falta evidencia de dominio.';}
    else if(s.status==='drill_mastered'){score=55;reason='Resuelve ejercicios; falta aplicarla consistentemente en partidas.';}
    else if(s.status==='unseen'&&(prereqs.length===0||prereqsReady)){score=70;reason='Siguiente skill nueva con prerrequisitos listos.';}
    else if(s.status==='unseen'&&!prereqsReady){score=40;reason='Hay un hueco de prerrequisitos; conviene reforzar fundamentos antes de avanzar.';}
    if(score)priorities.push({...s,score,reason,prerequisitesReady:prereqsReady,prerequisiteCount:prereqs.length});
  }
  priorities.sort((a,b)=>b.score-a.score||a.sequenceNo-b.sequenceNo);
  return {placement,needsAssessment:false,priorities:priorities.slice(0,Math.max(1,Math.min(10,Number(limit)||5)))};
}

export function hmenaOverview(db){
  const bands=db.prepare(`SELECT code,title,rating_min AS ratingMin,rating_max AS ratingMax,main_focus AS mainFocus,sequence_no AS sequenceNo FROM curriculum_tracks WHERE framework_id=? AND track_kind='band' AND active=1 ORDER BY sequence_no`).all(HMENA_FRAMEWORK_ID);
  const counts=db.prepare(`SELECT t.code,COUNT(s.id) AS skills FROM curriculum_tracks t LEFT JOIN curriculum_skills s ON s.track_id=t.id AND s.active=1 WHERE t.framework_id=? GROUP BY t.id ORDER BY t.sequence_no`).all(HMENA_FRAMEWORK_ID);
  const byCode=new Map(counts.map(r=>[r.code,r.skills]));
  return {framework:{id:HMENA_FRAMEWORK_ID,code:'hmena-0-2500',title:'HMENA Chess 0–2500',version:'1.0'},bands:bands.map(b=>({...b,skills:byCode.get(b.code)||0}))};
}
