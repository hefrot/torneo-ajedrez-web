const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const chessPieces={p:'♟',r:'♜',n:'♞',b:'♝',q:'♛',k:'♚',P:'♙',R:'♖',N:'♘',B:'♗',Q:'♕',K:'♔'};
function coachBoard(fen){if(!fen)return '';const [placement,turn='w']=String(fen).split(/\s+/),map=new Map();(placement||'').split('/').forEach((row,ri)=>{let file=0;for(const ch of row){if(/\d/.test(ch)){file+=Number(ch);continue;}map.set(String.fromCharCode(97+file)+(8-ri),ch);file++;}});const files=turn==='b'?['h','g','f','e','d','c','b','a']:['a','b','c','d','e','f','g','h'],ranks=turn==='b'?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1],sq=[];for(const rank of ranks)for(const file of files){const id=file+rank,p=map.get(id)||'',light=((file.charCodeAt(0)-97)+rank)%2===1;sq.push(`<span class="puzzle-square diagnostic-square ${light?'light':'dark'}">${chessPieces[p]||''}</span>`);}return `<div class="puzzle-board diagnostic-board coach-teaching-board">${sq.join('')}</div>`;}
let staffToken=localStorage.getItem('hmena_staff_session')||'';
let staffAccount=null;
let dashboardData=null;
let activeStudentId=null;
let activeProgramId=null;

