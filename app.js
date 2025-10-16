// app.js — Ranking por juegos (3/1/0) + ELO Performance + % rendimiento
// Tips: ajusta DEFAULT_COUNTRY_CODE si tus números no traen +código
const DEFAULT_COUNTRY_CODE = '52';

(async function(){
  const { getDatabase, ref, onValue } =
    await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js");

  // WhatsApp: acepta '+', '00', o sólo dígitos locales (aplica DEFAULT_COUNTRY_CODE)
  const waLink = (raw) => {
    if(!raw) return null;
    let s = String(raw).trim();
    // si es url directa de wa, respétala
    if(/^https?:\/\/wa\.me\//i.test(s) || /^https?:\/\/api\.whatsapp\.com\//i.test(s)) return s;
    s = s.replace(/\s|-/g, '');
    if(s.startsWith('00')) s = '+' + s.slice(2);
    if(!s.startsWith('+')) {
      // si vino en formato local, prefiere MX +52 por defecto (ajustable)
      if(/^\d{10,11}$/.test(s)) s = '+' + DEFAULT_COUNTRY_CODE + s.replace(/^0+/,'');
      else return null;
    }
    const digits = s.replace('+','');
    return `https://wa.me/${digits}`;
  };

  const esc = (s)=> String(s||'').replace(/[&<>\"']/g,
    c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#39;' }[c]));

  const statPlayers = document.getElementById('statPlayers');
  const statRound   = document.getElementById('statRound');
  const statGames   = document.getElementById('statGames');
  const roundTitle  = document.getElementById('roundTitle');
  const playersGrid = document.getElementById('playersGrid');
  const pairingsGrid= document.getElementById('pairingsGrid');

  const app = window.firebaseApp;
  if(!app){ console.error('Firebase app no inicializada'); return; }
  const db = getDatabase(app);

  let currentRound = 1;
  let rosterByName = {}, pairings = {};

  onValue(ref(db,'tournament'), snap=>{
    const t = snap.val()||{};
    currentRound = t.currentRound || 1;
    statRound && (statRound.textContent  = currentRound);
    roundTitle && (roundTitle.textContent = currentRound);
    renderPairings();
  });

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
    renderLeaderboard();
  });

  onValue(ref(db,'pairings'), snap=>{
    pairings = snap.val()||{};
    const totalScheduledGames = Object.keys(pairings).length * 3;
    statGames && (statGames.textContent = totalScheduledGames);
    renderLeaderboard();
    renderPairings();
  });

  function computeStatsFromPairings(){
    const stats = {}, ensure = (n)=>{
      if(!stats[n]) stats[n] = {name:n, rating:0, whatsapp:null, games:0,wins:0,draws:0,losses:0,points:0, roundsReported:0, perfOppSum:0, perfGames:0, perfScoreSum:0};
      return stats[n];
    };
    for(const name of Object.keys(rosterByName)){
      stats[name] = {
        name,
        rating: rosterByName[name].rating,
        whatsapp: rosterByName[name].whatsapp,
        games: 0, wins:0, draws:0, losses:0,
        points: 0,
        roundsReported: 0,
        perfOppSum: 0,
        perfGames: 0,
        perfScoreSum: 0
      };
    }
    for(const p of Object.values(pairings)){
      const wName = p.white, bName = p.black;
      const w = ensure(wName), b = ensure(bName);
      const wOppRating = rosterByName[bName]?.rating ?? 0;
      const bOppRating = rosterByName[wName]?.rating ?? 0;

      const games = [p.game1, p.game2, p.game3];
      const full = games.every(Boolean);
      if(full){ w.roundsReported += 1; b.roundsReported += 1; }
      for(const g of games){
        if(!g) continue;
        if(g==='white'){ w.points += 3; w.wins += 1; w.games += 1; b.losses += 1; b.games += 1; w.perfScoreSum += 1;   b.perfScoreSum += 0; }
        else if(g==='black'){ b.points += 3; b.wins += 1; b.games += 1; w.losses += 1; w.games += 1; b.perfScoreSum += 1;   w.perfScoreSum += 0; }
        else if(g==='draw'){ w.points += 1; b.points += 1; w.draws += 1; b.draws += 1; w.games += 1; b.games += 1; w.perfScoreSum += 0.5; b.perfScoreSum += 0.5; }
        w.perfOppSum += wOppRating; b.perfOppSum += bOppRating; w.perfGames  += 1; b.perfGames  += 1;
      }
    }
    for(const s of Object.values(stats)){
      if(s.perfGames > 0){
        const Ra = s.perfOppSum / s.perfGames;
        const p  = s.perfScoreSum / s.perfGames;
        s.perf   = Math.round(Ra + 800*p - 400); // ELO performance (lineal)
      }else{ s.perf = null; }
      const maxPts = s.roundsReported * 9;
      s.maxPts = maxPts;
      s.pct = maxPts ? Math.round((s.points / maxPts) * 100) : 0;
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
      const maxLabel = p.maxPts ? ` / ${p.maxPts} (9×${p.roundsReported})` : '';
      const perfLabel = (p.perf ? `ELO Perf: ${p.perf}` : 'ELO Perf: —');
      const pctLabel = (p.maxPts ? `${p.pct}%` : '—');
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
          <div class="kv"><span>Rondas reportadas</span><strong>${p.roundsReported}</strong></div>
          <div class="kv"><span>Puntos (máx 9 por ronda)</span><strong>${p.points}${maxLabel}</strong></div>
          <div class="kv"><span>% rendimiento</span><strong>${pctLabel}</strong></div>
          <div class="kv"><span>Juegos</span><strong>${p.games}</strong></div>
          <div class="kv"><span>G / E / P (juegos)</span><strong>
            <span class="tag win">${p.wins} G</span>
            <span class="tag draw">${p.draws} E</span>
            <span class="tag loss">${p.losses} P</span>
          </strong></div>
          <div class="kv"><span>${esc(perfLabel)}</span></div>
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
      const g = [m.game1, m.game2, m.game3].map(x=>x||'—');
      const scoreLabel = (function(){
        let w=0,b=0;
        for(const x of [m.game1, m.game2, m.game3]){ if(x==='white') w++; else if(x==='black') b++; }
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
