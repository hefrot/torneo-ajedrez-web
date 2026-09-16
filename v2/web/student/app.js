const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let token=localStorage.getItem('hmena_student_session')||'';
let locale=localStorage.getItem('hmena_portal_locale')||null;
const copy={
  en:{brand:'MY PROGRESS',logout:'Log out',private:'Private access',title:'My Progress',help:'Enter the username and code your coach gave you.',username:'Username',code:'Code',login:'Sign in',subtitle:'Classes, skills and ratings in one place.',student:'Student',attendance:'Attendance',comprehension:'Comprehension',accounts:'Chess accounts',ratings:'Rating progress',priorities:'Learning priorities',classes:'Upcoming classes',assignments:'Assignments',notes:'Notes shared by your coach',noRatings:'Link Lichess or Chess.com to start tracking rating.',noPriorities:'No learning priorities calculated yet.',noClasses:'No upcoming classes scheduled.',noAssignments:'No pending assignments.',pending:'HMENA assessment pending',hello:'Hello',noStudents:'No students are linked to this account.',days:'days tracked',language:'Class language',en:'English',es:'Spanish',bilingual:'Bilingual',ratingAlt:'Rating progress'},
  es:{brand:'MI PROGRESO',logout:'Cerrar sesión',private:'Acceso privado',title:'Mi progreso',help:'Ingresa el usuario y código que te dio tu coach.',username:'Usuario',code:'Código',login:'Entrar',subtitle:'Clases, habilidades y ratings en un solo lugar.',student:'Alumno',attendance:'Asistencia',comprehension:'Comprensión',accounts:'Cuentas de ajedrez',ratings:'Progreso de rating',priorities:'Prioridades de aprendizaje',classes:'Próximas clases',assignments:'Tareas',notes:'Notas compartidas por tu coach',noRatings:'Vincula Lichess o Chess.com para empezar a medir tu rating.',noPriorities:'Aún no hay prioridades de aprendizaje calculadas.',noClasses:'No hay próximas clases cargadas.',noAssignments:'No hay tareas pendientes.',pending:'Evaluación HMENA pendiente',hello:'Hola',noStudents:'No hay alumnos vinculados a esta cuenta.',days:'días registrados',language:'Idioma de la clase',en:'Inglés',es:'Español',bilingual:'Bilingüe',ratingAlt:'Progreso de rating'}
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
function studentCard(s){
  const placement=s.placement?`${esc(s.placement.bandTitle)} · ${s.placement.ratingMin}–${s.placement.ratingMax}`:t('pending');
  const priorities=s.priorities?.map(p=>`<li><strong>${esc(p.title)}</strong><br><small>${esc(p.reason)}</small></li>`).join('')||`<li>${t('noPriorities')}</li>`;
  const upcoming=s.upcoming?.map(x=>`<li>${esc(x.startsAt)} · ${esc(x.schoolName||x.programName)}${x.weekNo?` · ${locale==='es'?'Semana':'Week'} ${x.weekNo}`:''} · ${t('language')}: ${t(x.instructionLocale||'en')}</li>`).join('')||`<li>${t('noClasses')}</li>`;
  const assignments=s.assignments?.map(x=>`<li><strong>${esc(x.title)}</strong>${x.dueAt?` · ${esc(x.dueAt)}`:''}</li>`).join('')||`<li>${t('noAssignments')}</li>`;
  const notes=s.sharedCoachNotes?.map(x=>`<li>${esc(x.note)}</li>`).join('')||'';
  return `<article class="panel student-progress-card"><div class="coach-card-head"><div><span class="eyebrow">${t('student')}</span><h2>${esc(s.displayName)}</h2></div><span class="status-badge">${placement}</span></div>
    <div class="profile-stats"><article><strong>${s.attendance?.present||0}/${s.attendance?.total||0}</strong><span>${t('attendance')}</span></article><article><strong>${s.attendance?.avgComprehension??'—'}</strong><span>${t('comprehension')}</span></article><article><strong>${s.ratings?.accounts?.length||0}</strong><span>${t('accounts')}</span></article></div>
    <h3>${t('ratings')}</h3><div class="rating-grid">${ratingCards(s.ratings)}</div>
    <h3>${t('priorities')}</h3><ul>${priorities}</ul>
    <h3>${t('classes')}</h3><ul>${upcoming}</ul><h3>${t('assignments')}</h3><ul>${assignments}</ul>${notes?`<h3>${t('notes')}</h3><ul>${notes}</ul>`:''}</article>`;
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
$('#logout').onclick=()=>{token='';localStorage.removeItem('hmena_student_session');location.reload();};
if(token){loadPortal().catch(()=>{localStorage.removeItem('hmena_student_session');token='';if(locale)chooseLanguage(locale);});}
else if(locale){chooseLanguage(locale);}
else{$('#language-panel').hidden=false;$('#login-panel').hidden=true;$('#language-tools').hidden=true;}