async function api(path,options={}){
  const headers={...(staffToken?{Authorization:`Bearer ${staffToken}`}:{}) ,...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})};
  const response=await fetch(path,{...options,headers});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);
  return data;
}
function applyStaffState(){const logged=Boolean(staffToken&&staffAccount);$('#staff-login-form').hidden=logged;$('#reload').hidden=!logged;$('#staff-logout').hidden=!logged;$('#staff-badge').hidden=!logged;$('#staff-badge').textContent=logged?`${staffAccount.displayName} · ${staffAccount.role}`:'';if(!logged)$('#dashboard').hidden=true;}
async function restoreStaffSession(){if(!staffToken){applyStaffState();return;}try{const me=await api('../api/staff/me');staffAccount=me.account;applyStaffState();await load();}catch{staffToken='';staffAccount=null;localStorage.removeItem('hmena_staff_session');applyStaffState();}}
function attendanceRow(sessionId,student){
  const a=student.attendance||{};
  return `<div class="attendance-row" data-student-id="${esc(student.id)}">
    <button class="student-link" data-open-student="${esc(student.id)}" type="button">${esc(student.display_name)}</button>
    <span class="track-pill">${esc(student.cohort_tier||'—')}</span>
    <select class="field attendance-status"><option value="present">Presente</option><option value="absent">Ausente</option><option value="late">Tarde</option><option value="excused">Justificada</option></select>
    <select class="field comprehension"><option value="">Comprensión —</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n}/5</option>`).join('')}</select>
    <select class="field engagement"><option value="">Enfoque —</option><option value="focused">Enfocado</option><option value="distracted">Distraído</option><option value="disruptive">Interrumpe</option></select>
    <input class="field attendance-note" placeholder="Nota rápida" value="${esc(a.note||'')}">
  </div>`;
}
function hydrateAttendance(card,session){
  card.querySelectorAll('.attendance-row').forEach(row=>{
    const st=session.roster.find(x=>x.id===row.dataset.studentId); const a=st?.attendance||{};
    row.querySelector('.attendance-status').value=a.status||'present';
    row.querySelector('.comprehension').value=a.comprehension_score??'';
    row.querySelector('.engagement').value=a.engagement_flag||'';
  });
}
function sessionCard(s){
  const lessons=s.lessons.length?s.lessons.map(l=>esc(l.title)).join(' · '):'Sin lección asignada todavía';
  const language={en:'Inglés',es:'Español',bilingual:'Bilingüe'}[s.instruction_locale||'en']||s.instruction_locale;
  return `<article class="panel coach-card session-card" data-session-id="${esc(s.id)}">
    <div class="coach-card-head"><div><strong>${esc(s.school_name||s.program_name)}</strong><div class="row-meta">${esc(s.starts_at)} · Semana ${s.week_no||'-'}/${s.planned_weeks||'-'} · ${s.roster.length} alumnos</div></div><span class="status-badge">${esc(s.program_type)}</span></div>
    <div class="coach-sub">${lessons} · Idioma: ${esc(language)}</div>
    <div class="coach-actions"><button class="btn btn-primary toggle-attendance" type="button">Tomar asistencia</button></div>
    <div class="attendance-editor" hidden>${s.roster.map(st=>attendanceRow(s.id,st)).join('')}<div class="attendance-save"><button class="btn btn-primary save-attendance" type="button">Guardar asistencia</button><span class="save-state"></span></div></div>
  </article>`;
}
async function saveAttendance(card){
  const sessionId=card.dataset.sessionId;
  const records=[...card.querySelectorAll('.attendance-row')].map(row=>({
    studentId:row.dataset.studentId,status:row.querySelector('.attendance-status').value,
    comprehensionScore:row.querySelector('.comprehension').value||null,
    engagementFlag:row.querySelector('.engagement').value||null,note:row.querySelector('.attendance-note').value.trim()||null
  }));
  const state=card.querySelector('.save-state'); state.textContent='Guardando…';
  await api(`../api/admin/sessions/${encodeURIComponent(sessionId)}/attendance`,{method:'PUT',body:JSON.stringify({records})});
  state.textContent='✓ Guardado'; setTimeout(()=>state.textContent='',1800);
}
const skillStatusOptions=current=>[['unseen','No visto'],['introduced','Introducido'],['practicing','Practicando'],['drill_mastered','Dominó ejercicio'],['applied_in_game','Aplicado en partida'],['regressed','Regresión']].map(([v,l])=>`<option value="${v}"${v===current?' selected':''}>${l}</option>`).join('');
async function openStudent(studentId){
  activeStudentId=studentId; const [d,nextData,learning,curriculum,ratings,training,openingTrainer,nextEngine,reportPreview,reports]=await Promise.all([api(`../api/admin/students/${encodeURIComponent(studentId)}/profile`),api(`../api/admin/students/${encodeURIComponent(studentId)}/next-lesson`),api(`../api/admin/students/${encodeURIComponent(studentId)}/learning-priorities`),api('../api/admin/curriculum/hmena'),api(`../api/admin/students/${encodeURIComponent(studentId)}/rating-progress`),api(`../api/admin/students/${encodeURIComponent(studentId)}/training-intelligence`),api(`../api/admin/students/${encodeURIComponent(studentId)}/opening-trainer`),api(`../api/admin/students/${encodeURIComponent(studentId)}/next-lesson-engine?locale=es`),api(`../api/admin/students/${encodeURIComponent(studentId)}/progress-report-preview?locale=es&days=30`),api(`../api/admin/students/${encodeURIComponent(studentId)}/progress-reports?locale=es`)]);
  const nextLesson=nextData.lesson;
  $('#student-title').textContent=d.student.displayName;
  const recentSkills=d.skills.slice(0,8).map(s=>`<li>${esc(s.title)} <span class="status-badge">${esc(s.status)}</span></li>`).join('')||'<li>Sin skills evaluadas todavía</li>';
  const programs=d.enrollments.map(e=>`<li>${esc(e.schoolName||e.programName)} · ${esc(e.programName)}${e.cohortTier?' · '+esc(e.cohortTier):''}</li>`).join('')||'<li>Sin programas</li>';
  const notes=d.notes.slice(0,6).map(n=>`<li><strong>${esc(n.visibility)}</strong> · ${esc(n.note)}</li>`).join('')||'<li>Sin notas</li>';
  const accounts=d.platformAccounts?.map(a=>`<li><strong>${esc(a.platform)}</strong> · ${esc(a.username)} <span class="status-badge">${esc(a.ownershipVerification)}</span></li>`).join('')||'<li>Sin Lichess/Chess.com vinculado.</li>';
  const ratingSummary=ratings.series?.map(r=>`<li><strong>${esc(r.platform)} ${esc(r.ratingType)}</strong>: ${r.latestRating} <small>(${r.delta>=0?'+':''}${r.delta})</small></li>`).join('')||'<li>Aún no hay snapshots de rating.</li>';
  const priorities=learning.priorities?.map(p=>`<li class="skill-priority" data-skill-code="${esc(p.code)}"><strong>${esc(p.title)}</strong><br><small>${esc(p.reason)}</small><div class="inline-editor"><select class="field skill-status">${skillStatusOptions(p.status)}</select><button class="btn btn-secondary save-skill" type="button">Guardar</button></div></li>`).join('')||'<li>Requiere evaluación/colocación HMENA antes de recomendar skills.</li>';
  const band=learning.placement?`${esc(learning.placement.bandTitle)} · ${learning.placement.ratingMin}–${learning.placement.ratingMax}`:'Sin colocación HMENA';
  const bandOptions=curriculum.bands.map(b=>`<option value="${esc(b.code)}"${learning.placement?.bandCode===b.code?' selected':''}>${esc(b.title)} · ${b.ratingMin}–${b.ratingMax}</option>`).join('');
  const trainingLeaks=training.topLeaks?.slice(0,5).map(x=>`<li><strong>${esc(x.skillTitle||x.findingType)}</strong> · ${x.occurrences}× · sev ${x.avgSeverity}/5${x.recommendedLesson?`<br><small>Lección: ${esc(x.recommendedLesson.title)}</small>`:''}</li>`).join('')||'<li>Sin patrones recurrentes todavía.</li>';
  const technicalFindings=training.recentFindings?.slice(0,5).map(f=>`<li><strong>${esc(f.skillTitle||f.findingType)}</strong> · ${f.cpLoss??'—'} cp · confianza ${f.classifierConfidence==null?'—':Math.round(Number(f.classifierConfidence)*100)+'%'}${f.movePlayed&&f.bestMove?` · ${esc(f.movePlayed)} → ${esc(f.bestMove)}`:''}</li>`).join('')||'<li>Sin hallazgos automáticos todavía.</li>';
  const trainingBlock=`<div class="next-lesson-box"><small>Training Intelligence</small><strong>${esc(training.coachInsight||'Sin datos suficientes todavía')}</strong><p>${training.summary?.reviewedGames||0} partidas analizadas · ${training.activePuzzles||0} puzzles activos</p></div><h3>Errores recurrentes</h3><ul>${trainingLeaks}</ul><h3>Hallazgos automáticos recientes</h3><ul>${technicalFindings}</ul>`;
  const openingRows=openingTrainer.openings?.slice(0,5).map(o=>`<li><strong>${esc(o.openingName)}</strong>${o.openingEco?' · '+esc(o.openingEco):''} · ${o.games} partidas · ${o.wins}W/${o.losses}L/${o.draws}D · opening CPL ${o.openingAvgCpLoss??'—'} · errores críticos ${o.criticalOpeningErrors}</li>`).join('')||'<li>Sin suficientes partidas para perfilar aperturas.</li>';
  const openingBlock=`<div class="next-lesson-box"><small>Opening Trainer</small><strong>${esc(openingTrainer.focusText||'Sin perfil de aperturas todavía')}</strong></div><ul>${openingRows}</ul>`;
  const engineReasons=nextEngine.recommendation?.reasons?.map(r=>`<li>${esc(r.text)}${r.detail?` <small>${esc(JSON.stringify(r.detail))}</small>`:''}</li>`).join('')||'';
  const lessonContent=nextEngine.recommendation?.lesson?.content||{},pack=nextEngine.recommendation?.teachingPack||null;
  const ex=pack?.exerciseSet?.find(x=>x.difficulty==='core')||pack?.exerciseSet?.[0]||null;
  const exerciseVariants=pack?.exerciseSet?.map(x=>`<li><strong>${esc(x.difficulty)}</strong> · ${esc(x.prompt)}</li>`).join('')||'';
  const packTimeline=pack?.timeline?.map(x=>`<li><strong>${esc(x.m)}</strong> · ${esc(x.label)}</li>`).join('')||'';
  const packScript=pack?.coachScript?.map(x=>`<li>${esc(x)}</li>`).join('')||'';
  const packErrors=pack?.commonErrors?.map(x=>`<li>${esc(x)}</li>`).join('')||'';
  const teachingPack=pack?`<div class="teaching-pack"><h4>Pack docente · 60 min</h4><div class="teaching-pack-grid"><div><strong>Timing</strong><ul>${packTimeline}</ul></div><div><strong>Guion</strong><ul>${packScript}</ul></div></div>${ex?`<h4>Ejercicio base</h4>${coachBoard(ex.fen)}<p><strong>Pregunta:</strong> ${esc(ex.prompt)}</p><p><strong>Solución / explicación:</strong> ${esc(ex.explanation||'')}</p>${exerciseVariants?`<h4>Variantes diferenciadas</h4><ul>${exerciseVariants}</ul>`:''}`:''}<h4>Errores comunes</h4><ul>${packErrors}</ul><p><strong>Apoyo:</strong> ${esc(pack.differentiation?.support||'')}</p><p><strong>Reto avanzado:</strong> ${esc(pack.differentiation?.challenge||'')}</p>${pack.homework?`<p><strong>Tarea:</strong> ${esc(pack.homework)}</p>`:''}${pack.exitTicket?`<p><strong>Exit ticket:</strong> ${esc(pack.exitTicket)}</p>`:''}</div>`:'';
  const lessonPlanDetails=nextEngine.recommendation?.lesson?`<div class="lesson-plan-mini"><h4>Plan rápido de clase</h4>${lessonContent.keyPoints?.length?`<ul>${lessonContent.keyPoints.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}${lessonContent.activity?`<p><strong>Actividad:</strong> ${esc(lessonContent.activity)}</p>`:''}${teachingPack}</div>`:'';
  const approvedPlan=nextEngine.approvedPlan?`<div class="next-lesson-box status-ok"><small>Plan aprobado por coach</small><strong>${esc(nextEngine.approvedPlan.lesson?.title||nextEngine.approvedPlan.skill?.title||'Plan aprobado')}</strong></div>`:'';
  const alternatives=nextEngine.alternatives?.map(a=>`<li><strong>${esc(a.lesson?.title||a.skill?.title||'Alternativa')}</strong> · ${esc(a.skill?.title||'')}<br><small>${a.confidence}% confianza</small> <button class="btn btn-secondary override-next-plan" data-skill-code="${esc(a.skill?.code||'')}" data-lesson-id="${esc(a.lesson?.id||'')}" type="button">Usar esta</button></li>`).join('')||'';
  const assignPlanButton=nextEngine.context?.nextPrivateSession?`<button class="btn btn-secondary assign-next-plan" type="button">Aprobar y asignar · ${esc(nextEngine.context.nextPrivateSession.startsAt)}</button>`:'';
  const engineMain=nextEngine.recommendation?`<div class="next-lesson-box"><small>Next Lesson Engine · ${esc(nextEngine.algorithmVersion||'')}</small><strong>${esc(nextEngine.recommendation.lesson?.title||nextEngine.recommendation.skill?.title||'Siguiente enfoque')}</strong><p>${esc(nextEngine.recommendation.skill?.title||'')} · ${nextEngine.recommendation.confidence}% confianza · score ${nextEngine.recommendation.score}</p><ul>${engineReasons}</ul>${lessonPlanDetails}<div class="inline-editor"><button class="btn btn-primary accept-next-plan" type="button">Aprobar plan</button>${assignPlanButton}<button class="btn btn-secondary dismiss-next-plan" type="button">Descartar</button></div></div>`:`<div class="next-lesson-box"><small>Next Lesson Engine</small><strong>${esc(nextEngine.message||'Completa el diagnóstico antes de recomendar una clase.')}</strong></div>`;
  const coachEngineBlock=`<h3>Coach Intelligence · próxima clase</h3>${engineMain}${approvedPlan}${alternatives?`<h4>Alternativas</h4><ul>${alternatives}</ul>`:''}`;
  const previewMastered=reportPreview.skills?.mastered?.slice(0,5).map(x=>esc(x.title)).join(', ')||'—';
  const reportRows=reports.length?reports.map(r=>`<li><strong>${esc(r.periodStart.slice(0,10))} → ${esc(r.periodEnd.slice(0,10))}</strong> · ${esc(r.status)} ${r.status==='draft'?`<button class="btn btn-secondary publish-progress-report" data-report-id="${esc(r.id)}" type="button">Publicar</button>`:''}</li>`).join(''):'<li>Sin reportes guardados.</li>';
  const reportBlock=`<h3>Reporte familiar · últimos 30 días</h3><div class="next-lesson-box"><strong>${esc(reportPreview.headline||'Sin actividad suficiente todavía.')}</strong><p><strong>Habilidades consolidadas:</strong> ${previewMastered}</p><div class="inline-editor"><button class="btn btn-primary create-progress-report" type="button">Crear borrador 30 días</button></div></div><ul>${reportRows}</ul>`;
  $('#student-profile').innerHTML=`<div class="profile-stats"><article><strong>${d.student.currentLevel??'—'}</strong><span>Nivel actual</span></article><article><strong>${d.attendance.present||0}/${d.attendance.total||0}</strong><span>Asistencia</span></article><article><strong>${d.attendance.avgComprehension??'—'}</strong><span>Comprensión prom.</span></article></div><div class="next-lesson-box"><small>HMENA 0–2500</small><strong>${band}</strong><div class="inline-editor"><select id="placement-select" class="field"><option value="">Seleccionar banda…</option>${bandOptions}</select><button id="save-placement" class="btn btn-secondary" type="button">Guardar nivel</button></div></div><div class="next-lesson-box"><small>Continuidad de clase</small><strong>${esc(nextLesson?.title||'Sin secuencia asignada')}</strong>${nextLesson?.objective?`<p>${esc(nextLesson.objective)}</p>`:''}</div><h3>Prioridades de aprendizaje</h3><ul>${priorities}</ul><h3>Programas</h3><ul>${programs}</ul><h3>Skills recientes</h3><ul>${recentSkills}</ul><h3>Cuentas vinculadas</h3><ul>${accounts}</ul><h3>Progreso Elo / rating</h3><ul>${ratingSummary}</ul>${coachEngineBlock}${reportBlock}${trainingBlock}<h3>Perfil de aperturas</h3>${openingBlock}<h3>Notas</h3><ul>${notes}</ul>`;
  if(!$('#student-dialog').open)$('#student-dialog').showModal();
}
async function load(){
  $('#error').textContent=''; dashboardData=await api('../api/admin/coach/dashboard');
  const d=dashboardData; $('#date').textContent=d.date; $('#dashboard').hidden=false;
  $('#summary').innerHTML=[['Alumnos activos',d.totals.activeStudents],['Programas activos',d.totals.activePrograms],['Clases hoy',d.totals.todaySessions],['Alertas',d.totals.alerts]].map(([l,v])=>`<article class="stat"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></article>`).join('');
  $('#sessions').innerHTML=d.todaySessions.length?d.todaySessions.map(sessionCard).join(''):'<div class="empty">No hay clases cargadas para hoy.</div>';
  d.todaySessions.forEach(s=>{const card=document.querySelector(`[data-session-id="${CSS.escape(s.id)}"]`);if(card)hydrateAttendance(card,s);});
  $('#upcoming').innerHTML=d.upcomingSessions.length?d.upcomingSessions.map(s=>`<article class="panel coach-card"><div><strong>${esc(s.school_name||s.program_name)}</strong><div class="row-meta">${esc(s.starts_at)} · ${esc(s.program_name)} · ${s.roster_count} alumno${s.roster_count===1?'':'s'} · ${esc(({en:'Inglés',es:'Español',bilingual:'Bilingüe'}[s.instruction_locale||'en']))}</div></div><span class="status-badge">${esc(s.program_type)}</span></article>`).join(''):'<div class="empty">Sin clases en los próximos 7 días.</div>';
  $('#alerts').innerHTML=d.alerts.length?d.alerts.map(a=>`<article class="panel coach-card"><strong>${a.priority==='high'?'⚠️':'ℹ️'} ${esc(a.message)}</strong>${a.studentId?`<button class="student-link" data-open-student="${esc(a.studentId)}" type="button">Abrir alumno</button>`:''}</article>`).join(''):'<div class="empty">Sin alertas pedagógicas.</div>';
  $('#programs').innerHTML=d.programs.length?d.programs.map(p=>`<article class="panel coach-card program-card" data-program-id="${esc(p.id)}"><div><strong>${esc(p.school_name||p.name)}</strong><div class="row-meta">${esc(p.name)} · ${p.active_students} alumnos · Semana ${p.completed_week||0}/${p.planned_weeks||'-'}</div></div><div class="inline-editor"><select class="field program-language"><option value="en"${p.instruction_locale==='en'?' selected':''}>Inglés</option><option value="es"${p.instruction_locale==='es'?' selected':''}>Español</option><option value="bilingual"${p.instruction_locale==='bilingual'?' selected':''}>Bilingüe</option></select><button class="btn btn-secondary save-program-language" type="button">Guardar idioma</button>${['school','group','camp','club'].includes(p.program_type)?'<button class="btn btn-primary open-group-plan" type="button">Plan grupal</button>':''}</div></article>`).join(''):'<div class="empty">Sin programas activos.</div>';
}

