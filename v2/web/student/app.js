const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=localStorage.getItem('hmena_student_session')||'';

async function api(path,options={}){
  const headers={...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})};
  const response=await fetch(path,{...options,headers:{...headers,...(options.headers||{})}});
  const data=await response.json().catch(()=>({})); if(!response.ok)throw new Error(data.error||`HTTP ${response.status}`); return data;
}
function sparkline(points=[]){
  if(!points.length)return '<div class="empty">Aún no hay snapshots de rating.</div>';
  const vals=points.map(p=>Number(p.rating)); const min=Math.min(...vals),max=Math.max(...vals),span=Math.max(1,max-min),w=300,h=80,pad=8;
  const coords=vals.map((v,i)=>`${pad+(i*(w-2*pad)/Math.max(1,vals.length-1))},${h-pad-((v-min)/span)*(h-2*pad)}`).join(' ');
  return `<svg class="rating-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Progreso de rating"><polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`;
}
function ratingCards(ratings){
  if(!ratings?.series?.length)return '<div class="empty">Vincula Lichess o Chess.com para empezar a medir tu rating.</div>';
  return ratings.series.map(s=>`<article class="rating-card"><div class="rating-head"><strong>${esc(s.platform)} · ${esc(s.ratingType)}</strong><span>${s.latestRating} <small>${s.delta>=0?'+':''}${s.delta}</small></span></div>${sparkline(s.points)}<small>${esc(s.username)} · ${s.points.length} día${s.points.length===1?'':'s'} registrado${s.points.length===1?'':'s'}</small></article>`).join('');
}
function studentCard(s){
  const placement=s.placement?`${esc(s.placement.bandTitle)} · ${s.placement.ratingMin}–${s.placement.ratingMax}`:'Pendiente de evaluación HMENA';
  const priorities=s.priorities?.map(p=>`<li><strong>${esc(p.title)}</strong><br><small>${esc(p.reason)}</small></li>`).join('')||'<li>Sin prioridades calculadas todavía.</li>';
  const upcoming=s.upcoming?.map(x=>`<li>${esc(x.startsAt)} · ${esc(x.schoolName||x.programName)}${x.weekNo?` · Semana ${x.weekNo}`:''}</li>`).join('')||'<li>Sin próximas clases cargadas.</li>';
  const assignments=s.assignments?.map(x=>`<li><strong>${esc(x.title)}</strong>${x.dueAt?` · ${esc(x.dueAt)}`:''}</li>`).join('')||'<li>Sin tareas pendientes.</li>';
  const notes=s.sharedCoachNotes?.map(x=>`<li>${esc(x.note)}</li>`).join('')||'';
  return `<article class="panel student-progress-card"><div class="coach-card-head"><div><span class="eyebrow">Alumno</span><h2>${esc(s.displayName)}</h2></div><span class="status-badge">${placement}</span></div>
    <div class="profile-stats"><article><strong>${s.attendance?.present||0}/${s.attendance?.total||0}</strong><span>Asistencia</span></article><article><strong>${s.attendance?.avgComprehension??'—'}</strong><span>Comprensión</span></article><article><strong>${s.ratings?.accounts?.length||0}</strong><span>Cuentas de ajedrez</span></article></div>
    <h3>Progreso de rating</h3><div class="rating-grid">${ratingCards(s.ratings)}</div>
    <h3>Prioridades de aprendizaje</h3><ul>${priorities}</ul>
    <h3>Próximas clases</h3><ul>${upcoming}</ul><h3>Tareas</h3><ul>${assignments}</ul>${notes?`<h3>Notas compartidas por el coach</h3><ul>${notes}</ul>`:''}</article>`;
}
async function loadPortal(){
  const data=await api('../api/portal/me'); $('#login-panel').hidden=true; $('#portal').hidden=false; $('#logout').hidden=false;
  $('#welcome').textContent=data.account.role==='guardian'?`Hola, ${data.account.displayName}`:'Mi progreso';
  $('#students').innerHTML=data.students.map(studentCard).join('')||'<div class="empty">No hay alumnos vinculados a esta cuenta.</div>';
}
$('#login-form').addEventListener('submit',async event=>{event.preventDefault();$('#portal-error').textContent='';const payload=Object.fromEntries(new FormData(event.target).entries());try{const result=await api('../api/portal/login',{method:'POST',body:JSON.stringify(payload)});token=result.sessionToken;localStorage.setItem('hmena_student_session',token);event.target.reset();await loadPortal();}catch(e){$('#portal-error').textContent=e.message;}});
$('#logout').onclick=()=>{token='';localStorage.removeItem('hmena_student_session');location.reload();};
if(token)loadPortal().catch(()=>{localStorage.removeItem('hmena_student_session');token='';});
