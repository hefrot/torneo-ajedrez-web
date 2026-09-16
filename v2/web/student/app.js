const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=localStorage.getItem('hmena_student_session')||'';
let locale=localStorage.getItem('hmena_portal_locale')||null;
const copy={
  en:{brand:'MY PROGRESS',logout:'Log out',private:'Private access',title:'My Progress',help:'Enter the username and code your coach gave you.',username:'Username',code:'Code',login:'Sign in',subtitle:'A clear path from real games to better chess.',student:'Student',attendance:'Attendance',comprehension:'Comprehension',accounts:'Chess accounts',ratings:'Rating progress',priorities:'Learning priorities',classes:'Upcoming classes',assignments:'Assignments',notes:'Notes shared by your coach',noRatings:'Link Lichess or Chess.com to start tracking rating.',noPriorities:'No learning priorities calculated yet.',noClasses:'No upcoming classes scheduled.',noAssignments:'No pending assignments.',pending:'HMENA assessment pending',hello:'Hello',noStudents:'No students are linked to this account.',days:'days tracked',language:'Class language',en:'English',es:'Spanish',bilingual:'Bilingual',ratingAlt:'Rating progress',nextPlan:'Coach-approved next focus',nextPlanEmpty:'Your coach has not approved a next focus yet.',training:'Training insights',coachInsight:'Coach insight',leaks:'Where points are leaking',mistakePuzzles:'Mistake puzzles',recommendedLesson:'Recommended lesson',noTraining:'Play or link more games to build your training profile.',diagnostic:'HMENA 0–800 Diagnostic',diagnostic1200:'HMENA 800–1200 Diagnostic',startDiagnostic:'Start diagnostic',competitiveFundamentals:'Competitive Fundamentals',ready1200:'Ready for 1200–1600',continueDiagnostic:'Continue diagnostic',question:'Question',answer:'Answer',next:'Next',diagnosticDone:'Diagnostic complete',foundations:'Foundations',development:'Development',gaps:'Skills to reinforce',noGaps:'No gaps detected in this screening.',close:'Close',score:'Score',ready800:'Ready for the 800–1200 diagnostic',placementResult:'Placement result',puzzleInstruction:'Find the best move',selectMove:'Tap a piece, then its destination square.',correctMove:'Correct!',tryAgain:'Try again.',noPuzzles:'No mistake puzzles yet.',openingTrainer:'Opening trainer',openingFocus:'Opening focus',noOpeningData:'Play more linked games to build your opening profile.',openingGames:'games',openingCpl:'opening avg CP loss',openingErrors:'critical opening errors',reports:'Progress reports',noReports:'No progress report has been published yet.',reportSkills:'Skills secured',reportPractice:'Skills in practice',reportRatings:'Rating changes',reportNext:'Next focus'},
  es:{brand:'MI PROGRESO',logout:'Cerrar sesión',private:'Acceso privado',title:'Mi progreso',help:'Ingresa el usuario y código que te dio tu coach.',username:'Usuario',code:'Código',login:'Entrar',subtitle:'Un camino claro desde partidas reales hacia un mejor ajedrez.',student:'Alumno',attendance:'Asistencia',comprehension:'Comprensión',accounts:'Cuentas de ajedrez',ratings:'Progreso de rating',priorities:'Prioridades de aprendizaje',classes:'Próximas clases',assignments:'Tareas',notes:'Notas compartidas por tu coach',noRatings:'Vincula Lichess o Chess.com para empezar a medir tu rating.',noPriorities:'Aún no hay prioridades de aprendizaje calculadas.',noClasses:'No hay próximas clases cargadas.',noAssignments:'No hay tareas pendientes.',pending:'Evaluación HMENA pendiente',hello:'Hola',noStudents:'No hay alumnos vinculados a esta cuenta.',days:'días registrados',language:'Idioma de la clase',en:'Inglés',es:'Español',bilingual:'Bilingüe',ratingAlt:'Progreso de rating',nextPlan:'Próximo enfoque aprobado por tu coach',nextPlanEmpty:'Tu coach todavía no ha aprobado el siguiente enfoque.',training:'Inteligencia de entrenamiento',coachInsight:'Insight del coach',leaks:'Dónde se escapan los puntos',mistakePuzzles:'Problemas de tus errores',recommendedLesson:'Lección recomendada',noTraining:'Juega o vincula más partidas para construir tu perfil de entrenamiento.',diagnostic:'Diagnóstico HMENA 0–800',diagnostic1200:'Diagnóstico HMENA 800–1200',startDiagnostic:'Comenzar diagnóstico',competitiveFundamentals:'Fundamentos competitivos',ready1200:'Listo para 1200–1600',continueDiagnostic:'Continuar diagnóstico',question:'Pregunta',answer:'Responder',next:'Siguiente',diagnosticDone:'Diagnóstico completado',foundations:'Fundamentos',development:'Desarrollo',gaps:'Habilidades por reforzar',noGaps:'No se detectaron huecos en este diagnóstico.',close:'Cerrar',score:'Puntuación',ready800:'Listo para el diagnóstico 800–1200',placementResult:'Resultado de colocación',puzzleInstruction:'Encuentra la mejor jugada',selectMove:'Toca una pieza y después su casilla de destino.',correctMove:'¡Correcto!',tryAgain:'Intenta de nuevo.',noPuzzles:'Aún no hay problemas creados desde tus errores.',openingTrainer:'Entrenador de aperturas',openingFocus:'Prioridad de apertura',noOpeningData:'Juega más partidas vinculadas para construir tu perfil de aperturas.',openingGames:'partidas',openingCpl:'pérdida CP promedio en apertura',openingErrors:'errores críticos de apertura',reports:'Reportes de progreso',noReports:'Aún no hay un reporte de progreso publicado.',reportSkills:'Habilidades consolidadas',reportPractice:'Habilidades en práctica',reportRatings:'Cambios de rating',reportNext:'Próximo enfoque'}
};
Object.assign(copy.en,{botArena:'CIS Chess Bot Arena',botHelp:'Pass practical challenges against calibrated CIS bots.',botLocked:'Locked',botPassed:'Passed',botRecommended:'Recommended',botStart:'Start challenge',botLevel:'CIS level',botGame:'Game',botNext:'Next game',botPoints:'Points',botPractical:'Practical strength',botPass:'Challenge passed',botFail:'Challenge not passed',yourColor:'Your color',white:'White',black:'Black'});
Object.assign(copy.es,{botArena:'CIS Chess Bot Arena',botHelp:'Supera retos prácticos contra bots CIS calibrados.',botLocked:'Bloqueado',botPassed:'Aprobado',botRecommended:'Recomendado',botStart:'Comenzar reto',botLevel:'Nivel CIS',botGame:'Partida',botNext:'Siguiente partida',botPoints:'Puntos',botPractical:'Fuerza práctica',botPass:'Reto aprobado',botFail:'Reto no aprobado',yourColor:'Tu color',white:'Blancas',black:'Negras'});
Object.assign(copy.en,{journey:'Chess journey',todayMission:'Today’s mission',currentSnapshot:'Current snapshot',gamesReviewed:'Games reviewed',personalPuzzles:'Personalized puzzles',rapidExperience:'Rapid experience',workOn:'What we’re working on',practiceLab:'Practice Lab',practiceIntro:'Training chosen from real game evidence.',externalPractice:'Lichess practice',openPractice:'Open practice',markDone:'I completed this',reportedDone:'Completed · awaiting coach review',coachConfirmed:'Completed',trackingNote:'External Lichess work is student-reported until coach review.',assessmentMission:'Starting CIS level',assessmentHelp:'A short adaptive assessment uses rating context but still checks the skills that matter.',startLevelCheck:'Start level check',botWarmup:'Practical challenge',botAssessmentFirst:'Complete the level check to unlock the recommended CIS Bot starting point.',recentRecord:'Recent analyzed games',nextClass:'Next class',allRatings:'All linked ratings',experience:'games',milestones:'Training path',linked:'Account linked',assessed:'Level assessed',practiceStep:'Practice evidence',coachPlanStep:'Coach plan',openingsTitle:'Opening patterns',technicalHidden:'Technical engine details stay with the coach.',accountConnected:'Connected',submitted:'Submitted'});
Object.assign(copy.es,{journey:'Ruta de ajedrez',todayMission:'Misión de hoy',currentSnapshot:'Estado actual',gamesReviewed:'Partidas revisadas',personalPuzzles:'Problemas personalizados',rapidExperience:'Experiencia Rapid',workOn:'En qué estamos trabajando',practiceLab:'Laboratorio de práctica',practiceIntro:'Entrenamiento elegido desde evidencia real de sus partidas.',externalPractice:'Práctica en Lichess',openPractice:'Abrir práctica',markDone:'Ya lo completé',reportedDone:'Completado · pendiente de revisión',coachConfirmed:'Completado',trackingNote:'La práctica externa de Lichess queda reportada por el alumno hasta revisión del coach.',assessmentMission:'Nivel CIS inicial',assessmentHelp:'Un diagnóstico adaptativo usa el contexto de rating, pero comprueba las habilidades importantes.',startLevelCheck:'Comenzar evaluación',botWarmup:'Reto práctico',botAssessmentFirst:'Completa la evaluación para desbloquear el nivel inicial recomendado del CIS Bot.',recentRecord:'Partidas analizadas recientes',nextClass:'Próxima clase',allRatings:'Todos los ratings vinculados',experience:'partidas',milestones:'Ruta de entrenamiento',linked:'Cuenta vinculada',assessed:'Nivel evaluado',practiceStep:'Evidencia de práctica',coachPlanStep:'Plan del coach',openingsTitle:'Patrones de apertura',technicalHidden:'Los detalles técnicos del motor se quedan con el coach.',accountConnected:'Conectada',submitted:'Enviado'});
const t=key=>copy[locale||'en']?.[key]||copy.en[key]||key;
function applyStatic(){if(!locale)return;document.documentElement.lang=locale;document.title=`${t('title')} · CIS Chess`;$('#locale-select').value=locale;$('#brand-sub').textContent=t('brand');$('#logout').textContent=t('logout');$('#login-eyebrow').textContent=t('private');$('#login-title').textContent=t('title');$('#login-help').textContent=t('help');$('#username-label').textContent=t('username');$('#code-label').textContent=t('code');$('#login-button').textContent=t('login');$('#portal-subtitle').textContent=t('subtitle');}

