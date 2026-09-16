const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=localStorage.getItem('hmena_student_session')||'';
let locale=localStorage.getItem('hmena_portal_locale')||null;
const copy={
  en:{brand:'MY PROGRESS',logout:'Log out',private:'Private access',title:'My Progress',help:'Enter the username and code your coach gave you.',username:'Username',code:'Code',login:'Sign in',subtitle:'Classes, skills and ratings in one place.',student:'Student',attendance:'Attendance',comprehension:'Comprehension',accounts:'Chess accounts',ratings:'Rating progress',priorities:'Learning priorities',classes:'Upcoming classes',assignments:'Assignments',notes:'Notes shared by your coach',noRatings:'Link Lichess or Chess.com to start tracking rating.',noPriorities:'No learning priorities calculated yet.',noClasses:'No upcoming classes scheduled.',noAssignments:'No pending assignments.',pending:'HMENA assessment pending',hello:'Hello',noStudents:'No students are linked to this account.',days:'days tracked',language:'Class language',en:'English',es:'Spanish',bilingual:'Bilingual',ratingAlt:'Rating progress',nextPlan:'Coach-approved next focus',nextPlanEmpty:'Your coach has not approved a next focus yet.',training:'Training insights',coachInsight:'Coach insight',leaks:'Where points are leaking',mistakePuzzles:'Mistake puzzles',recommendedLesson:'Recommended lesson',noTraining:'Play or link more games to build your training profile.',diagnostic:'HMENA 0–800 Diagnostic',diagnostic1200:'HMENA 800–1200 Diagnostic',startDiagnostic:'Start diagnostic',competitiveFundamentals:'Competitive Fundamentals',ready1200:'Ready for 1200–1600',continueDiagnostic:'Continue diagnostic',question:'Question',answer:'Answer',next:'Next',diagnosticDone:'Diagnostic complete',foundations:'Foundations',development:'Development',gaps:'Skills to reinforce',noGaps:'No gaps detected in this screening.',close:'Close',score:'Score',ready800:'Ready for the 800–1200 diagnostic',placementResult:'Placement result',puzzleInstruction:'Find the best move',selectMove:'Tap a piece, then its destination square.',correctMove:'Correct!',tryAgain:'Try again.',noPuzzles:'No mistake puzzles yet.',openingTrainer:'Opening trainer',openingFocus:'Opening focus',noOpeningData:'Play more linked games to build your opening profile.',openingGames:'games',openingCpl:'opening avg CP loss',openingErrors:'critical opening errors',reports:'Progress reports',noReports:'No progress report has been published yet.',reportSkills:'Skills secured',reportPractice:'Skills in practice',reportRatings:'Rating changes',reportNext:'Next focus'},
  es:{brand:'MI PROGRESO',logout:'Cerrar sesión',private:'Acceso privado',title:'Mi progreso',help:'Ingresa el usuario y código que te dio tu coach.',username:'Usuario',code:'Código',login:'Entrar',subtitle:'Clases, habilidades y ratings en un solo lugar.',student:'Alumno',attendance:'Asistencia',comprehension:'Comprensión',accounts:'Cuentas de ajedrez',ratings:'Progreso de rating',priorities:'Prioridades de aprendizaje',classes:'Próximas clases',assignments:'Tareas',notes:'Notas compartidas por tu coach',noRatings:'Vincula Lichess o Chess.com para empezar a medir tu rating.',noPriorities:'Aún no hay prioridades de aprendizaje calculadas.',noClasses:'No hay próximas clases cargadas.',noAssignments:'No hay tareas pendientes.',pending:'Evaluación HMENA pendiente',hello:'Hola',noStudents:'No hay alumnos vinculados a esta cuenta.',days:'días registrados',language:'Idioma de la clase',en:'Inglés',es:'Español',bilingual:'Bilingüe',ratingAlt:'Progreso de rating',nextPlan:'Próximo enfoque aprobado por tu coach',nextPlanEmpty:'Tu coach todavía no ha aprobado el siguiente enfoque.',training:'Inteligencia de entrenamiento',coachInsight:'Insight del coach',leaks:'Dónde se escapan los puntos',mistakePuzzles:'Problemas de tus errores',recommendedLesson:'Lección recomendada',noTraining:'Juega o vincula más partidas para construir tu perfil de entrenamiento.',diagnostic:'Diagnóstico HMENA 0–800',diagnostic1200:'Diagnóstico HMENA 800–1200',startDiagnostic:'Comenzar diagnóstico',competitiveFundamentals:'Fundamentos competitivos',ready1200:'Listo para 1200–1600',continueDiagnostic:'Continuar diagnóstico',question:'Pregunta',answer:'Responder',next:'Siguiente',diagnosticDone:'Diagnóstico completado',foundations:'Fundamentos',development:'Desarrollo',gaps:'Habilidades por reforzar',noGaps:'No se detectaron huecos en este diagnóstico.',close:'Cerrar',score:'Puntuación',ready800:'Listo para el diagnóstico 800–1200',placementResult:'Resultado de colocación',puzzleInstruction:'Encuentra la mejor jugada',selectMove:'Toca una pieza y después su casilla de destino.',correctMove:'¡Correcto!',tryAgain:'Intenta de nuevo.',noPuzzles:'Aún no hay problemas creados desde tus errores.',openingTrainer:'Entrenador de aperturas',openingFocus:'Prioridad de apertura',noOpeningData:'Juega más partidas vinculadas para construir tu perfil de aperturas.',openingGames:'partidas',openingCpl:'pérdida CP promedio en apertura',openingErrors:'errores críticos de apertura',reports:'Reportes de progreso',noReports:'Aún no hay un reporte de progreso publicado.',reportSkills:'Habilidades consolidadas',reportPractice:'Habilidades en práctica',reportRatings:'Cambios de rating',reportNext:'Próximo enfoque'}
};
Object.assign(copy.en,{botArena:'CIS Chess Bot Arena',botHelp:'Pass practical challenges against calibrated CIS bots.',botLocked:'Locked',botPassed:'Passed',botRecommended:'Recommended',botStart:'Start challenge',botLevel:'CIS level',botGame:'Game',botNext:'Next game',botPoints:'Points',botPractical:'Practical strength',botPass:'Challenge passed',botFail:'Challenge not passed',yourColor:'Your color',white:'White',black:'Black'});
Object.assign(copy.es,{botArena:'CIS Chess Bot Arena',botHelp:'Supera retos prácticos contra bots CIS calibrados.',botLocked:'Bloqueado',botPassed:'Aprobado',botRecommended:'Recomendado',botStart:'Comenzar reto',botLevel:'Nivel CIS',botGame:'Partida',botNext:'Siguiente partida',botPoints:'Puntos',botPractical:'Fuerza práctica',botPass:'Reto aprobado',botFail:'Reto no aprobado',yourColor:'Tu color',white:'Blancas',black:'Negras'});
const t=key=>copy[locale||'en']?.[key]||copy.en[key]||key;
function applyStatic(){if(!locale)return;document.documentElement.lang=locale;document.title=`${t('title')} · HMENA Chess`;$('#locale-select').value=locale;$('#brand-sub').textContent=t('brand');$('#logout').textContent=t('logout');$('#login-eyebrow').textContent=t('private');$('#login-title').textContent=t('title');$('#login-help').textContent=t('help');$('#username-label').textContent=t('username');$('#code-label').textContent=t('code');$('#login-button').textContent=t('login');$('#portal-subtitle').textContent=t('subtitle');}

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
function botArenaBlock(arena,studentId){
  if(!arena?.bots?.length)return '';
  const cards=arena.bots.map(b=>{const state=b.passed?t('botPassed'):!b.unlocked?t('botLocked'):b.recommended?t('botRecommended'):'';const score=b.lastChallenge?.summary?.points;return `<article class="bot-rung ${b.passed?'passed':''} ${!b.unlocked?'locked':''}"><div><strong>${esc(b.name)}</strong><small>${t('botLevel')} ${b.targetLevel}${state?` · ${state}`:''}</small>${score!=null?`<small>${t('botPoints')}: ${score}/3</small>`:''}</div>${b.unlocked&&!b.passed?`<button class="btn btn-secondary start-bot-challenge" data-student-id="${esc(studentId)}" data-bot-code="${esc(b.code)}" type="button">${t('botStart')}</button>`:''}</article>`;}).join('');
  return `<div class="next-lesson-box"><small>${t('botArena')}</small><strong>${t('botHelp')}</strong></div><div class="bot-ladder">${cards}</div>`;
}
function studentCard(s){
  const placement=s.placement?`${esc(s.placement.bandTitle)} · ${s.placement.ratingMin}–${s.placement.ratingMax}`:t('pending');
  const priorities=s.priorities?.map(p=>`<li><strong>${esc(p.title)}</strong><br><small>${esc(p.reason)}</small></li>`).join('')||`<li>${t('noPriorities')}</li>`;
  const upcoming=s.upcoming?.map(x=>`<li>${esc(x.startsAt)} · ${esc(x.schoolName||x.programName)}${x.weekNo?` · ${locale==='es'?'Semana':'Week'} ${x.weekNo}`:''} · ${t('language')}: ${t(x.instructionLocale||'en')}</li>`).join('')||`<li>${t('noClasses')}</li>`;
  const assignments=s.assignments?.map(x=>`<li><strong>${esc(x.title)}</strong>${x.dueAt?` · ${esc(x.dueAt)}`:''}</li>`).join('')||`<li>${t('noAssignments')}</li>`;
  const notes=s.sharedCoachNotes?.map(x=>`<li>${esc(x.note)}</li>`).join('')||'';
  const leaks=s.training?.topLeaks?.slice(0,3).map(x=>`<li><strong>${esc(x.skillTitle||x.findingType)}</strong> · ${x.occurrences}× · ${x.avgSeverity}/5${x.recommendedLesson?`<br><small>${t('recommendedLesson')}: ${esc(x.recommendedLesson.title)}</small>`:''}</li>`).join('')||`<li>${t('noTraining')}</li>`;
  const nextPlan=s.nextPlan?`<div class="next-lesson-box status-ok"><small>${t('nextPlan')}</small><strong>${esc(s.nextPlan.lesson?.title||s.nextPlan.skill?.title||'—')}</strong>${s.nextPlan.lesson?.objective?`<p>${esc(s.nextPlan.lesson.objective)}</p>`:''}</div>`:`<div class="next-lesson-box"><small>${t('nextPlan')}</small><strong>${t('nextPlanEmpty')}</strong></div>`;
  const puzzles=s.training?.puzzles?.filter(p=>p.status==='active').slice(0,3).map(p=>puzzleBoard(p,s.id)).join('')||`<div class="empty">${t('noPuzzles')}</div>`;
  return `<article class="panel student-progress-card"><div class="coach-card-head"><div><span class="eyebrow">${t('student')}</span><h2>${esc(s.displayName)}</h2></div><span class="status-badge">${placement}</span></div>
    <div class="profile-stats"><article><strong>${s.attendance?.present||0}/${s.attendance?.total||0}</strong><span>${t('attendance')}</span></article><article><strong>${s.attendance?.avgComprehension??'—'}</strong><span>${t('comprehension')}</span></article><article><strong>${s.ratings?.accounts?.length||0}</strong><span>${t('accounts')}</span></article></div>
    <h3>${t('ratings')}</h3><div class="rating-grid">${ratingCards(s.ratings)}</div>
    ${nextPlan}
    <h3>${t('reports')}</h3><div class="report-grid">${reportCards(s.progressReports||[])}</div>
    <h3>${t('botArena')}</h3>${botArenaBlock(s.botArena,s.id)}
    <h3>${t('training')}</h3><div class="next-lesson-box"><small>${t('coachInsight')}</small><strong>${esc(s.training?.coachInsight||t('noTraining'))}</strong><p>${t('mistakePuzzles')}: ${s.training?.activePuzzles||0}</p></div><h4>${t('leaks')}</h4><ul>${leaks}</ul><h4>${t('mistakePuzzles')}</h4><div class="puzzle-grid">${puzzles}</div><h3>${t('openingTrainer')}</h3>${openingTrainerBlock(s.openingTrainer)}
    ${(()=>{const band=s.placement?.bandCode;if(band==='hmena-800-1200')return `<div class="diagnostic-cta"><div><strong>${t('diagnostic1200')}</strong><small>800–1200</small></div><button class="btn btn-secondary start-diagnostic" data-student-id="${esc(s.id)}" data-diagnostic-level="1200" type="button">${t('startDiagnostic')}</button></div>`;if(!band||band==='hmena-0-400'||band==='hmena-400-800')return `<div class="diagnostic-cta"><div><strong>${t('diagnostic')}</strong><small>0–800</small></div><button class="btn btn-secondary start-diagnostic" data-student-id="${esc(s.id)}" data-diagnostic-level="0800" type="button">${t('startDiagnostic')}</button></div>`;return '';})()}
    <h3>${t('priorities')}</h3><ul>${priorities}</ul>
    <h3>${t('classes')}</h3><ul>${upcoming}</ul><h3>${t('assignments')}</h3><ul>${assignments}</ul>${notes?`<h3>${t('notes')}</h3><ul>${notes}</ul>`:''}</article>`;
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
