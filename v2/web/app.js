const one=selector=>document.querySelector(selector);
const all=selector=>Array.from(document.querySelectorAll(selector));
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

async function api(path){
  const response=await fetch(path);
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.error||('HTTP '+response.status));
  return data;
}
const platformName=value=>value==='chesscom'?'Chess.com':value==='lichess'?'Lichess':'Sin plataforma';

function renderStandings(rows){
  const element=one('#standings');
  if(!rows.length){element.innerHTML='<div class="empty">La liga oficial aún no inicia. El histórico y Community XP no suman puntos oficiales.</div>';return;}
  element.innerHTML=rows.map(row=>'<article class="rank-row"><div class="rank-number">'+row.rank+'</div><div><div class="row-title">'+esc(row.name)+'</div><div class="row-meta"><span>'+row.played+' PJ</span><span>'+row.wins+' G</span><span>'+row.draws+' E</span><span>'+row.losses+' P</span></div></div><div class="points"><strong>'+row.points+'</strong><span>puntos liga</span></div></article>').join('');
}
function renderPlayers(rows){
  const element=one('#players');
  if(!rows.length){element.innerHTML='<div class="empty">Aún no hay identidades recuperadas.</div>';return;}
  element.innerHTML=rows.map(player=>'<article class="player-row"><div><div class="row-title">'+esc(player.name)+'</div><div class="row-meta"><span>@'+esc(player.username||'pendiente')+'</span><span>'+(player.registration_status==='historical_unconfirmed'?'Histórico · debe registrarse':esc(player.registration_status||'pending'))+'</span></div></div><span class="platform-badge">'+platformName(player.platform)+'</span></article>').join('');
}
function renderActivity(rows){
  const element=one('#activity');
  const ranked=rows.slice().sort((a,b)=>b.games30d-a.games30d||b.gamesAllTime-a.gamesAllTime||a.name.localeCompare(b.name));
  if(!ranked.length){element.innerHTML='<div class="empty">SIN DATA de actividad verificada.</div>';return;}
  element.innerHTML=ranked.slice(0,20).map(player=>'<article class="activity-row"><div><div class="row-title">'+esc(player.name)+'</div><div class="row-meta"><span>'+player.games7d+' partidas 7d</span><span>'+player.games30d+' partidas 30d</span><span>'+player.distinctOpponents+' rivales</span></div></div><span class="status-badge '+(player.games7d?'status-ok':'')+'">'+(player.games7d?'Activo':'Histórico')+'</span></article>').join('');
}
function setText(selector,value){const element=one(selector);if(element)element.textContent=value;}
function renderHighlights(data){
  const active=data.mostActive7d;
  if(active){setText('#highlight-active',active.name);setText('#highlight-active-detail',active.games7d+' partidas verificadas.');}
  const rivalry=data.featuredRivalry;
  if(rivalry){setText('#highlight-rivalry',rivalry.nameA+' vs '+rivalry.nameB);setText('#highlight-rivalry-detail',rivalry.wins+'-'+rivalry.draws+'-'+rivalry.losses+' en '+rivalry.total+' partidas.');}
  const rating=data.largestRatingChange30d;
  if(rating){setText('#highlight-rating',rating.name);setText('#highlight-rating-detail',(rating.ratingDelta30d>=0?'+':'')+rating.ratingDelta30d+' en 30 días.');}
  const opponents=data.mostDistinctOpponents;
  if(opponents){setText('#highlight-opponents',opponents.name);setText('#highlight-opponents-detail',opponents.distinctOpponents+' rivales verificados.');}
  if(data.hallOfFame?.records){setText('#highlight-hall',data.hallOfFame.records+' registros');setText('#highlight-hall-detail',data.hallOfFame.linked+' vinculados por ID estable; el resto sigue en REVIEW.');}
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
  setText('#stat-games',metrics.reduce((sum,row)=>sum+row.gamesAllTime,0)/2);
  setText('#stat-active',metrics.filter(row=>row.games7d>0).length);
  setText('#stat-hall',highlights?.hallOfFame?.records||0);
}
setupTabs();
load();
