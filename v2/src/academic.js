import {randomUUID} from 'node:crypto';

const id=(prefix)=>`${prefix}-${randomUUID()}`;
const text=value=>String(value??'').trim();

export function createStudent(db,input={}){
  const name=text(input.displayName);
  if(!name)throw new TypeError('displayName is required');
  const student={id:id('STU'),displayName:name,playerId:input.playerId||null,ageBand:input.ageBand||null,schoolGrade:input.schoolGrade||null,currentLevel:input.currentLevel??null,targetLevel:input.targetLevel??null};
  db.prepare('INSERT INTO students(id,display_name,player_id,age_band,school_grade,current_level,target_level) VALUES (@id,@displayName,@playerId,@ageBand,@schoolGrade,@currentLevel,@targetLevel)').run(student);
  return student;
}

export function listStudents(db){
  return db.prepare(`SELECT s.id,s.display_name AS displayName,s.player_id AS playerId,s.status,s.age_band AS ageBand,s.school_grade AS schoolGrade,s.current_level AS currentLevel,s.target_level AS targetLevel,p.username AS linkedUsername,p.platform AS linkedPlatform FROM students s LEFT JOIN players p ON p.id=s.player_id ORDER BY s.display_name`).all();
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
  const program={id:id('PRG'),schoolId:input.schoolId||null,name,programType:type,startDate:input.startDate||null,endDate:input.endDate||null,plannedWeeks:input.plannedWeeks??null};
  db.prepare('INSERT INTO programs(id,school_id,name,program_type,start_date,end_date,planned_weeks) VALUES (@id,@schoolId,@name,@programType,@startDate,@endDate,@plannedWeeks)').run(program);
  return program;
}

export function listPrograms(db){
  return db.prepare(`SELECT p.id,p.name,p.program_type AS programType,p.start_date AS startDate,p.end_date AS endDate,p.planned_weeks AS plannedWeeks,p.status,s.name AS schoolName,(SELECT COUNT(*) FROM enrollments e WHERE e.program_id=p.id AND e.status='active') AS activeStudents FROM programs p LEFT JOIN schools s ON s.id=p.school_id ORDER BY COALESCE(p.start_date,''),p.name`).all();
}

export function enrollStudent(db,{programId,studentId,initialLevel=null}={}){
  if(!programId||!studentId)throw new TypeError('programId and studentId are required');
  const enrollment={id:id('ENR'),programId,studentId,initialLevel,currentLevel:initialLevel};
  db.prepare('INSERT INTO enrollments(id,program_id,student_id,initial_level,current_level) VALUES (@id,@programId,@studentId,@initialLevel,@currentLevel)').run(enrollment);
  return enrollment;
}