async function api(path,options={}){
  const headers={...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})};
  const response=await fetch(path,{...options,headers:{...headers,...(options.headers||{})}});
  const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`); return data;
}
function sparkline(points=[]){
  if(!points.length)return `<div class="empty">${t('noRatings')}</div>`;
  const vals=points.map(p=>Number(p.rating));const min=Math.min(...vals),max=Math.max(...vals),span=Math.max(1,max-min),w=300,h=80,pad=8;
  const coords=vals.map((v,i)=>`${pad+(i*(w-2*pad)/Math.max(1,vals.length-1))},${h-pad-((v-min)/span)*(h-2*pad)}`).join(' ');
  return `<svg class="rating-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(t('ratingAlt'))}"><polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`;
}
function ratingCards(ratings){
  if(!ratings?.series?.length)return `<div class="empty">${t('noRatings')}</div>`;
  return ratings.series.map(s=>`<article class="rating-card"><div class="rating-head"><strong>${esc(s.platform)} · ${esc(s.ratingType)}</strong><span>${s.latestRating} <small>${s.delta>=0?'+':''}${s.delta}</small></span></div>${sparkline(s.points)}<small>${esc(s.username)} · ${s.points.length} ${t('days')}</small></article>`).join('');
}
const chessPieces={p:'♟',r:'♜',n:'♞',b:'♝',q:'♛',k:'♚',P:'♙',R:'♖',N:'♘',B:'♗',Q:'♕',K:'♔'};
function fenSquares(fen){
  const [placement,turn='w']=String(fen||'').split(/\s+/);const map=new Map();
  (placement||'').split('/').forEach((row,ri)=>{let file=0;for(const ch of row){if(/\d/.test(ch)){file+=Number(ch);continue;}const square=String.fromCharCode(97+file)+(8-ri);map.set(square,ch);file++;}});
  return {map,turn};
}
function puzzleBoard(p,studentId){
  if(!p?.fen)return '';
  const {map,turn}=fenSquares(p.fen),files=turn==='b'?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h'],ranks=turn==='b'?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
  const squares=[];for(const rank of ranks)for(const file of files){const sq=file+rank,piece=map.get(sq)||'',fi=file.charCodeAt(0)-97,light=(fi+rank)%2===1;squares.push(`<button type="button" class="puzzle-square ${light?'light':'dark'}" data-square="${sq}" data-piece="${piece}">${chessPieces[piece]||''}</button>`);}
  return `<article class="mistake-puzzle" data-student-id="${esc(studentId)}" data-puzzle-id="${esc(p.id)}" data-turn="${esc(turn)}"><div class="puzzle-meta"><strong>${esc(p.skillTitle||t('mistakePuzzles'))}</strong><small>${t('puzzleInstruction')}</small></div><div class="puzzle-board">${squares.join('')}</div><small class="puzzle-help">${t('selectMove')}</small><div class="puzzle-result" aria-live="polite"></div></article>`;
}

function diagnosticBoard(fen){
  if(!fen)return '';
  const {map,turn}=fenSquares(fen),files=turn==='b'?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h'],ranks=turn==='b'?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
  const squares=[];for(const rank of ranks)for(const file of files){const sq=file+rank,piece=map.get(sq)||'',fi=file.charCodeAt(0)-97,light=(fi+rank)%2===1;squares.push(`<span class="puzzle-square diagnostic-square ${light?'light':'dark'}">${chessPieces[piece]||''}</span>`);}
  return `<div class="puzzle-board diagnostic-board" aria-label="Chess position">${squares.join('')}</div>`;
}

function openingTrainerBlock(profile){
  if(!profile?.gamesAnalyzed)return `<div class="empty">${t('noOpeningData')}</div>`;
  const rows=profile.openings?.slice(0,5).map(o=>`<li><strong>${esc(o.openingName)}</strong>${o.openingEco?` · ${esc(o.openingEco)}`:''}<br><small>${o.games} ${t('openingGames')} · ${o.wins}W/${o.losses}L/${o.draws}D · ${t('openingCpl')}: ${o.openingAvgCpLoss??'—'} · ${t('openingErrors')}: ${o.criticalOpeningErrors}</small></li>`).join('')||'';
  return `<div class="next-lesson-box"><small>${t('openingFocus')}</small><strong>${esc(profile.focusText||t('noOpeningData'))}</strong></div><ul>${rows}</ul>`;
}
function reportCards(reports=[]){
  if(!reports.length)return `<div class="empty">${t('noReports')}</div>`;
  const date=v=>new Date(v).toLocaleDateString(locale==='es'?'es-MX':'en-US',{year:'numeric',month:'short',day:'numeric'});
  return reports.map(row=>{const r=row.report||{},mastered=r.skills?.mastered?.slice(0,5).map(x=>esc(x.title)).join(', ')||'—',practicing=r.skills?.practicing?.slice(0,5).map(x=>esc(x.title)).join(', ')||'—';const ratings=(r.ratings||[]).filter(x=>x.delta!==0).slice(0,4).map(x=>`${esc(x.platform)} ${esc(x.ratingType)}: ${x.delta>0?'+':''}${x.delta}`).join(' · ')||'—';const next=r.nextFocus?.lesson?.title||r.nextFocus?.skill?.title||r.noFocus||'—';return `<article class="progress-report-card"><div class="coach-card-head"><strong>${date(row.periodStart)} – ${date(row.periodEnd)}</strong><span class="status-badge">${esc(row.status)}</span></div><p>${esc(r.headline||'')}</p><p><strong>${t('reportSkills')}:</strong> ${mastered}</p><p><strong>${t('reportPractice')}:</strong> ${practicing}</p><p><strong>${t('reportRatings')}:</strong> ${ratings}</p><p><strong>${t('reportNext')}:</strong> ${esc(next)}</p></article>`;}).join('');
}
function familyFindingLabel(item){
  if(item?.skillTitle)return item.skillTitle;
  const labels={
    en:{engine_blunder:'One-move blunders',engine_mistake:'Move accuracy',opening_error:'Opening decisions',missed_forcing_move:'Checks, Captures & Threats',missed_capture:'Hanging pieces',missed_fork:'Forks & double attacks',missed_pin:'Pins',missed_skewer:'Skewers'},
    es:{engine_blunder:'Errores de una jugada',engine_mistake:'Precisión de jugadas',opening_error:'Decisiones de apertura',missed_forcing_move:'Jaques, Capturas y Amenazas',missed_capture:'Piezas colgadas',missed_fork:'Tenedores y ataques dobles',missed_pin:'Clavadas',missed_skewer:'Enfiladas'}
  };
  return labels[locale||'en']?.[item?.findingType]||String(item?.findingType||'').replaceAll('_',' ');
}
function primaryRating(ratings){
  const series=ratings?.series||[];const priority=['rapid','classical','blitz','bullet','daily'];
  return [...series].sort((a,b)=>priority.indexOf(a.ratingType)-priority.indexOf(b.ratingType))[0]||null;
}
function formatClassTime(value){
  if(!value)return '—';const d=new Date(value);if(Number.isNaN(d.getTime()))return value;
  return new Intl.DateTimeFormat(locale==='es'?'es-MX':'en-US',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d);
}
function recentRecord(reviews=[]){
  const rows=reviews.slice(0,6),wins=rows.filter(x=>x.result==='win').length,losses=rows.filter(x=>x.result==='loss').length,draws=rows.filter(x=>x.result==='draw').length;
  return {total:rows.length,wins,losses,draws,text:locale==='es'?`${wins}G · ${losses}P · ${draws}T`:`${wins}W · ${losses}L · ${draws}D`};
}
function familyLeaks(training){
  const all=training?.topLeaks||[],preferred=[...all.filter(x=>x.skillTitle),...all.filter(x=>!x.skillTitle)];const seen=new Set(),out=[];
  for(const item of preferred){const label=familyFindingLabel(item);if(!label||seen.has(label))continue;seen.add(label);out.push({...item,label});if(out.length===3)break;}return out;
}
function practiceMissionCards(s){
  const missions=s.practiceMissions||[];
  if(!missions.length)return `<div class="empty">${t('noTraining')}</div>`;
  return missions.map(m=>{const done=m.status==='completed',submitted=m.status==='submitted';return `<article class="practice-mission ${done?'done':''} ${submitted?'submitted':''}"><div class="practice-source"><span>♞</span><small>${t('externalPractice')}</small></div><strong>${esc(m.title)}</strong><p>${esc(m.description)}</p><div class="practice-actions"><a class="btn btn-secondary practice-open" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">${t('openPractice')} ↗</a>${done?`<span class="mission-status status-ok">✓ ${t('coachConfirmed')}</span>`:submitted?`<span class="mission-status status-warn">✓ ${t('reportedDone')}</span>`:`<button class="btn btn-secondary submit-practice" data-student-id="${esc(s.id)}" data-assignment-id="${esc(m.id)}" type="button">${t('markDone')}</button>`}</div></article>`;}).join('');
}
function milestoneStrip(s){
  const linked=(s.ratings?.accounts?.length||0)>0,assessed=Boolean(s.placement),practice=(s.training?.puzzles||[]).some(x=>x.status==='mastered')||(s.practiceMissions||[]).some(x=>['submitted','completed'].includes(x.status)),coachPlan=Boolean(s.nextPlan);
  const rows=[[linked,t('linked')],[assessed,t('assessed')],[practice,t('practiceStep')],[coachPlan,t('coachPlanStep')]];
  return `<div class="journey-steps">${rows.map(([ok,label],i)=>`<div class="journey-step ${ok?'done':''}"><span>${ok?'✓':i+1}</span><small>${label}</small></div>`).join('')}</div>`;
}
function assessmentCta(s){
  const band=s.placement?.bandCode;if(band&& !['hmena-0-400','hmena-400-800','hmena-800-1200'].includes(band))return '';
  const level=band==='hmena-800-1200'?'1200':'0800',title=level==='1200'?t('diagnostic1200'):(locale==='es'?`Encontrar el nivel CIS inicial de ${esc(s.displayName)}`:`Find ${esc(s.displayName)}’s starting CIS level`);
  return `<div class="family-mission-card"><div><span class="eyebrow">${t('todayMission')}</span><h3>${esc(title)}</h3><p>${t('assessmentHelp')}</p></div><button class="btn btn-primary start-diagnostic" data-student-id="${esc(s.id)}" data-diagnostic-level="${level}" type="button">${t('startLevelCheck')}</button></div>`;
}
function botArenaBlock(arena,studentId,placement){
  if(!arena?.bots?.length)return '';
  const hasPlacement=Boolean(placement);
  const cards=arena.bots.map(b=>{const state=b.passed?t('botPassed'):!b.unlocked?t('botLocked'):(hasPlacement&&b.recommended?t('botRecommended'):'');const score=b.lastChallenge?.summary?.points;return `<article class="bot-rung ${b.passed?'passed':''} ${!b.unlocked?'locked':''}"><div><strong>${esc(b.name)}</strong><small>${t('botLevel')} ${b.targetLevel}${state?` · ${state}`:''}</small>${score!=null?`<small>${t('botPoints')}: ${score}/3</small>`:''}</div>${b.unlocked&&!b.passed?`<button class="btn btn-secondary start-bot-challenge" data-student-id="${esc(studentId)}" data-bot-code="${esc(b.code)}" type="button">${hasPlacement?t('botStart'):t('botWarmup')}</button>`:''}</article>`;}).join('');
  return `${!hasPlacement?`<div class="next-lesson-box"><small>${t('botArena')}</small><strong>${t('botAssessmentFirst')}</strong></div>`:''}<div class="bot-ladder">${cards}</div>`;
}
function studentCard(s){
  const rating=primaryRating(s.ratings),reviews=s.training?.reviews||[],record=recentRecord(reviews),leaks=familyLeaks(s.training),reviewed=s.training?.summary?.reviewedGames||reviews.length,puzzleCount=s.training?.activePuzzles||0;
  const ratingLabel=rating?`${rating.latestRating}`:'—',ratingMeta=rating?`${rating.platform} ${rating.ratingType} · ${rating.points?.[rating.points.length-1]?.gamesCount??'—'} ${t('experience')}`:t('noRatings');
  const placement=s.placement?`${esc(s.placement.bandTitle)} · ${s.placement.ratingMin}–${s.placement.ratingMax}`:t('pending');
  const nextClass=s.upcoming?.[0];
  const priorities=leaks.length?leaks.map((x,i)=>`<article class="focus-card"><span>${i+1}</span><div><strong>${esc(x.label)}</strong><small>${x.occurrences}× ${locale==='es'?'detectado en partidas analizadas':'seen in analyzed games'}${x.recommendedLesson?` · ${esc(x.recommendedLesson.title)}`:''}</small></div></article>`).join(''):`<div class="empty">${t('noPriorities')}</div>`;
  const puzzles=s.training?.puzzles?.filter(p=>p.status==='active').slice(0,3).map(p=>puzzleBoard(p,s.id)).join('')||`<div class="empty">${t('noPuzzles')}</div>`;
  const assignments=s.assignments?.map(x=>`<li><strong>${esc(x.title)}</strong>${x.dueAt?` · ${formatClassTime(x.dueAt)}`:''}</li>`).join('')||`<li>${t('noAssignments')}</li>`;
  const notes=s.sharedCoachNotes?.map(x=>`<li>${esc(x.note)}</li>`).join('')||'';
  const nextPlan=s.nextPlan?`<div class="next-focus-card status-ok"><small>${t('nextPlan')}</small><strong>${esc(s.nextPlan.lesson?.title||s.nextPlan.skill?.title||'—')}</strong>${s.nextPlan.lesson?.objective?`<p>${esc(s.nextPlan.lesson.objective)}</p>`:''}</div>`:`<div class="next-focus-card"><small>${t('nextPlan')}</small><strong>${t('nextPlanEmpty')}</strong></div>`;
  return `<article class="panel student-progress-card family-dashboard">
    <section class="family-hero"><div><span class="eyebrow">${t('journey')}</span><h2>${esc(s.displayName)}</h2><p>${placement}</p></div><div class="rating-spotlight"><small>${rating?.ratingType?esc(rating.ratingType.toUpperCase()):t('ratings')}</small><strong>${ratingLabel}</strong><span>${esc(ratingMeta)}</span></div></section>
    ${milestoneStrip(s)}
    ${assessmentCta(s)}
    <section class="family-section"><div class="family-section-head"><div><span>${t('currentSnapshot')}</span><h3>${t('recentRecord')}</h3></div></div><div class="family-metrics"><article><strong>${reviewed}</strong><span>${t('gamesReviewed')}</span></article><article><strong>${puzzleCount}</strong><span>${t('personalPuzzles')}</span></article><article><strong>${record.text}</strong><span>${record.total} ${t('gamesReviewed').toLowerCase()}</span></article><article><strong>${nextClass?formatClassTime(nextClass.startsAt):'—'}</strong><span>${t('nextClass')}</span></article></div></section>
    <section class="family-section"><div class="family-section-head"><div><span>${t('workOn')}</span><h3>${locale==='es'?'3 prioridades claras':'3 clear priorities'}</h3></div><small>${t('technicalHidden')}</small></div><div class="focus-grid">${priorities}</div></section>
    <section class="family-section practice-lab"><div class="family-section-head"><div><span>${t('practiceLab')}</span><h3>${t('practiceIntro')}</h3></div><small>${t('trackingNote')}</small></div><div class="practice-grid">${practiceMissionCards(s)}</div><h4>${t('mistakePuzzles')}</h4><div class="puzzle-grid">${puzzles}</div></section>
    <section class="family-section"><div class="family-section-head"><div><span>${t('botArena')}</span><h3>${t('botHelp')}</h3></div></div>${botArenaBlock(s.botArena,s.id,s.placement)}</section>
    <section class="family-section">${nextPlan}</section>
    <details class="family-details"><summary>${t('allRatings')}</summary><div class="rating-grid">${ratingCards(s.ratings)}</div></details>
    <details class="family-details"><summary>${t('openingsTitle')}</summary>${openingTrainerBlock(s.openingTrainer)}</details>
    <details class="family-details"><summary>${t('reports')}</summary><div class="report-grid">${reportCards(s.progressReports||[])}</div></details>
    <details class="family-details"><summary>${t('classes')} & ${t('assignments')}</summary><h4>${t('classes')}</h4><ul>${s.upcoming?.map(x=>`<li>${formatClassTime(x.startsAt)} · ${esc(x.schoolName||x.programName)} · ${t(x.instructionLocale||'en')}</li>`).join('')||`<li>${t('noClasses')}</li>`}</ul><h4>${t('assignments')}</h4><ul>${assignments}</ul>${notes?`<h4>${t('notes')}</h4><ul>${notes}</ul>`:''}</details>
  </article>`;
}

