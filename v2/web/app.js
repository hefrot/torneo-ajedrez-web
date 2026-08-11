const one=selector=>document.querySelector(selector);
const all=selector=>Array.from(document.querySelectorAll(selector));
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

async function api(path){
  const response=await fetch(path);
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.error||('HTTP '+response.status));
  return data;
}
const platformName=value=>value==='chesscom'?'Chess.com':value==='lichess'?'Lichess':'Cuenta verificada';

function renderStandings(rows){
  const element=one('#standings');
  if(!rows.length){element.innerHTML='<div class="empty">La liga comenzará cuando cierre el registro. Aquí aparecerán automáticamente los puntos oficiales.</div>';return;}
  element.innerHTML=rows.map(row=>'<article class="rank-row"><div class="rank-number">'+row.rank+'</div><div><div class="row-title">'+esc(row.name)+'</div><div class="row-meta"><span>'+row.played+' PJ</span><span>'+row.wins+' G</span><span>'+row.draws+' E</span><span>'+row.losses+' P</span></div></div><div class="points"><strong>'+row.points+'</strong><span>puntos liga</span></div></article>').join('');
}
function renderPlayers(rows){
  const element=one('#players');
  if(!rows.length){element.innerHTML='<div class="empty">Todavía no hay jugadores confirmados. Sé de los primeros en registrarte.</div>';return;}
  element.innerHTML=rows.map(player=>'<article class="player-row"><div><div class="row-title">'+esc(player.name)+'</div><div class="row-meta"><span>@'+esc(player.username||'')+'</span><span>✓ Cuenta verificada</span></div></div><span class="platform-badge status-ok">'+platformName(player.platform)+'</span></article>').join('');
}
function renderActivity(rows){
  const element=one('#activity');
  const ranked=rows.slice().sort((a,b)=>b.games30d-a.games30d||b.gamesAllTime-a.gamesAllTime||a.name.localeCompare(b.name));
  if(!ranked.length){element.innerHTML='<div class="empty">La actividad aparecerá cuando los jugadores confirmados empiecen a jugar.</div>';return;}
  element.innerHTML=ranked.slice(0,20).map(player=>'<article class="activity-row"><div><div class="row-title">'+esc(player.name)+'</div><div class="row-meta"><span>'+player.games7d+' partidas 7d</span><span>'+player.games30d+' partidas 30d</span><span>'+player.distinctOpponents+' rivales</span></div></div><span class="status-badge '+(player.games7d?'status-ok':'')+'">'+(player.games7d?'Activo':'Confirmado')+'</span></article>').join('');
}
function setText(selector,value){const element=one(selector);if(element)element.textContent=value;}
function showHighlight(cardId,titleId,detailId,title,detail){
  const card=one(cardId);if(!card)return 0;
  card.hidden=false;setText(titleId,title);setText(detailId,detail);return 1;
}
function renderHighlights(data){
  let visible=0;
  const active=data?.mostActive7d;
  if(active)visible+=showHighlight('#card-active','#highlight-active','#highlight-active-detail',active.name,active.games7d+' partidas verificadas.');
  const rivalry=data?.featuredRivalry;
  if(rivalry)visible+=showHighlight('#card-rivalry','#highlight-rivalry','#highlight-rivalry-detail',rivalry.nameA+' vs '+rivalry.nameB,rivalry.wins+'-'+rivalry.draws+'-'+rivalry.losses+' en '+rivalry.total+' partidas.');
  const rating=data?.largestRatingChange30d;
  if(rating)visible+=showHighlight('#card-rating','#highlight-rating','#highlight-rating-detail',rating.name,(rating.ratingDelta30d>=0?'+':'')+rating.ratingDelta30d+' en 30 días.');
  const opponents=data?.mostDistinctOpponents;
  if(opponents)visible+=showHighlight('#card-opponents','#highlight-opponents','#highlight-opponents-detail',opponents.name,opponents.distinctOpponents+' rivales distintos.');
  if((data?.hallOfFame?.records||0)>0)visible+=showHighlight('#card-hall','#highlight-hall','#highlight-hall-detail',data.hallOfFame.records+' logros vinculados','Historial confirmado de jugadores registrados.');
  const section=one('#highlights-section');if(section)section.hidden=visible===0;
}
function setupTabs(){
  all('.tab').forEach(button=>button.addEventListener('click',()=>{
    all('.tab').forEach(item=>item.classList.remove('active'));
    all('.tab-panel').forEach(item=>item.classList.remove('active'));
    button.classList.add('active');
    one('#tab-'+button.dataset.tab)?.classList.add('active');
  }));
}
async function load(){
  const results=await Promise.allSettled([api('api/standings'),api('api/players'),api('api/community/metrics'),api('api/community/highlights')]);
  const standings=results[0].status==='fulfilled'?results[0].value:[];
  const players=results[1].status==='fulfilled'?results[1].value:[];
  const metrics=results[2].status==='fulfilled'?results[2].value:[];
  const highlights=results[3].status==='fulfilled'?results[3].value:null;
  renderStandings(standings);
  renderPlayers(players);
  renderActivity(metrics);
  if(highlights)renderHighlights(highlights);
  setText('#stat-players',players.length);
  setText('#stat-games',Math.round(metrics.reduce((sum,row)=>sum+row.gamesAllTime,0)/2));
  setText('#stat-active',metrics.filter(row=>row.games7d>0).length);
  setText('#stat-hall',highlights?.hallOfFame?.records||0);
}
setupTabs();
load();
