// app_patch_pairings.js — pega este bloque en tu app.js
// Helpers y renderPairings mejorado para la portada (banderas + Lichess + WhatsApp)

const norm = s => String(s||'').toLowerCase()
  .normalize('NFD').replace(/\p{Diacritic}/gu,'').trim();
const CODE_FLAG = {
  "1":"🇺🇸","34":"🇪🇸","44":"🇬🇧","33":"🇫🇷","39":"🇮🇹","49":"🇩🇪",
  "52":"🇲🇽","54":"🇦🇷","56":"🇨🇱","57":"🇨🇴","58":"🇻🇪","51":"🇵🇪",
  "55":"🇧🇷","53":"🇨🇺","502":"🇬🇹","503":"🇸🇻","504":"🇭🇳","505":"🇳🇮",
  "506":"🇨🇷","507":"🇵🇦","509":"🇭🇹","593":"🇪🇨","595":"🇵🇾","598":"🇺🇾",
  "591":"🇧🇴","592":"🇬🇾","597":"🇸🇷","590":"🇬🇵"
};
const longestCodeLen = Math.max(...Object.keys(CODE_FLAG).map(c=>c.length));
function guessFlagFromPhone(raw){
  if(!raw) return "";
  let s = String(raw).replace(/\s|-/g,'');
  if(!s.startsWith('+')) return "";
  s = s.slice(1);
  for(let len=longestCodeLen; len>=1; len--){
    const pref = s.slice(0,len);
    if(CODE_FLAG[pref]) return CODE_FLAG[pref];
  }
  return "";
}
function waLink(raw){
  if(!raw) return null;
  let s = String(raw).replace(/\s|-/g,'');
  if(s.startsWith('+')) s = s.replace('+','');
  if(!/^\d{6,15}$/.test(s)) return null;
  return `https://wa.me/${s}`;
}
function lichessUrl(handle){
  if(!handle) return null;
  let h = String(handle).trim();
  if(h.startsWith('@')) h = h.slice(1);
  if(!h) return null;
  return `https://lichess.org/@/${encodeURIComponent(h)}`;
}

// cache jugadores por nombre
let _jugadoresByName = new Map();
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
const _db = getDatabase(window.firebaseApp);
onValue(ref(_db,'jugadores'), s=>{
  const raw = s.val()||{};
  _jugadoresByName = new Map();
  for(const [id,p] of Object.entries(raw)){
    const name = p.nombre || p.name || p.nombreCompleto || '';
    if(!name) continue;
    _jugadoresByName.set(norm(name), {
      whatsapp: p.whatsapp || p.telefono || null,
      lichess : p.lichess || null
    });
  }
});

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
    const P1 = _jugadoresByName.get(norm(m.white)) || {};
    const P2 = _jugadoresByName.get(norm(m.black)) || {};
    const flag1 = guessFlagFromPhone(P1.whatsapp);
    const flag2 = guessFlagFromPhone(P2.whatsapp);
    const waW   = waLink(P1.whatsapp);
    const waB   = waLink(P2.whatsapp);
    const liW   = lichessUrl(P1.lichess);
    const liB   = lichessUrl(P2.lichess);

    const card = document.createElement('div');
    card.className = 'card pairing fadein';
    card.innerHTML = \`
      <div class="card-header">
        <div><strong>Ronda \${m.round}</strong></div>
        <div class="badge">\${m.date || 'Fecha por definir'}</div>
      </div>
      <div class="card-body">
        <div class="players-row" style="gap:16px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:18px">\${flag1||''}</span>
            <div>
              <div>\${m.white}</div>
              \${liW ? \`<div class="handle"><i class="fa-solid fa-chess-knight"></i> <a target="_blank" rel="noopener" href="\${liW}">@\${String(P1.lichess||'').replace(/^@/,'')}</a></div>\`:''}
            </div>
          </div>
          <div class="vs">VS</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:18px">\${flag2||''}</span>
            <div>
              <div>\${m.black}</div>
              \${liB ? \`<div class="handle"><i class="fa-solid fa-chess-knight"></i> <a target="_blank" rel="noopener" href="\${liB}">@\${String(P2.lichess||'').replace(/^@/,'')}</a></div>\`:''}
            </div>
          </div>
        </div>
        <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          \${waW? \`<a class="btn" style="padding:8px 10px;font-size:12px" target="_blank" rel="noopener" href="\${waW}"><i class="fa-brands fa-whatsapp"></i> \${m.white.split(' ')[0]}</a>\`:''}
          \${waB? \`<a class="btn" style="padding:8px 10px;font-size:12px" target="_blank" rel="noopener" href="\${waB}"><i class="fa-brands fa-whatsapp"></i> \${m.black.split(' ')[0]}</a>\`:''}
          \${liW? \`<a class="btn ghost" style="padding:8px 10px;font-size:12px" target="_blank" rel="noopener" href="\${liW}"><i class="fa-solid fa-chess-knight"></i> Lichess</a>\`:''}
          \${liB? \`<a class="btn ghost" style="padding:8px 10px;font-size:12px" target="_blank" rel="noopener" href="\${liB}"><i class="fa-solid fa-chess-knight"></i> Lichess</a>\`:''}
        </div>
        <div class="badge">J1: — • J2: — • J3: —</div>
      </div>
    \`;
    grid.appendChild(card);
  });
}
