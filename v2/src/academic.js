import {randomUUID} from 'node:crypto';

const id=(prefix)=>`${prefix}-${randomUUID()}`;
const text=value=>String(value??'').trim();
const locales=new Set(['en','es']);
const instructionLocales=new Set(['en','es','bilingual']);

export function createStudent(db,input={}){
  const name=text(input.displayName);
  if(!name)throw new TypeError('displayName is required');
  const preferredLocale=input.preferredLocale?text(input.preferredLocale).toLowerCase():null;if(preferredLocale&&!locales.has(preferredLocale))throw new TypeError('invalid preferredLocale');
  const student={id:id('STU'),displayName:name,playerId:input.playerId||null,ageBand:input.ageBand||null,schoolGrade:input.schoolGrade||null,currentLevel:input.currentLevel??null,targetLevel:input.targetLevel??null,preferredLocale};
  db.prepare('INSERT INTO students(id,display_name,player_id,age_band,school_grade,current_level,target_level,preferred_locale) VALUES (@id,@displayName,@playerId,@ageBand,@schoolGrade,@currentLevel,@targetLevel,@preferredLocale)').run(student);
  return student;
}

export function listStudents(db){
  return db.prepare(`SELECT s.id,s.display_name AS displayName,s.player_id AS playerId,s.status,s.age_band AS ageBand,s.school_grade AS schoolGrade,s.current_level AS currentLevel,s.target_level AS targetLevel,s.preferred_locale AS preferredLocale,p.username AS linkedUsername,p.platform AS linkedPlatform FROM students s LEFT JOIN players p ON p.id=s.player_id ORDER BY s.display_name`).all();
}

export function createSchool(db,input={}){
  const name=text(input.name);
  if(!name)throw new TypeError('name is required');
  const school={id:id('SCH'),name,addressText:input.addressText||null,contactName:input.contactName||null,contactEmail:input.contactEmail||null};
  db.prepare('INSERT INTO schools(id,name,address_text,contact_name,contact_email) VALUES (@id,@name,@addressText,@contactName,@contactEmail)').run(school);
  return school;
}

export function listSchools(db){
  return db.prepare('SELECT id,name,address_text AS addressText,contact_name AS contactName,contact_email AS contactEmail,active FROM schools ORDER BY name').all();
}

export function createProgram(db,input={}){
  const name=text(input.name);
  const type=text(input.programType);
  if(!name)throw new TypeError('name is required');
  if(!['private','group','school','camp','club'].includes(type))throw new TypeError('invalid programType');
  const instructionLocale=text(input.instructionLocale||'en').toLowerCase();if(!instructionLocales.has(instructionLocale))throw new TypeError('invalid instructionLocale');
  const program={id:id('PRG'),schoolId:input.schoolId||null,name,programType:type,startDate:input.startDate||null,endDate:input.endDate||null,plannedWeeks:input.plannedWeeks??null,instructionLocale};
  db.prepare('INSERT INTO programs(id,school_id,name,program_type,start_date,end_date,planned_weeks,instruction_locale) VALUES (@id,@schoolId,@name,@programType,@startDate,@endDate,@plannedWeeks,@instructionLocale)').run(program);
  return program;
}

export function listPrograms(db){
  return db.prepare(`SELECT p.id,p.name,p.program_type AS programType,p.start_date AS startDate,p.end_date AS endDate,p.planned_weeks AS plannedWeeks,p.instruction_locale AS instructionLocale,p.status,s.name AS schoolName,(SELECT COUNT(*) FROM enrollments e WHERE e.program_id=p.id AND e.status='active') AS activeStudents FROM programs p LEFT JOIN schools s ON s.id=p.school_id ORDER BY COALESCE(p.start_date,''),p.name`).all();
}

export function enrollStudent(db,{programId,studentId,initialLevel=null}={}){
  if(!programId||!studentId)throw new TypeError('programId and studentId are required');
  const enrollment={id:id('ENR'),programId,studentId,initialLevel,currentLevel:initialLevel};
  db.prepare('INSERT INTO enrollments(id,program_id,student_id,initial_level,current_level) VALUES (@id,@programId,@studentId,@initialLevel,@currentLevel)').run(enrollment);
  return enrollment;
}

const attendanceStatuses=new Set(['present','absent','late','excused']);
const engagementFlags=new Set(['focused','distracted','disruptive']);

export function saveSessionAttendance(db,sessionId,records=[]){
  const session=db.prepare('SELECT id,program_id FROM class_sessions WHERE id=?').get(sessionId);
  if(!session)throw new TypeError('session not found');
  if(!Array.isArray(records))throw new TypeError('records must be an array');
  const enrolled=db.prepare('SELECT 1 FROM enrollments WHERE program_id=? AND student_id=?');
  const upsert=db.prepare(`INSERT INTO attendance(session_id,student_id,status,comprehension_score,engagement_flag,note)
    VALUES (@sessionId,@studentId,@status,@comprehensionScore,@engagementFlag,@note)
    ON CONFLICT(session_id,student_id) DO UPDATE SET status=excluded.status,comprehension_score=excluded.comprehension_score,engagement_flag=excluded.engagement_flag,note=excluded.note`);
  db.transaction(()=>{for(const raw of records){
    const studentId=text(raw?.studentId); const status=text(raw?.status).toLowerCase();
    if(!studentId||!attendanceStatuses.has(status))throw new TypeError('invalid attendance record');
    if(!enrolled.get(session.program_id,studentId))throw new TypeError('student is not enrolled in this program');
    const comprehensionScore=raw?.comprehensionScore==null||raw.comprehensionScore===''?null:Number(raw.comprehensionScore);
    if(comprehensionScore!==null&&(!Number.isInteger(comprehensionScore)||comprehensionScore<1||comprehensionScore>5))throw new TypeError('comprehensionScore must be 1-5');
    const engagementFlag=raw?.engagementFlag?text(raw.engagementFlag).toLowerCase():null;
    if(engagementFlag&&!engagementFlags.has(engagementFlag))throw new TypeError('invalid engagementFlag');
    upsert.run({sessionId,studentId,status,comprehensionScore,engagementFlag,note:text(raw?.note)||null});
  }})();
  return db.prepare(`SELECT a.student_id AS studentId,s.display_name AS displayName,a.status,a.comprehension_score AS comprehensionScore,a.engagement_flag AS engagementFlag,a.note FROM attendance a JOIN students s ON s.id=a.student_id WHERE a.session_id=? ORDER BY s.display_name`).all(sessionId);
}

