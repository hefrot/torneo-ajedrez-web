const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=localStorage.getItem('hmena_student_session')||'';
let locale=localStorage.getItem('hmena_portal_locale')||null;
const copy={
  en:{brand:'MY PROGRESS',logout:'Log out',private:'Private access',title:'My Progress',help:'Enter the username and code your coach gave you.',username:'Username',code:'Code',login:'Sign in',subtitle:'Classes, skills and ratings in one place.',student:'Student',attendance:'Attendance',comprehension:'Comprehension',accounts:'Chess accounts',ratings:'Rating progress',priorities:'Learning priorities',classes:'Upcoming classes',assignments:'Assignments',notes:'Notes shared by your coach',noRatings:'Link Lichess or Chess.com to start tracking rating.',noPriorities:'No learning priorities calculated yet.',noClasses:'No upcoming classes scheduled.',noAssignments:'No pending assignments.',pending:'HMENA assessment pending',hello:'Hello',noStudents:'No students are linked to this account.',days:'days tracked',language:'Class language',en:'English',es:'Spanish',bilingual:'Bilingual',ratingAlt:'Rating progress',nextPlan:'Coach-approved next focus',nextPlanEmpty:'Your coach has not approved a next focus yet.',training:'Training insights',coachInsight:'Coach insight',leaks:'Where points are leaking',mistakePuzzles:'Mistake puzzles',recommendedLesson:'Recommended lesson',noTraining:'Play or link more games to build your training profile.',diagnostic:'HMENA 0–800 Diagnostic',startDiagnostic:'Start diagnostic',continueDiagnostic:'Continue diagnostic',question:'Question',answer:'Answer',next:'Next',diagnosticDone:'Diagnostic complete',foundations:'Foundations',development:'Development',gaps:'Skills to reinforce',noGaps:'No gaps detected in this screening.',close:'Close',score:'Score',ready800:'Ready for the 800–1200 diagnostic',placementResult:'Placement result',puzzleInstruction:'Find the best move',selectMove:'Tap a piece, then its destination square.',correctMove:'Correct!',tryAgain:'Try again.',noPuzzles:'No mistake puzzles yet.',openingTrainer:'Opening trainer',openingFocus:'Opening focus',noOpeningData:'Play more linked games to build your opening profile.',openingGames:'games',openingCpl:'opening avg CP loss',openingErrors:'critical opening errors'},
  es:{brand:'MI PROGRESO',logout:'Cerrar sesión',private:'Acceso privado',title:'Mi progreso',help:'Ingresa el usuario y código que te dio tu coach.',username:'Usuario',code:'Código',login:'Entrar',subtitle:'Clases, habilidades y ratings en un solo lugar.',student:'Alumno',attendance:'Asistencia',comprehension:'Comprensión',accounts:'Cuentas de ajedrez',ratings:'Progreso de rating',priorities:'Prioridades de aprendizaje',classes:'Próximas clases',assignments:'Tareas',notes:'Notas compartidas por tu coach',noRatings:'Vincula Lichess o Chess.com para empezar a medir tu rating.',noPriorities:'Aún no hay prioridades de aprendizaje calculadas.',noClasses:'No hay próximas clases cargadas.',noAssignments:'No hay tareas pendientes.',pending:'Evaluación HMENA pendiente',hello:'Hola',noStudents:'No hay alumnos vinculados a esta cuenta.',days:'días registrados',language:'Idioma de la clase',en:'Inglés',es:'Español',bilingual:'Bilingüe',ratingAlt:'Progreso de rating',nextPlan:'Próximo enfoque aprobado por tu coach',nextPlanEmpty:'Tu coach todavía no ha aprobado el siguiente enfoque.',training:'Inteligencia de entrenamiento',coachInsight:'Insight del coach',leaks:'Dónde se escapan los puntos',mistakePuzzles:'Problemas de tus errores',recommendedLesson:'Lección recomendada',noTraining:'Juega o vincula más partidas para construir tu perfil de entrenamiento.',diagnostic:'Diagnóstico HMENA 0–800',startDiagnostic:'Comenzar diagnóstico',continueDiagnostic:'Continuar diagnóstico',question:'Pregunta',answer:'Responder',next:'Siguiente',diagnosticDone:'Diagnóstico completado',foundations:'Fundamentos',development:'Desarrollo',gaps:'Habilidades por reforzar',noGaps:'No se detectaron huecos en este diagnóstico.',close:'Cerrar',score:'Puntuación',ready800:'Listo para el diagnóstico 800–1200',placementResult:'Resultado de colocación',puzzleInstruction:'Encuentra la mejor jugada',selectMove:'Toca una pieza y después su casilla de destino.',correctMove:'¡Correcto!',tryAgain:'Intenta de nuevo.',noPuzzles:'Aún no hay problemas creados desde tus errores.',openingTrainer:'Entrenador de aperturas',openingFocus:'Prioridad de apertura',noOpeningData:'Juega más partidas vinculadas para construir tu perfil de aperturas.',openingGames:'partidas',openingCpl:'pérdida CP promedio en apertura',openingErrors:'errores críticos de apertura'}
};
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
function openingTrainerBlock(profile){
  if(!profile?.gamesAnalyzed)return `<div class="empty">${t('noOpeningData')}</div>`;
  const rows=profile.openings?.slice(0,5).map(o=>`<li><strong>${esc(o.openingName)}</strong>${o.openingEco?` · ${esc(o.openingEco)}`:''}<br><small>${o.games} ${t('openingGames')} · ${o.wins}W/${o.losses}L/${o.draws}D · ${t('openingCpl')}: ${o.openingAvgCpLoss??'—'} · ${t('openingErrors')}: ${o.criticalOpeningErrors}</small></li>`).join('')||'';
  return `<div class="next-lesson-box"><small>${t('openingFocus')}</small><strong>${esc(profile.focusText||t('noOpeningData'))}</strong></div><ul>${rows}</ul>`;
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
    <h3>${t('training')}</h3><div class="next-lesson-box"><small>${t('coachInsight')}</small><strong>${esc(s.training?.coachInsight||t('noTraining'))}</strong><p>${t('mistakePuzzles')}: ${s.training?.activePuzzles||0}</p></div><h4>${t('leaks')}</h4><ul>${leaks}</ul><h4>${t('mistakePuzzles')}</h4><div class="puzzle-grid">${puzzles}</div><h3>${t('openingTrainer')}</h3>${openingTrainerBlock(s.openingTrainer)}
    <div class="diagnostic-cta"><div><strong>${t('diagnostic')}</strong><small>0–800</small></div><button class="btn btn-secondary start-diagnostic" data-student-id="${esc(s.id)}" type="button">${t('startDiagnostic')}</button></div>
    <h3>${t('priorities')}</h3><ul>${priorities}</ul>
    <h3>${t('classes')}</h3><ul>${upcoming}</ul><h3>${t('assignments')}</h3><ul>${assignments}</ul>${notes?`<h3>${t('notes')}</h3><ul>${notes}</ul>`:''}</article>`;
}
let activeDiagnosticId=null;
function renderDiagnostic(state){
  $('#diagnostic-title').textContent=t('diagnostic');$('#diagnostic-close').textContent=t('close');
  if(state.status==='completed'){
    const sum=state.summary||{};const gaps=(sum.gaps||[]).map(g=>`<li><strong>${esc(g.title||g.code)}</strong></li>`).join('')||`<li>${t('noGaps')}</li>`;
    const foundationValue=sum.foundations?.skipped?'—':`${sum.foundations?.percent??0}%`;
    const seedNote=state.entryBasis==='rating_seed'?`<div class="next-lesson-box"><small>${t('foundationSkipped')}</small><p>${t('ratingSeed')}</p></div>`:'';
    const checkNote=sum.foundationCheckRecommended?`<div class="next-lesson-box status-warn"><strong>${t('foundationCheck')}</strong></div>`:'';
    $('#diagnostic-body').innerHTML=`<div class="diagnostic-result"><span class="eyebrow">${t('diagnosticDone')}</span><h2>${t('placementResult')}: ${esc(state.placementBandCode||'—')}</h2>${seedNote}<div class="profile-stats"><article><strong>${foundationValue}</strong><span>${t('foundations')}</span></article><article><strong>${sum.development?.total?sum.development.percent+'%':'—'}</strong><span>${t('development')}</span></article><article><strong>${sum.cleared0800?'800+':'—'}</strong><span>${sum.cleared0800?t('ready800'):t('score')}</span></article></div>${checkNote}<h3>${t('gaps')}</h3><ul>${gaps}</ul></div>`;
    return;
  }
  const q=state.item;if(!q){$('#diagnostic-body').innerHTML='<div class="empty">—</div>';return;}
  const stageLabel=q.stage==='foundations'?t('foundations'):t('development');
  const options=q.options.map((option,index)=>{const key=String.fromCharCode(65+index);return `<label class="diagnostic-option"><input type="radio" name="diagnostic-answer" value="${key}"><span><strong>${key}.</strong> ${esc(option)}</span></label>`}).join('');
  const seedNote=state.entryBasis==='rating_seed'?`<div class="next-lesson-box"><small>${t('foundationSkipped')}</small><p>${t('ratingSeed')}</p></div>`:'';
  $('#diagnostic-body').innerHTML=`${seedNote}<div class="diagnostic-progress"><span>${stageLabel}</span><strong>${t('question')} ${q.sequence}</strong></div><h2 class="diagnostic-prompt">${esc(q.prompt)}</h2><form id="diagnostic-form" data-item-id="${esc(q.id)}">${options}<button class="btn btn-primary" type="submit">${t('answer')}</button></form>`;
}
async function openDiagnostic(studentId){
  const start=await api(`../api/portal/students/${encodeURIComponent(studentId)}/diagnostic/start`,{method:'POST',body:JSON.stringify({locale})});activeDiagnosticId=start.attemptId;
  const state=await api(`../api/portal/diagnostic/${encodeURIComponent(activeDiagnosticId)}?locale=${encodeURIComponent(locale)}`);renderDiagnostic(state);if(!$('#diagnostic-dialog').open)$('#diagnostic-dialog').showModal();
}
async function submitDiagnostic(form){
  const answer=form.querySelector('input[name="diagnostic-answer"]:checked')?.value;if(!answer)return;
  const result=await api(`../api/portal/diagnostic/${encodeURIComponent(activeDiagnosticId)}/answer`,{method:'POST',body:JSON.stringify({itemId:form.dataset.itemId,answerKey:answer,locale})});
  if(result.completed){const state=await api(`../api/portal/diagnostic/${encodeURIComponent(activeDiagnosticId)}?locale=${encodeURIComponent(locale)}`);renderDiagnostic(state);await loadPortal();return;}
  renderDiagnostic(result.state);
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
  const button=event.target.closest('.start-diagnostic');if(!button)return;try{await openDiagnostic(button.dataset.studentId);}catch(e){$('#portal-error').textContent=e.message;}
});
document.addEventListener('submit',async event=>{if(event.target.id!=='diagnostic-form')return;event.preventDefault();try{await submitDiagnostic(event.target);}catch(e){$('#portal-error').textContent=e.message;}});
$('#logout').onclick=()=>{token='';localStorage.removeItem('hmena_student_session');location.reload();};
if(token){loadPortal().catch(()=>{localStorage.removeItem('hmena_student_session');token='';if(locale)chooseLanguage(locale);});}
else if(locale){chooseLanguage(locale);}
else{$('#language-panel').hidden=false;$('#login-panel').hidden=true;$('#language-tools').hidden=true;}
