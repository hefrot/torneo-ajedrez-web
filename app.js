// app.js — versión completa (portada)
// Requiere que index.html haya inicializado window.firebaseApp con firebase-config.js
// (como ya lo tienes). Este archivo pinta: Clasificación y Pareos de la ronda actual.

(async function () {
  // --- Firebase modular (v9) ---
  const { getDatabase, ref, onValue } =
    await import("https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js");

  // --- Utilidades comunes ---
  const esc = (s) =>
    String(s || "").replace(/[&<>\"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));

  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim();

  const waLink = (raw) => {
    if (!raw) return null;
    let s = String(raw).replace(/\s|-/g, "");
    if (s.startsWith("+")) s = s.slice(1);
    if (!/^\d{6,15}$/.test(s)) return null;
    return `https://wa.me/${s}`;
  };

  const lichessUrl = (handle) => {
    if (!handle) return null;
    let h = String(handle).trim();
    if (h.startsWith("@")) h = h.slice(1);
    if (!h) return null;
    return `https://lichess.org/@/${encodeURIComponent(h)}`;
  };

  // Mapa prefijo telefónico -> bandera (LatAm + algunos comunes)
  const CODE_FLAG = {
    "1": "🇺🇸", "34": "🇪🇸", "44": "🇬🇧", "33": "🇫🇷", "39": "🇮🇹", "49": "🇩🇪",
    "52": "🇲🇽", "54": "🇦🇷", "56": "🇨🇱", "57": "🇨🇴", "58": "🇻🇪", "51": "🇵🇪",
    "55": "🇧🇷", "53": "🇨🇺", "502": "🇬🇹", "503": "🇸🇻", "504": "🇭🇳", "505": "🇳🇮",
    "506": "🇨🇷", "507": "🇵🇦", "509": "🇭🇹", "593": "🇪🇨", "595": "🇵🇾", "598": "🇺🇾",
    "591": "🇧🇴", "592": "🇬🇾", "597": "🇸🇷", "590": "🇬🇵"
  };
  const longestCodeLen = Math.max(...Object.keys(CODE_FLAG).map(c => c.length));
  function guessFlagFromPhone(raw) {
    if (!raw) return "";
    let s = String(raw).replace(/\s|-/g, "");
    if (!s.startsWith("+")) return "";
    s = s.slice(1);
    for (let len = longestCodeLen; len >= 1; len--) {
      const pref = s.slice(0, len);
      if (CODE_FLAG[pref]) return CODE_FLAG[pref];
    }
    return "";
  }

  // --- Puntos & ranking ---
  const pts = (p) => (p.wins || 0) * 3 + (p.draws || 0); // 3/1/0
  function sortPlayers(arr) {
    return arr.slice().sort((a, b) => {
      const pa = pts(a), pb = pts(b);
      if (pb !== pa) return pb - pa;                             // puntos
      if ((b.wins || 0) !== (a.wins || 0)) return (b.wins || 0) - (a.wins || 0); // más victorias
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0); // ELO
      return (a.name || "").localeCompare(b.name || "");
    });
  }

  function mapJugadorToPlayer([id, p]) {
    return {
      id,
      name: p.nombre || p.name || p.nombreCompleto || ("Jugador " + String(id).slice(-4)),
      rating: Number(p.eloActual ?? p.elo ?? 1000),
      whatsapp: p.whatsapp || p.telefono || null,
      lichess: p.lichess || null,
      wins: Number(p.wins ?? 0),
      draws: Number(p.draws ?? 0),
      losses: Number(p.losses ?? 0),
      games: Number(p.games ?? 0),
    };
  }

  // --- Estado global ---
  const app = window.firebaseApp;
  if (!app) {
    console.error("Firebase app no inicializada en index.html");
    return;
  }
  const db = getDatabase(app);

  let currentRound = 1;
  let pairings = {};
  let jugadoresRaw = {};
  let jugadoresByName = new Map(); // nombre normalizado -> {whatsapp, lichess}

  // --- DOM ---
  const gridPlayers = document.getElementById("playersGrid");
  const statPlayers = document.getElementById("statPlayers");
  const statRound = document.getElementById("statRound");
  const statGames = document.getElementById("statGames");
  const roundTitle = document.getElementById("roundTitle");
  const gridPairings = document.getElementById("pairingsGrid");

  // --- Render: Clasificación ---
  function renderPlayers(playersObj) {
    if (!gridPlayers) return;
    gridPlayers.innerHTML = "";
    const list = Object.entries(playersObj || {}).map(mapJugadorToPlayer);
    if (statPlayers) statPlayers.textContent = list.length;
    const sorted = sortPlayers(list);

    sorted.forEach((p, i) => {
      const top = i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
      const card = document.createElement("div");
      card.className = "card fadein";
      card.innerHTML = `
        <div class="card-header">
          <div class="rank ${top}">
            <div class="rank-num">${i + 1}</div>
            <strong>${esc(p.name)}</strong>
          </div>
          <span class="badge">ELO ${p.rating || "-"}</span>
        </div>
        <div class="card-body">
          <div class="kv"><span>Partidas</span><strong>${p.games || 0}</strong></div>
          <div class="kv"><span>Puntos (3/1/0)</span><strong>${pts(p)}</strong></div>
          <div class="kv"><span>G / E / P</span><strong>
            <span class="tag win">${p.wins || 0} G</span>
            <span class="tag draw">${p.draws || 0} E</span>
            <span class="tag loss">${p.losses || 0} P</span>
          </strong></div>
          ${p.lichess ? `<div class="handle"><i class="fa-solid fa-chess-knight"></i> <a target="_blank" rel="noopener" href="${lichessUrl(p.lichess)}">@${String(p.lichess).replace(/^@/, "")}</a></div>` : ""}
          ${p.whatsapp ? `<a class="tag whatsapp" target="_blank" rel="noopener" href="${waLink(p.whatsapp)}"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ""}
        </div>
      `;
      gridPlayers.appendChild(card);
    });
  }

  // --- Render: Pareos (mejorado con bandera + Lichess + WhatsApp por jugador) ---
  function renderPairings(list) {
    if (!gridPairings) return;
    gridPairings.innerHTML = "";

    if (!list || !list.length) {
      const empty = document.createElement("div");
      empty.className = "badge";
      empty.textContent = "Sin pareos publicados para esta ronda";
      gridPairings.appendChild(empty);
      return;
    }

    list.forEach((m) => {
      // El pairing viene con white / black (nombres). Buscamos datos del jugador.
      const P1 = jugadoresByName.get(norm(m.white)) || {};
      const P2 = jugadoresByName.get(norm(m.black)) || {};

      const flag1 = guessFlagFromPhone(P1.whatsapp);
      const flag2 = guessFlagFromPhone(P2.whatsapp);
      const waW = waLink(P1.whatsapp);
      const waB = waLink(P2.whatsapp);
      const liW = lichessUrl(P1.lichess);
      const liB = lichessUrl(P2.lichess);

      const card = document.createElement("div");
      card.className = "card pairing fadein";
      card.innerHTML = `
        <div class="card-header">
          <div><strong>Ronda ${m.round}</strong></div>
          <div class="badge">${m.date || "Fecha por definir"}</div>
        </div>
        <div class="card-body">
          <div class="players-row" style="gap:16px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:18px">${flag1 || ""}</span>
              <div>
                <div>${esc(m.white)}</div>
                ${liW ? `<div class="handle"><i class="fa-solid fa-chess-knight"></i> <a target="_blank" rel="noopener" href="${liW}">@${String(P1.lichess || "").replace(/^@/, "")}</a></div>` : ""}
              </div>
            </div>
            <div class="vs">VS</div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:18px">${flag2 || ""}</span>
              <div>
                <div>${esc(m.black)}</div>
                ${liB ? `<div class="handle"><i class="fa-solid fa-chess-knight"></i> <a target="_blank" rel="noopener" href="${liB}">@${String(P2.lichess || "").replace(/^@/, "")}</a></div>` : ""}
              </div>
            </div>
          </div>

          <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            ${waW ? `<a class="btn" style="padding:8px 10px;font-size:12px" target="_blank" rel="noopener" href="${waW}"><i class="fa-brands fa-whatsapp"></i> ${esc(m.white.split(" ")[0])}</a>` : ""}
            ${waB ? `<a class="btn" style="padding:8px 10px;font-size:12px" target="_blank" rel="noopener" href="${waB}"><i class="fa-brands fa-whatsapp"></i> ${esc(m.black.split(" ")[0])}</a>` : ""}
            ${liW ? `<a class="btn ghost" style="padding:8px 10px;font-size:12px" target="_blank" rel="noopener" href="${liW}"><i class="fa-solid fa-chess-knight"></i> Lichess</a>` : ""}
            ${liB ? `<a class="btn ghost" style="padding:8px 10px;font-size:12px" target="_blank" rel="noopener" href="${liB}"><i class="fa-solid fa-chess-knight"></i> Lichess</a>` : ""}
          </div>

          <div class="badge">J1: — • J2: — • J3: —</div>
        </div>
      `;
      gridPairings.appendChild(card);
    });
  }

  // --- Suscripciones Firebase ---
  onValue(ref(db, "tournament"), (snap) => {
    const t = snap.val() || {};
    currentRound = Number(t.currentRound || 1);
    if (statRound) statRound.textContent = currentRound;
    if (roundTitle) roundTitle.textContent = currentRound;
    // re-filtrar pareos
    if (pairings && gridPairings) {
      const list = Object.values(pairings || {}).filter((p) => p.round === currentRound);
      renderPairings(list);
    }
  });

  onValue(ref(db, "jugadores"), (snap) => {
    jugadoresRaw = snap.val() || {};
    // para ranking
    renderPlayers(jugadoresRaw);
    // para enriquecer pareos
    jugadoresByName = new Map();
    for (const [id, p] of Object.entries(jugadoresRaw)) {
      const name = p.nombre || p.name || p.nombreCompleto || "";
      if (!name) continue;
      jugadoresByName.set(norm(name), {
        whatsapp: p.whatsapp || p.telefono || null,
        lichess: p.lichess || null,
      });
    }
    // repinta pareos si ya hay lista
    if (pairings && gridPairings) {
      const list = Object.values(pairings || {}).filter((p) => p.round === currentRound);
      renderPairings(list);
    }
  });

  onValue(ref(db, "pairings"), (snap) => {
    pairings = snap.val() || {};
    const all = Object.values(pairings || {});
    if (statGames) statGames.textContent = all.length;
    const list = all.filter((p) => p.round === currentRound);
    renderPairings(list);
  });
})();