function groupSuggestionCard(suggestion,{tier=null,nextSession=null}={}){
  if(!suggestion)return '<div class="empty">Sin recomendación suficiente todavía.</div>';
  const students=suggestion.students?.map(x=>esc(x.displayName)).join(', ')||'—';
  const content=suggestion.lesson?.content||{};
  return `<div class="next-lesson-box group-plan-card"><small>${tier?`Track ${esc(tier)}`:'Propuesta general'} · cobertura ${Math.round((suggestion.coverage||0)*100)}%</small><strong>${esc(suggestion.lesson?.title||suggestion.skill?.title||'Lección')}</strong><p>${esc(suggestion.skill?.title||'')} · ${suggestion.studentCount||0} alumno${suggestion.studentCount===1?'':'s'} · score prom. ${suggestion.avgScore??'—'}</p><p><small>${students}</small></p>${content.activity?`<p><strong>Actividad:</strong> ${esc(content.activity)}</p>`:''}<button class="btn btn-primary assign-group-plan" type="button" data-lesson-id="${esc(suggestion.lesson?.id||'')}" data-tier="${esc(tier||'')}">${nextSession?`Asignar a ${esc(nextSession.startsAt)}`:'Asignar a próxima sesión'}</button></div>`;
}
async function openProgramPlan(programId){
  activeProgramId=programId;const data=await api(`../api/admin/programs/${encodeURIComponent(programId)}/next-lesson-engine?locale=es`);
  $('#program-title').textContent=`Plan grupal · ${data.program?.schoolName||data.program?.name||''}`;
  const general=groupSuggestionCard(data.suggestion,{nextSession:data.nextSession});
  const tiers=data.byTier?.length?data.byTier.map(t=>`<section class="group-tier"><h3>${esc(t.cohortTier)} · ${t.rosterCount} alumno${t.rosterCount===1?'':'s'}</h3>${t.themeAligned?'<p class="row-meta">✓ Alineado con el tema central</p>':'<p class="row-meta">↪ Requiere adaptación del reto</p>'}${groupSuggestionCard(t.suggestion,{tier:t.cohortTier,nextSession:data.nextSession})}${t.diagnosticsNeeded?`<p class="row-meta">${t.diagnosticsNeeded} alumno(s) requieren diagnóstico.</p>`:''}</section>`).join(''):'';
  const diagnostics=data.diagnosticsNeeded?`<div class="next-lesson-box status-warn"><small>Diagnóstico pendiente</small><strong>${data.diagnosticsNeeded} alumno(s) todavía no tienen suficiente colocación.</strong></div>`:'';
  const theme=data.unifiedTheme?`<div class="next-lesson-box ${data.unifiedTheme.aligned?'status-ok':'status-warn'}"><small>Tema central sugerido · ${Math.round((data.unifiedTheme.coverage||0)*100)}% de cobertura</small><strong>${esc(data.unifiedTheme.label)}</strong><p>${data.teachingMode==='unified_theme'?'Usar una explicación común y diferenciar retos por track.':'Las necesidades están muy dispersas; conviene elegir manualmente un tema común.'}</p></div>`:'';
  const provisional=data.provisionalSeeds?`<div class="next-lesson-box"><small>Alumnos sin track confirmado</small><strong>${data.provisionalSeeds}</strong><p>Trátalos provisionalmente como Seeds hasta observar/diagnosticar.</p></div>`:'';
  $('#program-plan').innerHTML=`<div class="profile-stats"><article><strong>${data.rosterCount}</strong><span>Roster</span></article><article><strong>${data.nextSession?.weekNo??'—'}</strong><span>Próxima semana</span></article><article><strong>${data.differentiated?'Sí':'No'}</strong><span>Diferenciar</span></article></div>${theme}${provisional}${diagnostics}<h3>Propuesta para el grupo</h3>${general}${tiers?`<h3>Diferenciación por track</h3>${tiers}`:''}`;
  if(!$('#program-dialog').open)$('#program-dialog').showModal();
}
async function assignGroupPlan(button){
  if(!activeProgramId)return;const lessonId=button.dataset.lessonId;if(!lessonId)return;
  await api(`../api/admin/programs/${encodeURIComponent(activeProgramId)}/lesson-plan`,{method:'POST',body:JSON.stringify({lessonId,cohortTier:button.dataset.tier||null,deliveryStage:'theory_only'})});
  await openProgramPlan(activeProgramId);await load();
}

