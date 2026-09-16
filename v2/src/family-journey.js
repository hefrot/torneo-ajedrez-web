const copy={
  en:{
    assessment:['Find starting level','Complete the CIS skills assessment so training starts at the right point.'],
    practice:['Build the weak spots','Complete personalized puzzles or a targeted practice mission.'],
    bot:['Test practical strength','Play a CIS Bot Challenge to test skills under game conditions.'],
    coach:['Get the next lesson plan','Your coach reviews the evidence and approves the next training focus.'],
    report:['See progress clearly','A published family report summarizes progress and next steps.'],
    waitCoach:['Coach review in progress','Training evidence is ready. Your coach can now approve the next focus.'],
    done:['Keep improving','Your current training cycle is complete. Keep playing and practicing for the next update.']
  },
  es:{
    assessment:['Encontrar el nivel inicial','Completa la evaluación CIS para comenzar en el punto correcto.'],
    practice:['Fortalecer puntos débiles','Completa puzzles personalizados o una práctica dirigida.'],
    bot:['Probar fuerza práctica','Juega un CIS Bot Challenge para probar habilidades en condiciones de partida.'],
    coach:['Recibir el siguiente plan','Tu coach revisa la evidencia y aprueba el próximo enfoque.'],
    report:['Ver el progreso claramente','Un reporte familiar publicado resume progreso y próximos pasos.'],
    waitCoach:['Revisión del coach en proceso','La evidencia de entrenamiento está lista para que tu coach apruebe el siguiente enfoque.'],
    done:['Seguir mejorando','El ciclo actual está completo. Sigue jugando y practicando para la próxima actualización.']
  }
};
const lang=v=>String(v||'en').toLowerCase()==='es'?'es':'en';
const one=db=>sql=>(...params)=>Boolean(db.prepare(sql).get(...params));

export function familyJourney(db,studentId,{locale='en'}={}){
  const l=lang(locale),exists=one(db);
  if(!exists('SELECT 1 FROM students WHERE id=?')(studentId))return null;
  const assessment=exists("SELECT 1 FROM diagnostic_attempts WHERE student_id=? AND status='completed' LIMIT 1")(studentId)||exists("SELECT 1 FROM student_curriculum_placements WHERE student_id=? AND framework_id='FRAMEWORK-HMENA-2500' LIMIT 1")(studentId);
  const correctPuzzles=Number(db.prepare("SELECT COUNT(*) AS n FROM training_puzzle_attempts WHERE student_id=? AND correct=1").get(studentId)?.n||0);
  const practiceMission=exists("SELECT 1 FROM assignments WHERE student_id=? AND title LIKE 'CIS Practice · %' AND status IN ('submitted','completed') LIMIT 1")(studentId);
  const practice=correctPuzzles>=3||practiceMission;
  const bot=exists("SELECT 1 FROM cis_bot_challenges WHERE student_id=? AND status IN ('passed','failed') LIMIT 1")(studentId);
  const coach=exists("SELECT 1 FROM coach_lesson_decisions WHERE student_id=? AND decision IN ('accepted','overridden') LIMIT 1")(studentId);
  const report=exists("SELECT 1 FROM progress_reports WHERE student_id=? AND status='published' LIMIT 1")(studentId);
  const states={assessment,practice,bot,coach,report};
  const order=['assessment','practice','bot','coach','report'];
  const completed=order.filter(k=>states[k]).length;
  let current=order.find(k=>!states[k])||'done';
  if(current==='coach'&&!coach)current='waitCoach';
  const steps=order.map((key,index)=>({
    key,index:index+1,complete:states[key],title:copy[l][key][0],description:copy[l][key][1]
  }));
  const mission=current==='done'
    ?{kind:'done',title:copy[l].done[0],description:copy[l].done[1]}
    :current==='waitCoach'
      ?{kind:'coach',title:copy[l].waitCoach[0],description:copy[l].waitCoach[1]}
      :{kind:current,title:copy[l][current][0],description:copy[l][current][1]};
  const recentCorrect=Number(db.prepare("SELECT COUNT(*) AS n FROM training_puzzle_attempts WHERE student_id=? AND correct=1 AND attempted_at>=datetime('now','-7 day')").get(studentId)?.n||0);
  const recentBotGames=Number(db.prepare(`SELECT COUNT(*) AS n FROM cis_bot_games g JOIN cis_bot_challenges c ON c.id=g.challenge_id
    WHERE c.student_id=? AND g.status='completed' AND COALESCE(g.completed_at,g.started_at)>=datetime('now','-7 day')`).get(studentId)?.n||0);
  const activePuzzles=Number(db.prepare("SELECT COUNT(*) AS n FROM training_puzzles WHERE student_id=? AND status='active'").get(studentId)?.n||0);
  return {
    studentId,steps,completed,total:order.length,percent:Math.round(completed/order.length*100),mission,
    activity:{correctPuzzles7d:recentCorrect,botGames7d:recentBotGames,activePuzzles}
  };
}