let activeDiagnosticId=null;
let activeDiagnosticLevel='0800';
function renderDiagnostic(state){
  $('#diagnostic-title').textContent=activeDiagnosticLevel==='1200'?t('diagnostic1200'):t('diagnostic');$('#diagnostic-close').textContent=t('close');
  if(state.status==='completed'){
    const sum=state.summary||{};const gaps=(sum.gaps||[]).map(g=>`<li><strong>${esc(g.title||g.code)}</strong></li>`).join('')||`<li>${t('noGaps')}</li>`;
    if(activeDiagnosticLevel==='1200'){const pct=sum.competitiveFundamentals?.percent??0;$('#diagnostic-body').innerHTML=`<div class="diagnostic-result"><span class="eyebrow">${t('diagnosticDone')}</span><h2>${t('placementResult')}: ${esc(state.placementBandCode||'—')}</h2><div class="profile-stats"><article><strong>${pct}%</strong><span>${t('competitiveFundamentals')}</span></article><article><strong>${sum.cleared1200?'1200+':'800–1200'}</strong><span>${sum.cleared1200?t('ready1200'):t('score')}</span></article></div><h3>${t('gaps')}</h3><ul>${gaps}</ul></div>`;return;}
    const foundationValue=sum.foundations?.skipped?'—':`${sum.foundations?.percent??0}%`;
    const seedNote=activeDiagnosticLevel==='0800'&&state.entryBasis==='rating_seed'?`<div class="next-lesson-box"><small>${t('foundationSkipped')}</small><p>${t('ratingSeed')}</p></div>`:'';
    const checkNote=sum.foundationCheckRecommended?`<div class="next-lesson-box status-warn"><strong>${t('foundationCheck')}</strong></div>`:'';
    $('#diagnostic-body').innerHTML=`<div class="diagnostic-result"><span class="eyebrow">${t('diagnosticDone')}</span><h2>${t('placementResult')}: ${esc(state.placementBandCode||'—')}</h2>${seedNote}<div class="profile-stats"><article><strong>${foundationValue}</strong><span>${t('foundations')}</span></article><article><strong>${sum.development?.total?sum.development.percent+'%':'—'}</strong><span>${t('development')}</span></article><article><strong>${sum.cleared0800?'800+':'—'}</strong><span>${sum.cleared0800?t('ready800'):t('score')}</span></article></div>${checkNote}<h3>${t('gaps')}</h3><ul>${gaps}</ul></div>`;
    return;
  }
  const q=state.item;if(!q){$('#diagnostic-body').innerHTML='<div class="empty">—</div>';return;}
  const stageLabel=activeDiagnosticLevel==='1200'?t('competitiveFundamentals'):(q.isAnchor?(locale==='es'?'Chequeo esencial':'Anchor check'):(q.stage==='foundations'?t('foundations'):t('development')));
  const options=q.options.map((option,index)=>{const key=String.fromCharCode(65+index);return `<label class="diagnostic-option"><input type="radio" name="diagnostic-answer" value="${key}"><span><strong>${key}.</strong> ${esc(option)}</span></label>`}).join('');
  const seedNote=activeDiagnosticLevel==='0800'&&state.entryBasis==='rating_seed'?`<div class="next-lesson-box"><small>${t('foundationSkipped')}</small><p>${t('ratingSeed')}</p></div>`:'';
  $('#diagnostic-body').innerHTML=`${seedNote}<div class="diagnostic-progress"><span>${stageLabel}</span><strong>${q.isAnchor?'':`${t('question')} ${q.sequence}`}</strong></div>${diagnosticBoard(q.fen)}<h2 class="diagnostic-prompt">${esc(q.prompt)}</h2><form id="diagnostic-form" data-item-id="${esc(q.id)}">${options}<button class="btn btn-primary" type="submit">${t('answer')}</button></form>`;
}
async function openDiagnostic(studentId,level='0800'){
  activeDiagnosticLevel=level;const base=level==='1200'?'diagnostic-1200':'diagnostic';
  const start=await api(`../api/portal/students/${encodeURIComponent(studentId)}/${base}/start`,{method:'POST',body:JSON.stringify({locale})});activeDiagnosticId=start.attemptId;
  const state=await api(`../api/portal/${base}/${encodeURIComponent(activeDiagnosticId)}?locale=${encodeURIComponent(locale)}`);renderDiagnostic(state);if(!$('#diagnostic-dialog').open)$('#diagnostic-dialog').showModal();
}
async function submitDiagnostic(form){
  const answer=form.querySelector('input[name="diagnostic-answer"]:checked')?.value;if(!answer)return;
  const base=activeDiagnosticLevel==='1200'?'diagnostic-1200':'diagnostic';const result=await api(`../api/portal/${base}/${encodeURIComponent(activeDiagnosticId)}/answer`,{method:'POST',body:JSON.stringify({itemId:form.dataset.itemId,answerKey:answer,locale})});
  if(result.completed){const state=await api(`../api/portal/${base}/${encodeURIComponent(activeDiagnosticId)}?locale=${encodeURIComponent(locale)}`);renderDiagnostic(state);await loadPortal();return;}
  renderDiagnostic(result.state);
}