export function studentProfile(db,studentId){
  const student=db.prepare(`SELECT s.id,s.display_name AS displayName,s.status,s.age_band AS ageBand,s.school_grade AS schoolGrade,s.current_level AS currentLevel,s.target_level AS targetLevel,s.preferred_locale AS preferredLocale,s.player_id AS playerId,p.username AS linkedUsername,p.platform AS linkedPlatform FROM students s LEFT JOIN players p ON p.id=s.player_id WHERE s.id=?`).get(studentId);
  if(!student)return null;
  const guardians=db.prepare(`SELECT g.id,g.name,g.email,g.phone,g.preferred_channel AS preferredChannel,sg.relationship,sg.is_primary AS isPrimary FROM student_guardians sg JOIN guardians g ON g.id=sg.guardian_id WHERE sg.student_id=? ORDER BY sg.is_primary DESC,g.name`).all(studentId);
  const platformAccounts=student.playerId?db.prepare(`SELECT pa.id,pa.platform,pa.username,pa.verified_at AS verifiedAt,COALESCE(avs.ownership_verification,'pending') AS ownershipVerification FROM player_accounts pa LEFT JOIN account_verification_state avs ON avs.account_id=pa.id WHERE pa.player_id=? AND pa.account_status='verified' ORDER BY pa.platform,pa.username`).all(student.playerId):[];
  const enrollments=db.prepare(`SELECT e.id,e.status,e.cohort_tier AS cohortTier,e.initial_level AS initialLevel,e.current_level AS enrollmentLevel,p.id AS programId,p.name AS programName,p.program_type AS programType,p.start_date AS startDate,p.end_date AS endDate,p.planned_weeks AS plannedWeeks,p.instruction_locale AS instructionLocale,s.name AS schoolName FROM enrollments e JOIN programs p ON p.id=e.program_id LEFT JOIN schools s ON s.id=p.school_id WHERE e.student_id=? ORDER BY COALESCE(p.start_date,'') DESC,p.name`).all(studentId);
  const skills=db.prepare(`SELECT ss.skill_id AS skillId,cs.code,cs.title,cs.domain,ss.status,ss.confidence,ss.last_assessed_at AS lastAssessedAt FROM student_skills ss JOIN curriculum_skills cs ON cs.id=ss.skill_id WHERE ss.student_id=? ORDER BY cs.rating_min,cs.domain,cs.title`).all(studentId);
  const assessments=db.prepare(`SELECT id,kind,overall_level AS overallLevel,score_json AS scoreJson,coach_note AS coachNote,assessed_at AS assessedAt FROM assessments WHERE student_id=? ORDER BY assessed_at DESC LIMIT 20`).all(studentId);
  const findings=db.prepare(`SELECT f.id,f.finding_type AS findingType,f.severity,f.note,f.fen_before AS fenBefore,f.move_played AS movePlayed,f.best_move AS bestMove,f.created_at AS createdAt,cs.title AS skillTitle FROM student_game_findings f LEFT JOIN curriculum_skills cs ON cs.id=f.skill_id WHERE f.student_id=? ORDER BY f.created_at DESC LIMIT 20`).all(studentId);
  const notes=db.prepare(`SELECT id,visibility,note,created_at AS createdAt FROM coach_notes WHERE student_id=? ORDER BY created_at DESC LIMIT 30`).all(studentId);
  const attendance=db.prepare(`SELECT COUNT(*) AS total,SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present,ROUND(AVG(comprehension_score),2) AS avgComprehension FROM attendance WHERE student_id=?`).get(studentId);
  return {student,guardians,platformAccounts,enrollments,skills,assessments,findings,notes,attendance};
}

export function addCoachNote(db,studentId,input={}){
  if(!db.prepare('SELECT 1 FROM students WHERE id=?').get(studentId))throw new TypeError('student not found');
  const note=text(input.note); if(!note)throw new TypeError('note is required');
  const visibility=text(input.visibility||'coach_only').toLowerCase();
  if(!['coach_only','guardian_visible','school_visible'].includes(visibility))throw new TypeError('invalid visibility');
  const row={id:id('NOTE'),studentId,programId:input.programId||null,sessionId:input.sessionId||null,visibility,note};
  db.prepare('INSERT INTO coach_notes(id,student_id,program_id,session_id,visibility,note) VALUES (@id,@studentId,@programId,@sessionId,@visibility,@note)').run(row);
  return row;
}


export function setProgramInstructionLocale(db,programId,instructionLocale){
  const locale=text(instructionLocale).toLowerCase();if(!instructionLocales.has(locale))throw new TypeError('invalid instructionLocale');
  const result=db.prepare('UPDATE programs SET instruction_locale=? WHERE id=?').run(locale,programId);if(!result.changes)throw new TypeError('program not found');
  return {programId,instructionLocale:locale};
}
