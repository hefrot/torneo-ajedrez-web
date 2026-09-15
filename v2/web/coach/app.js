const $=s=>document.querySelector(s); const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let key=sessionStorage.getItem('hmena_chess_admin_key')||''; $('#admin-key').value=key;
async function load(){
  $('#error').textContent='';
  const r=await fetch('../api/admin/coach/dashboard',{headers:{'x-admin-key':key}}); const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error||`HTTP ${r.status}`);
  $('#date').textContent=d.date; $('#dashboard').hidden=false;
  $('#summary').innerHTML=[['Alumnos activos',d.totals.activeStudents],['Programas activos',d.totals.activePrograms],['Clases hoy',d.totals.todaySessions],['Alertas',d.totals.alerts]].map(([l,v])=>`<article class="stat"><div class="stat-value">${v}</div><div class="stat-label">${l}</div></article>`).join('');
  $('#sessions').innerHTML=d.todaySessions.length?d.todaySessions.map(s=>`<article class="panel coach-card"><div><strong>${esc(s.school_name||s.program_name)}</strong><div class="row-meta">${esc(s.starts_at)} · Semana ${s.week_no||'-'}/${s.planned_weeks||'-'} · ${s.roster.length} alumnos</div></div><div class="coach-actions"><span class="status-badge">${esc(s.program_type)}</span></div><div class="coach-sub">${s.lessons.length?s.lessons.map(l=>esc(l.title)).join(' · '):'Sin lección asignada todavía'}</div></article>`).join(''):'<div class="empty">No hay clases cargadas para hoy.</div>';
  $('#alerts').innerHTML=d.alerts.length?d.alerts.map(a=>`<article class="panel coach-card"><strong>${a.priority==='high'?'⚠️':'ℹ️'} ${esc(a.message)}</strong></article>`).join(''):'<div class="empty">Sin alertas pedagógicas.</div>';
  $('#programs').innerHTML=d.programs.length?d.programs.map(p=>`<article class="panel coach-card"><div><strong>${esc(p.school_name||p.name)}</strong><div class="row-meta">${esc(p.name)} · ${p.active_students} alumnos · Semana ${p.completed_week||0}/${p.planned_weeks||'-'}</div></div><span class="status-badge status-ok">${esc(p.status)}</span></article>`).join(''):'<div class="empty">Sin programas activos.</div>';
}
$('#save-key').onclick=()=>{key=$('#admin-key').value.trim();sessionStorage.setItem('hmena_chess_admin_key',key);load().catch(e=>$('#error').textContent=e.message)};
$('#reload').onclick=()=>load().catch(e=>$('#error').textContent=e.message); if(key) load().catch(e=>$('#error').textContent=e.message);
