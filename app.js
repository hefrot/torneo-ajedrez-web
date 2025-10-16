// app.js — Ranking por puntos de JUEGOS (3 por victoria, 1 por tablas), 3 juegos por enfrentamiento
(async function(){
  const { getDatabase, ref, onValue } =
    await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js");

  const waLink = (raw) => {
    if(!raw) return null;
    let num = String(raw).replace(/\s|-/g,'');
    return num.startsWith('+') ? `https://wa.me/${num.replace('+','')}` : null;
  };
  const esc = (s)=> String(s||'').replace(/[&<>\"']/g,
    c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#39;' }[c]));

  // --- UI refs
  const statPlayers = document.getElementById('statPlayers');
  const statRound   = document.getElementById('statRound');
  const statGames   = document.getElementById('statGames');
  const roundTitle  = document.getElementById('roundTitle');
  const playersGrid = document.getElementById('playersGrid');
  const pairingsGrid= document.getElementById('pairingsGrid');

  const app = window.firebaseApp;
  if(!app){ console.error('Firebase app no inicializada'); return; }
  const db = getDatabase(app);

  // Estado
  let currentRound = 1;
  let rosterByName = {};  // name -> {name, rating, whatsapp}
  let pairings = {};      // id -> pairing

  // Lee ronda actual
  onValue(ref(db,'tournament'), snap=>{
    const t = snap.val()||{};
    currentRound = t.currentRound || 1;
    statRound && (statRound.textContent  = currentRound);
    roundTitle && (roundTitle.textContent = currentRound);
    renderPairings();
  });

  // Lee jugadores (ROSTER). No contiene puntos; solo identidad.
  onValue(ref(db,'jugadores'), snap=>{
    const jug = snap.val()||{};
    rosterByName = {};
    Object.values(jug).forEach(p => {
      const name = p.nombre || p.name || p.nombreCompleto;
      if(!name) return;
      rosterByName[name] = {
        name,
        rating: Number(p.eloActual ?? p.elo ?? 1000),
        whatsapp: p.whatsapp || p.telefono || null
      };
    });
    statPlayers && (statPlayers.textContent = Object.keys(rosterByName).length);
    renderLeaderboard(); // se recalcula cuando haya pairings también
  });

  // Lee pairings (publicados) con game1..game3 y result
  onValue(ref(db,'pairings'), snap=>{
    pairings = snap.val()||{};
    const totalScheduledGames = Object.keys(pairings).length * 3;
    statGames && (statGames.textContent = totalScheduledGames);
    renderLeaderboard();
    renderPairings();
  });

  // --- Ranking desde pairings por JUEGO (3/1/0)
  function computeStatsFromPairings(){
    // Inicializa stats para todos del roster
    const stats = {};
    for(const name of Object.keys(rosterByName)){
      stats[name] = {
        name,
        rating: rosterByName[name].rating,
        whatsapp: rosterByName[name].whatsapp,
        games: 0,     // juegos disputados (no enfrentamientos)
        wins: 0,      // a nivel juego
        draws: 0,
        losses: 0,
        points: 0     // 3/1/0 por juego
      };
    }
    // Recorre pairings publicados y aplica game1..game3
    for(const p of Object.values(pairings)){
      const w = p.white, b = p.black;
      if(!stats[w]) stats[w] = {name:w, rating:0, whatsapp:null, games:0,wins:0,draws:0,losses:0,points:0};
      if(!stats[b]) stats[b] = {name:b, rating:0, whatsapp:null, games:0,wins:0,draws:0,losses:0,points:0};
      const games = [p.game1, p.game2, p.game3];
      for(const g of games){
        if(!g) { continue; } // si faltó cargar, no suma
        if(g==='white'){
          stats[w].points += 3; stats[w].wins += 1; stats[w].games += 1;
          stats[b].losses += 1; stats[b].games += 1;
        }else if(g==='black'){
          stats[b].points += 3; stats[b].wins += 1; stats[b].games += 1;
          stats[w].losses += 1; stats[w].games += 1;
        }else if(g==='draw'){
          stats[w].points += 1; stats[b].points += 1;
          stats[w].draws += 1; stats[b].draws += 1;
          stats[w].games += 1; stats[b].games += 1;
        }
      }
    }
    return stats;
  }

  function sortPlayers(list){
    return list.sort((a,b)=>{
      if(b.points !== a.points) return b.points - a.points;
      if(b.wins   !== a.wins)   return b.wins   - a.wins;
      if(b.rating !== a.rating) return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });
  }

  function renderLeaderboard(){
    if(!playersGrid) return;
    playersGrid.innerHTML = '';
    const stats = computeStatsFromPairings();
    const arr = Object.values(stats);
    sortPlayers(arr).forEach((p,i)=>{
      const podium = (i===0?'gold': i===1?'silver': i===2?'bronze':'');
      const card = document.createElement('div');
      card.className = 'card fadein';
      card.innerHTML = `
        <div class="card-header">
          <div class="rank ${podium}">
            <div class="rank-num">${i+1}</div>
            <strong>${esc(p.name)}</strong>
          </div>
          <span class="badge">ELO ${p.rating||'-'}</span>
        </div>
        <div class="card-body">
          <div class="kv"><span>Juegos</span><strong>${p.games}</strong></div>
          <div class="kv"><span>Puntos</span><strong>${p.points}</strong></div>
          <div class="kv"><span>G / E / P (juegos)</span><strong>
            <span class="tag win">${p.wins} G</span>
            <span class="tag draw">${p.draws} E</span>
            <span class="tag loss">${p.losses} P</span>
          </strong></div>
          ${p.whatsapp ? `<a class="tag whatsapp" target="_blank" rel="noopener" href="${waLink(p.whatsapp)}"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:''}
        </div>
      `;
      playersGrid.appendChild(card);
    });
  }

  function renderPairings(){
    if(!pairingsGrid) return;
    pairingsGrid.innerHTML = '';
    const list = Object.values(pairings||{}).filter(p=> Number(p.round)===Number(currentRound));
    if(list.length===0){
      const empty = document.createElement('div');
      empty.className = 'badge';
      empty.textContent = 'Sin pareos publicados para esta ronda';
      pairingsGrid.appendChild(empty);
      return;
    }
    list.forEach(m=>{
      const card = document.createElement('div');
      card.className = 'card pairing fadein';
      const waW = waLink(m.whiteWhatsapp);
      const waB = waLink(m.blackWhatsapp);
      // Construye marcador textual por juegos si ya hay datos
      const g = [m.game1, m.game2, m.game3].map(x=>x||'—');
      const scoreLabel = (function(){
        let w=0,b=0;
        for(const x of [m.game1, m.game2, m.game3]){
          if(x==='white') w++; else if(x==='black') b++; // esto es solo visual por victorias
        }
        return (w||b) ? `(${w}-${b})` : '(0-0)';
      })();
      card.innerHTML = `
        <div class="card-header">
          <div><strong>Ronda ${m.round}</strong> <span class="muted">${scoreLabel}</span></div>
          <div class="badge">${m.date || 'Fecha por definir'}</div>
        </div>
        <div class="card-body">
          <div class="players-row">
            <div>${esc(m.white)}</div>
            <div class="vs">VS</div>
            <div>${esc(m.black)}</div>
          </div>
          <div class="kv"><span>Juego 1</span><strong>${g[0]}</strong></div>
          <div class="kv"><span>Juego 2</span><strong>${g[1]}</strong></div>
          <div class="kv"><span>Juego 3</span><strong>${g[2]}</strong></div>
          <div class="actions">
            ${waW? `<a class="btn" target="_blank" rel="noopener" href="${waW}"><i class="fa-brands fa-whatsapp"></i> ${esc((m.white||'').split(' ')[0])}</a>`:''}
            ${waB? `<a class="btn" target="_blank" rel="noopener" href="${waB}"><i class="fa-brands fa-whatsapp"></i> ${esc((m.black||'').split(' ')[0])}</a>`:''}
          </div>
          <div class="badge">Estado global: ${m.result || 'pendiente'} • BO3</div>
        </div>
      `;
      pairingsGrid.appendChild(card);
    });
  }
})();
