const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let key=sessionStorage.getItem('hmena_chess_admin_key')||'';
let dashboardData=null;
let activeStudentId=null;
$('#admin-key').value=key;

async function api(path,options={}){
  const response=await fetch(path,{...options,headers:{'x-admin-key':key,...(options.body?{'Content-Type':'application/json'}:{}),...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`);
  return data;
}
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
  return `<article class="panel coach-card session-card" data-session-id="${esc(s.id)}">
    <div class="coach-card-head"><div><strong>${esc(s.school_name||s.program_name)}</strong><div class="row-meta">${esc(s.starts_at)} · Semana ${s.week_no||'-'}/${s.planned_weeks||'-'} · ${s.roster.length} alumnos</div></div><span class="status-badge">${esc(s.program_type)}</span></div>
    <div class="coach-sub">${lessons}</div>
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
async function openStudent(studentId){
  activeStudentId=studentId; const d=await api(`../api/admin/students/${encodeURIComponent(studentId)}/profile`);
  $('#student-title').textContent=d.student.displayName;
  const recentSkills=d.skills.slice(0,8).map(s=>`<li>${esc(s.title)} <span class="status-badge">${esc(s.status)}</span></li>`).join('')||'<li>Sin skills evaluadas todavía</li>';
  const programs=d.enrollments.map(e=>`<li>${esc(e.schoolName||e.programName)} · ${esc(e.programName)}${e.cohortTier?' · '+esc(e.cohortTier):''}</li>`).join('')||'<li>Sin programas</li>';
  const notes=d.notes.slice(0,6).map(n=>`<li><strong>${esc(n.visibility)}</strong> · ${esc(n.note)}</li>`).join('')||'<li>Sin notas</li>';
  $('#student-profile').innerHTML=`<div class="profile-stats"><article><strong>${d.student.currentLevel??'—'}</strong><span>Nivel actual</span></article><article><strong>${d.attendance.present||0}/${d.attendance.total||0}</strong><span>Asistencia</span></article><article><strong>${d.attendance.avgComprehension??'—'}</strong><span>Comprensión prom.</span></article></div><h3>Programas</h3><ul>${programs}</ul><h3>Skills recientes</h3><ul>${recentSkills}</ul><h3>Notas</h3><ul>${notes}</ul>`;
  if(!$('#student-dialog').open)$('#student-dialog').showModal();
}
async function load(){
  $('#error').textContent=''; dashboardData=await api('../api/admin/coach/dashboard');
  const d=dashboardData; $('#date').textContent=d.date; $('#dashboard').hidden=false;
  $('#summary').innerHTML=[['Alumnos activos',d.totals.activeStudents],['Programas activos',d.totals.activePrograms],['Clases hoy',d.totals.todaySessions],['Alertas',d.totals.alerts]].map(([l,v])=>`<article class="stat"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></article>`).join('');
  $('#sessions').innerHTML=d.todaySessions.length?d.todaySessions.map(sessionCard).join(''):'<div class="empty">No hay clases cargadas para hoy.</div>';
  d.todaySessions.forEach(s=>{const card=document.querySelector(`[data-session-id="${CSS.escape(s.id)}"]`);if(card)hydrateAttendance(card,s);});
  $('#alerts').innerHTML=d.alerts.length?d.alerts.map(a=>`<article class="panel coach-card"><strong>${a.priority==='high'?'⚠️':'ℹ️'} ${esc(a.message)}</strong>${a.studentId?`<button class="student-link" data-open-student="${esc(a.studentId)}" type="button">Abrir alumno</button>`:''}</article>`).join(''):'<div class="empty">Sin alertas pedagógicas.</div>';
  $('#programs').innerHTML=d.programs.length?d.programs.map(p=>`<article class="panel coach-card"><div><strong>${esc(p.school_name||p.name)}</strong><div class="row-meta">${esc(p.name)} · ${p.active_students} alumnos · Semana ${p.completed_week||0}/${p.planned_weeks||'-'}</div></div><span class="status-badge status-ok">${esc(p.status)}</span></article>`).join(''):'<div class="empty">Sin programas activos.</div>';
}

document.addEventListener('click',async event=>{
  const toggle=event.target.closest('.toggle-attendance');
  if(toggle){const editor=toggle.closest('.session-card').querySelector('.attendance-editor');editor.hidden=!editor.hidden;toggle.textContent=editor.hidden?'Tomar asistencia':'Ocultar asistencia';return;}
  const save=event.target.closest('.save-attendance');
  if(save){try{await saveAttendance(save.closest('.session-card'));}catch(e){$('#error').textContent=e.message;}return;}
  const student=event.target.closest('[data-open-student]');
  if(student){try{await openStudent(student.dataset.openStudent);}catch(e){$('#error').textContent=e.message;}}
});
$('#note-form').addEventListener('submit',async event=>{event.preventDefault();if(!activeStudentId)return;const payload=Object.fromEntries(new FormData(event.target).entries());try{await api(`../api/admin/students/${encodeURIComponent(activeStudentId)}/notes`,{method:'POST',body:JSON.stringify(payload)});event.target.reset();await openStudent(activeStudentId);}catch(e){$('#error').textContent=e.message;}});
$('#save-key').onclick=()=>{key=$('#admin-key').value.trim();sessionStorage.setItem('hmena_chess_admin_key',key);load().catch(e=>$('#error').textContent=e.message)};
$('#reload').onclick=()=>load().catch(e=>$('#error').textContent=e.message);
if(key)load().catch(e=>$('#error').textContent=e.message);