const localDate=(date,timeZone=process.env.COACH_TIMEZONE||'America/Los_Angeles')=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);

export function coachDashboard(db,{now=new Date()}={}){
  const today=localDate(now);
  const nextWeek=localDate(new Date(now.getTime()+7*86400000));
  const sessions=db.prepare(`
    SELECT cs.id,cs.starts_at,cs.duration_minutes,cs.week_no,cs.title,cs.status,
           p.id AS program_id,p.name AS program_name,p.program_type,p.planned_weeks,COALESCE(cs.instruction_locale,p.instruction_locale,'en') AS instruction_locale,
           s.id AS school_id,s.name AS school_name
    FROM class_sessions cs
    JOIN programs p ON p.id=cs.program_id
    LEFT JOIN schools s ON s.id=p.school_id
    WHERE substr(cs.starts_at,1,10)=? AND cs.status!='cancelled'
    ORDER BY cs.starts_at
  `).all(today);

  const rosterStmt=db.prepare(`
    SELECT st.id,st.display_name,e.cohort_tier,e.current_level
    FROM enrollments e JOIN students st ON st.id=e.student_id
    WHERE e.program_id=? AND e.status='active'
    ORDER BY st.display_name
  `);
  const attendanceStmt=db.prepare(`
    SELECT student_id,status,comprehension_score,engagement_flag,note
    FROM attendance WHERE session_id=?
  `);
  const lessonStmt=db.prepare(`
    SELECT l.id,l.title,l.objective,sl.delivery_stage,sl.sequence_no
    FROM session_lessons sl JOIN lessons l ON l.id=sl.lesson_id
    WHERE sl.session_id=? ORDER BY sl.sequence_no,l.title
  `);
  const todaySessions=sessions.map(session=>{
    const roster=rosterStmt.all(session.program_id);
    const attendance=attendanceStmt.all(session.id);
    const attendanceByStudent=new Map(attendance.map(row=>[row.student_id,row]));
    return {
      ...session,
      roster:roster.map(student=>({...student,attendance:attendanceByStudent.get(student.id)||null})),
      lessons:lessonStmt.all(session.id)
    };
  });

  const upcomingSessions=db.prepare(`
    SELECT cs.id,cs.starts_at,cs.duration_minutes,cs.week_no,cs.title,cs.status,
           p.id AS program_id,p.name AS program_name,p.program_type,p.planned_weeks,COALESCE(cs.instruction_locale,p.instruction_locale,'en') AS instruction_locale,
           s.name AS school_name,
           (SELECT COUNT(*) FROM enrollments e WHERE e.program_id=p.id AND e.status='active') AS roster_count
    FROM class_sessions cs JOIN programs p ON p.id=cs.program_id
    LEFT JOIN schools s ON s.id=p.school_id
    WHERE substr(cs.starts_at,1,10)>? AND substr(cs.starts_at,1,10)<=? AND cs.status!='cancelled'
    ORDER BY cs.starts_at
  `).all(today,nextWeek);

  const alerts=[];
  const lowComprehension=db.prepare(`
    SELECT st.id,st.display_name,a.comprehension_score,cs.starts_at,p.name AS program_name
    FROM attendance a JOIN students st ON st.id=a.student_id
    JOIN class_sessions cs ON cs.id=a.session_id JOIN programs p ON p.id=cs.program_id
    WHERE a.comprehension_score IS NOT NULL AND a.comprehension_score<=2
    ORDER BY cs.starts_at DESC LIMIT 10
  `).all();
  for(const row of lowComprehension)alerts.push({kind:'comprehension',priority:'high',studentId:row.id,message:`${row.display_name}: comprensión ${row.comprehension_score}/5 en ${row.program_name}`});

  const recentFindings=db.prepare(`
    SELECT st.id,st.display_name,f.finding_type,f.severity,f.note,cs.title AS skill_title
    FROM student_game_findings f JOIN students st ON st.id=f.student_id
    LEFT JOIN curriculum_skills cs ON cs.id=f.skill_id
    WHERE f.severity>=4 ORDER BY f.created_at DESC LIMIT 10
  `).all();
  for(const row of recentFindings)alerts.push({kind:'game_finding',priority:'high',studentId:row.id,message:`${row.display_name}: ${row.finding_type}${row.skill_title?' · '+row.skill_title:''}`});
  const programs=db.prepare(`
    SELECT p.id,p.name,p.program_type,p.status,p.start_date,p.end_date,p.planned_weeks,p.instruction_locale,
           s.name AS school_name,
           (SELECT COUNT(*) FROM enrollments e WHERE e.program_id=p.id AND e.status='active') AS active_students,
           (SELECT MAX(week_no) FROM class_sessions cs WHERE cs.program_id=p.id AND cs.status='completed') AS completed_week
    FROM programs p LEFT JOIN schools s ON s.id=p.school_id
    WHERE p.status IN ('planned','active') ORDER BY COALESCE(p.start_date,''),p.name
  `).all();

  return {
    date:today,
    totals:{
      activeStudents:db.prepare("SELECT COUNT(*) AS n FROM students WHERE status='active'").get().n,
      activePrograms:db.prepare("SELECT COUNT(*) AS n FROM programs WHERE status='active'").get().n,
      todaySessions:todaySessions.length,
      alerts:alerts.length
    },
    todaySessions,
    upcomingSessions,
    alerts,
    programs
  };
}
