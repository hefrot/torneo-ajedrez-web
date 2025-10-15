// app.js (página pública) - Firebase v9 modular
(async function(){
  const { getDatabase, ref, onValue } = await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js");

  const $  = (s)=> document.querySelector(s);
  const $$ = (s)=> Array.from(document.querySelectorAll(s));

  const waLink = (raw) => {
    if(!raw) return null;
    let num = String(raw).replace(/\s|-/g,'');
    return num.startsWith('+') ? `https://wa.me/${num.replace('+','')}` : null;
  };

  const pts = (p)=> ((p.wins||0)*3 + (p.draws||0));

  function sortPlayers(arr){
    return arr.slice().sort((a,b)=>{
      const pa = pts(a), pb = pts(b);
      if(pb!==pa) return pb-pa;
      if((b.wins||0)!==(a.wins||0)) return (b.wins||0)-(a.wins||0);
      if((b.rating||0)!==(a.rating||0)) return (b.rating||0)-(a.rating||0);
      return (a.name||'').localeCompare(b.name||'');
    });
  }

  const esc = (s)=> String(s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;' }[c]));

  function renderPlayers(players){
    const grid = document.getElementById('playersGrid');
    if(!grid) return;
    grid.innerHTML = '';
    const list = Object.entries(players||{}).map(([id,p])=>({id,...p}));
    const sorted = sortPlayers(list);
    sorted.forEach((p,i)=>{
      const top = (i===0?'gold': i===1?'silver': i===2?'bronze':'');
      const card = document.createElement('div');
      card.className = 'card fadein';
      card.innerHTML = `
        <div class="card-header">
          <div class="rank ${top}">
            <div class="rank-num">${i+1}</div>
            <strong>${esc(p.name)}</strong>
          </div>
          <span class="badge">ELO ${p.rating||'-'}</span>
        </div>
        <div class="card-body">
          <div class="kv"><span>Partidas</span><strong>${p.games||0}</strong></div>
          <div class="kv"><span>Puntos (3/1/0)</span><strong>${pts(p)}</strong></div>
          <div class="kv"><span>G / E / P</span><strong>
            <span class="tag win">${p.wins||0} G</span>
            <span class="tag draw">${p.draws||0} E</span>
            <span class="tag loss">${p.losses||0} P</span>
          </strong></div>
          ${p.whatsapp ? `<a class="tag whatsapp" target="_blank" rel="noopener" href="${waLink(p.whatsapp)}"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:''}
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function renderPairings(list){
    const grid = document.getElementById('pairingsGrid');
    if(!grid) return;
    grid.innerHTML = '';
    if(!list || !list.length){
      const empty = document.createElement('div');
      empty.className = 'badge';
      empty.textContent = 'Sin pareos publicados para esta ronda';
      grid.appendChild(empty);
      return;
    }
    list.forEach(m=>{
      const card = document.createElement('div');
      card.className = 'card pairing fadein';
      const waW = waLink(m.whiteWhatsapp);
      const waB = waLink(m.blackWhatsapp);
      card.innerHTML = `
        <div class="card-header">
          <div><strong>Ronda ${m.round}</strong></div>
          <div class="badge">${m.date || 'Fecha por definir'}</div>
        </div>
        <div class="card-body">
          <div class="players-row">
            <div>${esc(m.white)}</div>
            <div class="vs">VS</div>
            <div>${esc(m.black)}</div>
          </div>
          <div class="actions">
            ${waW? `<a class="btn" target="_blank" rel="noopener" href="${waW}"><i class="fa-brands fa-whatsapp"></i> ${esc((m.white||'').split(' ')[0])}</a>`:''}
            ${waB? `<a class="btn" target="_blank" rel="noopener" href="${waB}"><i class="fa-brands fa-whatsapp"></i> ${esc((m.black||'').split(' ')[0])}</a>`:''}
          </div>
          <div class="badge">Estado: ${m.result || 'pendiente'} • BO3</div>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  const app = window.firebaseApp;
  if(!app){
    console.error('Firebase app no inicializada en index.html');
    return;
  }
  const db = getDatabase(app);

  const statPlayers = document.getElementById('statPlayers');
  const statRound   = document.getElementById('statRound');
  const statGames   = document.getElementById('statGames');
  const roundTitle  = document.getElementById('roundTitle');

  let currentRound = 1;
  let players = {};
  let pairings = {};

  onValue(ref(db,'tournament'), snap=>{
    const t = snap.val()||{};
    currentRound = t.currentRound || 1;
    if(statRound)  statRound.textContent  = currentRound;
    if(roundTitle) roundTitle.textContent = currentRound;
    if(pairings) {
      const list = Object.values(pairings||{}).filter(p=>p.round===currentRound);
      renderPairings(list);
    }
  });

  onValue(ref(db,'players'), snap=>{
    players = snap.val()||{};
    if(statPlayers) statPlayers.textContent = Object.keys(players).length;
    renderPlayers(players);
  });

  onValue(ref(db,'pairings'), snap=>{
    pairings = snap.val()||{};
    const all = Object.values(pairings||{});
    if(statGames) statGames.textContent = all.length;
    const list = all.filter(p=>p.round===currentRound);
    renderPairings(list);
  });
})();