let activeBotStudentId=null,activeBotChallengeId=null,activeBotGameId=null;
function botGameBoard(game){
  const {map}=fenSquares(game.fen),white=game.studentColor==='white',files=white?['a','b','c','d','e','f','g','h']:['h','g','f','e','d','c','b','a'],ranks=white?[8,7,6,5,4,3,2,1]:[1,2,3,4,5,6,7,8];
  const squares=[];for(const rank of ranks)for(const file of files){const sq=file+rank,piece=map.get(sq)||'',fi=file.charCodeAt(0)-97,light=(fi+rank)%2===1;squares.push(`<button type="button" class="puzzle-square bot-square ${light?'light':'dark'}" data-square="${sq}" data-piece="${piece}">${chessPieces[piece]||''}</button>`);}
  return `<div class="bot-game" data-game-id="${esc(game.id)}" data-student-color="${esc(game.studentColor)}"><div class="puzzle-board bot-board">${squares.join('')}</div><div class="bot-move-state" aria-live="polite"></div></div>`;
}
function renderBotGame(game,challenge=null){
  $('#bot-title').textContent=t('botArena');$('#bot-close').textContent=t('close');activeBotGameId=game?.id||null;
  if(game?.status==='completed'){
    const summary=challenge?.summary||{},finished=challenge&&challenge.status!=='in_progress';
    $('#bot-body').innerHTML=`<div class="next-lesson-box ${challenge?.status==='passed'?'status-ok':''}"><small>${t('botGame')} ${game.gameNo}/3</small><strong>${esc(game.result||'—')}</strong><p>${t('botPoints')}: ${summary.points??'—'}/3${summary.avgCpLoss!=null?` · Avg CPL ${summary.avgCpLoss}`:''}</p>${finished?`<p><strong>${challenge.status==='passed'?t('botPass'):t('botFail')}</strong></p><p>${t('botPractical')}: ${summary.practicalStrength??'—'}</p>`:`<button class="btn btn-primary next-bot-game" type="button">${t('botNext')}</button>`}</div>`;
    if(!$('#bot-dialog').open)$('#bot-dialog').showModal();return;
  }
  $('#bot-body').innerHTML=`<div class="diagnostic-progress"><span>${t('botGame')} ${game.gameNo}/3</span><strong>${t('yourColor')}: ${t(game.studentColor)}</strong></div>${botGameBoard(game)}<small class="puzzle-help">${t('selectMove')}</small>`;
  if(!$('#bot-dialog').open)$('#bot-dialog').showModal();
}
async function startBotGame(){const game=await api(`../api/portal/students/${encodeURIComponent(activeBotStudentId)}/bot-challenges/${encodeURIComponent(activeBotChallengeId)}/games/start`,{method:'POST'});renderBotGame(game);}
async function openBotChallenge(studentId,botCode){
  activeBotStudentId=studentId;const challenge=await api(`../api/portal/students/${encodeURIComponent(studentId)}/bot-challenges`,{method:'POST',body:JSON.stringify({botCode})});activeBotChallengeId=challenge.id;await startBotGame();
}
async function sendBotMove(card,from,to){
  const fromPiece=card.querySelector(`.bot-square[data-square="${CSS.escape(from)}"]`)?.dataset.piece||'';let moveUci=from+to;if(/[Pp]/.test(fromPiece)&&/[18]$/.test(to))moveUci+='q';
  const state=card.querySelector('.bot-move-state');state.textContent=locale==='es'?'Pensando…':'Thinking…';
  const result=await api(`../api/portal/students/${encodeURIComponent(activeBotStudentId)}/bot-games/${encodeURIComponent(activeBotGameId)}/move`,{method:'POST',body:JSON.stringify({moveUci})});
  renderBotGame(result.game,result.challenge);if(result.challenge&&result.challenge.status!=='in_progress')await loadPortal();
}