async function savePlacement(){const bandCode=$('#placement-select')?.value;if(!activeStudentId||!bandCode)return;await api(`../api/admin/students/${encodeURIComponent(activeStudentId)}/placement`,{method:'PUT',body:JSON.stringify({bandCode,source:'manual',confidence:80})});await openStudent(activeStudentId);}
async function saveSkill(button){const row=button.closest('.skill-priority');if(!row||!activeStudentId)return;const status=row.querySelector('.skill-status').value;await api(`../api/admin/students/${encodeURIComponent(activeStudentId)}/hmena-skills/${encodeURIComponent(row.dataset.skillCode)}`,{method:'PUT',body:JSON.stringify({status,evidence:{via:'coach_portal'}})});await openStudent(activeStudentId);}
async function saveNextDecision(payload){if(!activeStudentId)return;await api(`../api/admin/students/${encodeURIComponent(activeStudentId)}/next-lesson-decision`,{method:'POST',body:JSON.stringify({...payload,locale:'es'})});await openStudent(activeStudentId);}

document.addEventListener('click',async event=>{
  const createReport=event.target.closest('.create-progress-report');if(createReport){try{await api(`../api/admin/students/${encodeURIComponent(activeStudentId)}/progress-reports`,{method:'POST',body:JSON.stringify({days:30})});await openStudent(activeStudentId);}catch(e){$('#error').textContent=e.message;}return;}
  const publishReport=event.target.closest('.publish-progress-report');if(publishReport){try{await api(`../api/admin/progress-reports/${encodeURIComponent(publishReport.dataset.reportId)}/publish`,{method:'POST',body:JSON.stringify({})});await openStudent(activeStudentId);}catch(e){$('#error').textContent=e.message;}return;}
  const openGroup=event.target.closest('.open-group-plan');if(openGroup){const card=openGroup.closest('.program-card');try{await openProgramPlan(card.dataset.programId);}catch(e){$('#error').textContent=e.message;}return;}
  const assignGroup=event.target.closest('.assign-group-plan');if(assignGroup){try{await assignGroupPlan(assignGroup);}catch(e){$('#error').textContent=e.message;}return;}
  const acceptPlan=event.target.closest('.accept-next-plan');if(acceptPlan){try{await saveNextDecision({decision:'accepted'});}catch(e){$('#error').textContent=e.message;}return;}
  const assignPlan=event.target.closest('.assign-next-plan');if(assignPlan){try{await saveNextDecision({decision:'accepted',assignToNextPrivateSession:true});}catch(e){$('#error').textContent=e.message;}return;}
  const dismissPlan=event.target.closest('.dismiss-next-plan');if(dismissPlan){try{await saveNextDecision({decision:'dismissed'});}catch(e){$('#error').textContent=e.message;}return;}
  const overridePlan=event.target.closest('.override-next-plan');if(overridePlan){try{await saveNextDecision({decision:'overridden',selectedSkillCode:overridePlan.dataset.skillCode||null,selectedLessonId:overridePlan.dataset.lessonId||null});}catch(e){$('#error').textContent=e.message;}return;}
  const langSave=event.target.closest('.save-program-language');if(langSave){const card=langSave.closest('.program-card');try{await api(`../api/admin/programs/${encodeURIComponent(card.dataset.programId)}/language`,{method:'PUT',body:JSON.stringify({instructionLocale:card.querySelector('.program-language').value})});await load();}catch(e){$('#error').textContent=e.message;}return;}
  if(event.target.closest('#save-placement')){try{await savePlacement();}catch(e){$('#error').textContent=e.message;}return;}
  const skillSave=event.target.closest('.save-skill');if(skillSave){try{await saveSkill(skillSave);}catch(e){$('#error').textContent=e.message;}return;}
  const toggle=event.target.closest('.toggle-attendance');
  if(toggle){const editor=toggle.closest('.session-card').querySelector('.attendance-editor');editor.hidden=!editor.hidden;toggle.textContent=editor.hidden?'Tomar asistencia':'Ocultar asistencia';return;}
  const save=event.target.closest('.save-attendance');
  if(save){try{await saveAttendance(save.closest('.session-card'));}catch(e){$('#error').textContent=e.message;}return;}
  const student=event.target.closest('[data-open-student]');
  if(student){try{await openStudent(student.dataset.openStudent);}catch(e){$('#error').textContent=e.message;}}
});
$('#platform-form').addEventListener('submit',async event=>{event.preventDefault();if(!activeStudentId)return;const payload=Object.fromEntries(new FormData(event.target).entries());try{await api(`../api/admin/students/${encodeURIComponent(activeStudentId)}/platform-accounts/verify`,{method:'POST',body:JSON.stringify(payload)});event.target.reset();await openStudent(activeStudentId);}catch(e){$('#error').textContent=e.message;}});
$('#portal-access-form').addEventListener('submit',async event=>{event.preventDefault();if(!activeStudentId)return;const payload=Object.fromEntries(new FormData(event.target).entries());try{const result=await api(`../api/admin/students/${encodeURIComponent(activeStudentId)}/portal-access`,{method:'POST',body:JSON.stringify(payload)});$('#portal-credentials').innerHTML=`<strong>Usuario:</strong> ${esc(result.loginName)}<br><strong>Código:</strong> ${esc(result.accessCode)}<br><small>Guárdalo ahora: el código solo se muestra una vez.</small>`;}catch(e){$('#error').textContent=e.message;}});
$('#note-form').addEventListener('submit',async event=>{event.preventDefault();if(!activeStudentId)return;const payload=Object.fromEntries(new FormData(event.target).entries());try{await api(`../api/admin/students/${encodeURIComponent(activeStudentId)}/notes`,{method:'POST',body:JSON.stringify(payload)});event.target.reset();await openStudent(activeStudentId);}catch(e){$('#error').textContent=e.message;}});
$('#staff-login-form').addEventListener('submit',async event=>{event.preventDefault();$('#error').textContent='';const payload=Object.fromEntries(new FormData(event.target).entries());try{const result=await api('../api/staff/login',{method:'POST',body:JSON.stringify(payload)});staffToken=result.sessionToken;staffAccount=result.account;localStorage.setItem('hmena_staff_session',staffToken);event.target.reset();applyStaffState();await load();}catch(e){$('#error').textContent=e.message;}});
$('#staff-logout').onclick=async()=>{try{await api('../api/staff/logout',{method:'POST',body:JSON.stringify({})});}catch{}staffToken='';staffAccount=null;localStorage.removeItem('hmena_staff_session');applyStaffState();$('#date').textContent='Inicia sesión para continuar.';};
$('#reload').onclick=()=>load().catch(e=>$('#error').textContent=e.message);
applyStaffState();restoreStaffSession();