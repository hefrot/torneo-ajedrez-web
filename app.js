// app.js — Ranking por juegos (3/1/0) + ELO Performance + % rendimiento + WhatsApp multi-país
const DEFAULT_COUNTRY_CODE = '52';

const COUNTRY_MAP = {
  // ISO2 or common names -> country calling code (string, no +)
  'MX': '52', 'MEXICO': '52',
  'AR': '54', 'ARGENTINA': '54',
  'CL': '56', 'CHILE': '56',
  'CO': '57', 'COLOMBIA': '57',
  'PE': '51', 'PERU': '51', 'PERÚ': '51',
  'EC': '593', 'ECUADOR': '593',
  'UY': '598', 'URUGUAY': '598',
  'PY': '595', 'PARAGUAY': '595',
  'BO': '591', 'BOLIVIA': '591',
  'VE': '58',  'VENEZUELA': '58',
  'CR': '506', 'COSTA RICA': '506',
  'PA': '507', 'PANAMA': '507', 'PANAMÁ': '507',
  'GT': '502', 'GUATEMALA': '502',
  'SV': '503', 'EL SALVADOR': '503',
  'HN': '504', 'HONDURAS': '504',
  'NI': '505', 'NICARAGUA': '505',
  'BR': '55',  'BRASIL': '55', 'BRAZIL': '55',
  'DO': '1',   'RD': '1', 'REPUBLICA DOMINICANA': '1', 'REPÚBLICA DOMINICANA': '1',
  'PR': '1',   'PUERTO RICO': '1',
  'US': '1',   'USA': '1', 'EEUU': '1', 'ESTADOS UNIDOS': '1',
  'ES': '34',  'ESPAÑA': '34',
  'CU': '53',  'CUBA': '53'
};
function normCC(raw) {
  if(!raw) return null;
  let s = String(raw).trim().toUpperCase();
  if(s.startsWith('+')) s = s.slice(1);
  if(/^\d{1,4}$/.test(s)) return s; // '52' or '593'
  // normalize names
  s = s.normalize('NFD').replace(/\p{Diacritic}/gu,'');
  return COUNTRY_MAP[s] || null;
}

(async function(){
  const { getDatabase, ref, onValue } =
    await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js");

  function waLink(raw, ccHint){
    if(!raw) return null;
    let s = String(raw).trim();
    // if full URL, keep
    if(/^https?:\/\/wa\.me\//i.test(s) || /^https?:\/\/api\.whatsapp\.com\//i.test(s)) return s;
    s = s.replace(/\s|-/g, '');
    if(s.startsWith('00')) s = '+' + s.slice(2);
    if(!s.startsWith('+')){
      // choose per-player country first
      let cc = normCC(ccHint) || DEFAULT_COUNTRY_CODE;
      if(/^\d{8,12}$/.test(s)) s = '+' + cc + s.replace(/^0+/,'');
      else return null;
    }
    return 'https://wa.me/' + s.replace('+','');
  }

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
      // intenta leer cc de varios campos: countryCode | cc | pais | country
      const cc =
        p.countryCode || p.cc ||
        p.pais || p.country || null;
      rosterByName[name] = {
        name,
        rating: Number(p.eloActual ?? p.elo ?? 1000),
        whatsapp: p.whatsapp || p.telefono || null,
        cc
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
      if(!stats[n]) stats[n] = {name:n, rating:0, whatsapp:null, cc:null, games:0,wins:0,draws:0,losses:0,points:0, roundsReported:0, perfOppSum:0, perfGames:0, perfScoreSum:0};
      return stats[n];
    };
    for(const name of Object.keys(rosterByName)){
      const r = rosterByName[name];
      stats[name] = {
        name,
        rating: r.rating,
        whatsapp: r.whatsapp,
        cc: r.cc || null,
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
        s.perf   = Math.round(Ra + 800*p - 400);
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
      const wa = p.whatsapp ? waLink(p.whatsapp, p.cc) : null;
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
          ${wa ? `<a class="tag whatsapp" target="_blank" rel="noopener" href="${wa}"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:''}
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
      // toma whatsapp directo del pairing si lo hay; si no, del roster (con cc por jugador)
      const wRec = rosterByName[m.white] || {};
      const bRec = rosterByName[m.black] || {};
      const waW = m.whiteWhatsapp ? waLink(m.whiteWhatsapp, wRec.cc) : (wRec.whatsapp ? waLink(wRec.whatsapp, wRec.cc) : null);
      const waB = m.blackWhatsapp ? waLink(m.blackWhatsapp, bRec.cc) : (bRec.whatsapp ? waLink(bRec.whatsapp, bRec.cc) : null);

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
