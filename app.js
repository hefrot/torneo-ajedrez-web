// app.js — Ranking + Pareos (BO3), % rendimiento, ELO Perf, WhatsApp multi-país y Lichess clicable

// Country helpers
const COUNTRY_TO_DIAL = {
  MX:'52', AR:'54', CL:'56', CO:'57', PE:'51', EC:'593', UY:'598', PY:'595', BO:'591', VE:'58',
  CR:'506', PA:'507', GT:'502', SV:'503', HN:'504', NI:'505', BR:'55', DO:'1', RD:'1', PR:'1',
  US:'1', USA:'1', ES:'34', CU:'53'
};
const NAME_TO_ISO = {
  'MEXICO':'MX','MÉXICO':'MX','ARGENTINA':'AR','CHILE':'CL','COLOMBIA':'CO','PERU':'PE','PERÚ':'PE','ECUADOR':'EC',
  'URUGUAY':'UY','PARAGUAY':'PY','BOLIVIA':'BO','VENEZUELA':'VE','COSTA RICA':'CR','PANAMA':'PA','PANAMÁ':'PA',
  'GUATEMALA':'GT','EL SALVADOR':'SV','HONDURAS':'HN','NICARAGUA':'NI','BRASIL':'BR','BRAZIL':'BR',
  'REPUBLICA DOMINICANA':'DO','REPÚBLICA DOMINICANA':'DO','PUERTO RICO':'PR','ESTADOS UNIDOS':'US','ESPAÑA':'ES','CUBA':'CU'
};
const DIAL_TO_ISO = Object.fromEntries(Object.entries(COUNTRY_TO_DIAL).map(([iso,dial])=>[dial,iso]));
const DEFAULT_DIAL = '52'; // fallback if player has no country
const A_FLAG = 0x1F1E6;

const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');

function resolveISO(raw){
  if(!raw) return null;
  let s = String(raw).trim().toUpperCase();
  if (s.startsWith('+')) s = s.slice(1);
  if (/^[A-Z]{2}$/.test(s)) return s; // ISO2 direct
  const s2 = s.normalize('NFD').replace(/\p{Diacritic}/gu,'');
  if (NAME_TO_ISO[s2]) return NAME_TO_ISO[s2];
  if (/^\d{1,4}$/.test(s)) return DIAL_TO_ISO[s] || null; // dial to ISO
  return null;
}

function isoToFlag(iso){
  if(!iso || iso.length!==2) return '🏳️';
  const a = iso.charCodeAt(0)-65, b = iso.charCodeAt(1)-65;
  return String.fromCodePoint(A_FLAG+a) + String.fromCodePoint(A_FLAG+b);
}

function lichessLink(user){
  if(!user) return null;
  const u = String(user).replace(/^@/,'').trim();
  if(!u) return null;
  return `https://lichess.org/@/${u}`;
}

function waLink(raw, isoHint){
  if(!raw) return null;
  let s = String(raw).trim();
  if(/^https?:\/\/(wa\.me|api\.whatsapp\.com)\//i.test(s)) return s;
  s = s.replace(/\s|-/g,'');
  if (s.startsWith('00')) s = '+'+s.slice(2);
  if (!s.startsWith('+')){
    const iso = resolveISO(isoHint);
    const dial = iso ? COUNTRY_TO_DIAL[iso] : DEFAULT_DIAL;
    if (/^\d{8,12}$/.test(s)) s = '+' + (dial||DEFAULT_DIAL) + s.replace(/^0+/,''); else return null;
  }
  return 'https://wa.me/' + s.replace('+','');
}

function esc(s){
  return String(s||'').replace(/[&<>\"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

(async function(){
  const { getDatabase, ref, onValue } =
    await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js");

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
      const iso = resolveISO(p.countryISO || p.pais || p.country || p.countryCode || p.cc);
      rosterByName[name] = {
        name,
        rating: Number(p.eloActual ?? p.elo ?? 1000),
        whatsapp: p.whatsapp || p.telefono || null,
        iso: iso || null,
        lichess: p.lichess || p.lichessUser || p.lichess_username || null
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
      if(!stats[n]) stats[n] = {name:n, rating:0, whatsapp:null, iso:null, lichess:null, games:0,wins:0,draws:0,losses:0,points:0, roundsReported:0, perfOppSum:0, perfGames:0, perfScoreSum:0};
      return stats[n];
    };
    for(const name of Object.keys(rosterByName)){
      const r = rosterByName[name];
      stats[name] = {
        name,
        rating: r.rating,
        whatsapp: r.whatsapp,
        iso: r.iso,
        lichess: r.lichess,
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
      const wa = p.whatsapp ? waLink(p.whatsapp, p.iso) : null;
      const lich = p.lichess ? lichessLink(p.lichess) : null;
      const flag = isoToFlag(p.iso||'');
      const card = document.createElement('div');
      card.className = 'card fadein';
      card.innerHTML = `
        <div class="card-header">
          <div class="rank ${podium}">
            <div class="rank-num">${i+1}</div>
            <strong>${esc(p.name)}</strong>
            <span title="País" style="margin-left:6px">${flag}</span>
            ${lich ? `<a class="user-pill" target="_blank" href="${lich}"><i class="fa-brands fa-lichess"></i>@${esc(String(p.lichess).replace(/^@/,''))}</a>`:''}
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
      const wRec = rosterByName[m.white] || {};
      const bRec = rosterByName[m.black] || {};
      const waW = m.whiteWhatsapp ? waLink(m.whiteWhatsapp, wRec.iso) : (wRec.whatsapp ? waLink(wRec.whatsapp, wRec.iso) : null);
      const waB = m.blackWhatsapp ? waLink(m.blackWhatsapp, bRec.iso) : (bRec.whatsapp ? waLink(bRec.whatsapp, bRec.iso) : null);
      const lichW = wRec.lichess ? lichessLink(wRec.lichess) : null;
      const lichB = bRec.lichess ? lichessLink(bRec.lichess) : null;
      const flagW = isoToFlag(wRec.iso||''); const flagB = isoToFlag(bRec.iso||'');

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
            <div>${flagW} ${esc(m.white)} ${lichW? `<a class="user-pill" target="_blank" href="${lichW}"><i class="fa-brands fa-lichess"></i>@${esc(String(wRec.lichess).replace(/^@/,''))}</a>`:''}</div>
            <div class="vs">VS</div>
            <div>${lichB? `<a class="user-pill" target="_blank" href="${lichB}"><i class="fa-brands fa-lichess"></i>@${esc(String(bRec.lichess).replace(/^@/,''))}</a>`:''} ${esc(m.black)} ${flagB}</div>
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