async function loadPortal(){
  const data=await api('../api/portal/me');
  if(data.locale&&data.locale!==locale){locale=data.locale;localStorage.setItem('hmena_portal_locale',locale);applyStatic();}
  $('#language-panel').hidden=true;$('#language-tools').hidden=false;$('#login-panel').hidden=true;$('#portal').hidden=false;$('#logout').hidden=false;
  $('#welcome').textContent=data.account.role==='guardian'?`${t('hello')}, ${data.account.displayName}`:t('title');
  $('#students').innerHTML=data.students.map(studentCard).join('')||`<div class="empty">${t('noStudents')}</div>`;
}
function chooseLanguage(nextLocale){locale=nextLocale;localStorage.setItem('hmena_portal_locale',locale);applyStatic();$('#language-panel').hidden=true;$('#language-tools').hidden=false;if(!token){$('#login-panel').hidden=false;$('#portal').hidden=true;}}
async function saveLocale(){localStorage.setItem('hmena_portal_locale',locale);applyStatic();if(token){await api('../api/portal/preferences',{method:'PATCH',body:JSON.stringify({preferredLocale:locale})});await loadPortal();}}
document.querySelectorAll('[data-locale]').forEach(button=>button.addEventListener('click',()=>chooseLanguage(button.dataset.locale)));
$('#locale-select').addEventListener('change',async event=>{locale=event.target.value;try{await saveLocale();}catch(e){$('#portal-error').textContent=e.message;}});
$('#login-form').addEventListener('submit',async event=>{event.preventDefault();$('#portal-error').textContent='';const payload=Object.fromEntries(new FormData(event.target).entries());try{const result=await api('../api/portal/login',{method:'POST',body:JSON.stringify(payload)});token=result.sessionToken;localStorage.setItem('hmena_student_session',token);if(result.account?.preferredLocale!==locale)await api('../api/portal/preferences',{method:'PATCH',body:JSON.stringify({preferredLocale:locale})});event.target.reset();await loadPortal();}catch(e){$('#portal-error').textContent=e.message;}});
document.addEventListener('click',async event=>{
  const submitPractice=event.target.closest('.submit-practice');if(submitPractice){try{await api(`../api/portal/students/${encodeURIComponent(submitPractice.dataset.studentId)}/practice-missions/${encodeURIComponent(submitPractice.dataset.assignmentId)}/submit`,{method:'POST',body:JSON.stringify({})});await loadPortal();}catch(e){$('#portal-error').textContent=e.message;}return;}
  const startBot=event.target.closest('.start-bot-challenge');if(startBot){try{await openBotChallenge(startBot.dataset.studentId,startBot.dataset.botCode);}catch(e){$('#portal-error').textContent=e.message;}return;}
  const nextBot=event.target.closest('.next-bot-game');if(nextBot){try{await startBotGame();}catch(e){$('#portal-error').textContent=e.message;}return;}
  const botSquare=event.target.closest('.bot-square');if(botSquare){const card=botSquare.closest('.bot-game');if(!card)return;const color=card.dataset.studentColor,selected=card.dataset.selected||'',piece=botSquare.dataset.piece||'';if(!selected){const own=piece&&(color==='white'?piece===piece.toUpperCase():piece===piece.toLowerCase());if(!own)return;card.dataset.selected=botSquare.dataset.square;botSquare.classList.add('selected');return;}card.querySelectorAll('.bot-square.selected').forEach(x=>x.classList.remove('selected'));card.dataset.selected='';if(selected===botSquare.dataset.square)return;try{await sendBotMove(card,selected,botSquare.dataset.square);}catch(e){card.querySelector('.bot-move-state').textContent=e.message;}return;}
  const square=event.target.closest('.puzzle-square');
  if(square){
    const card=square.closest('.mistake-puzzle');if(!card||card.classList.contains('solved'))return;
    const selected=card.dataset.selected||'',piece=square.dataset.piece||'',turn=card.dataset.turn;
    if(!selected){const own=piece&&(turn==='w'?piece===piece.toUpperCase():piece===piece.toLowerCase());if(!own)return;card.dataset.selected=square.dataset.square;square.classList.add('selected');return;}
    card.querySelectorAll('.puzzle-square.selected').forEach(x=>x.classList.remove('selected'));card.dataset.selected='';
    if(selected===square.dataset.square)return;
    const from=card.querySelector(`.puzzle-square[data-square="${CSS.escape(selected)}"]`),fromPiece=from?.dataset.piece||'';
    let answerMove=selected+square.dataset.square;if(/[Pp]/.test(fromPiece)&&/[18]$/.test(square.dataset.square))answerMove+='q';
    try{const result=await api(`../api/portal/students/${encodeURIComponent(card.dataset.studentId)}/puzzles/${encodeURIComponent(card.dataset.puzzleId)}/attempt`,{method:'POST',body:JSON.stringify({answerMove})});const msg=card.querySelector('.puzzle-result');if(result.correct){msg.textContent=t('correctMove');card.classList.add('solved');setTimeout(()=>loadPortal().catch(()=>{}),700);}else msg.textContent=t('tryAgain');}catch(e){$('#portal-error').textContent=e.message;}return;
  }
  const button=event.target.closest('.start-diagnostic');if(!button)return;try{await openDiagnostic(button.dataset.studentId,button.dataset.diagnosticLevel||'0800');}catch(e){$('#portal-error').textContent=e.message;}
});
document.addEventListener('submit',async event=>{if(event.target.id!=='diagnostic-form')return;event.preventDefault();try{await submitDiagnostic(event.target);}catch(e){$('#portal-error').textContent=e.message;}});
$('#logout').onclick=()=>{token='';localStorage.removeItem('hmena_student_session');location.reload();};
if(token){loadPortal().catch(()=>{localStorage.removeItem('hmena_student_session');token='';if(locale)chooseLanguage(locale);});}
else if(locale){chooseLanguage(locale);}
else{$('#language-panel').hidden=false;$('#login-panel').hidden=true;$('#language-tools').hidden=true;}
