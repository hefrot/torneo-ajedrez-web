# HMENA / Mena Kafe Chess League V2

V2 reconstruye la liga histórica sin modificar la web pública anterior. GitHub conserva código, Google Drive/Sheets conserva control e histórico legible y el VPS ejecuta API, base operacional, workers y el bridge compartido de WhatsApp.

## Estado actual — Phase 2.5

- Branch: `agent/hmena-chess-league-v2`.
- Preview para owner: `https://chess.hmena.com/preview-v2/`.
- Preview marcada `NO PRODUCCIÓN`, con `noindex,nofollow`.
- Staging escucha en `127.0.0.1:3210`.
- WhatsApp permanece en `WHATSAPP_DRY_RUN=true`.
- La web pública principal todavía no fue sustituida.
- Team Lichess: `https://lichess.org/team/menakafelate`.
- Club Chess.com: `https://www.chess.com/club/mk-chess-latam`.

## Reglas de liga

- Round robin flexible: todos contra todos, sin rondas bloqueadas.
- Cada pareja disputa una serie de 3 partidas.
- Cada partida: victoria 3, empate 1, derrota 0.
- Máximo por serie: 9 puntos por jugador.
- Los jugadores pueden adelantar cualquier serie pendiente si ambos están disponibles.
- Regla de actividad: al menos una partida validada cada 24 horas mientras queden partidas pendientes.
- La regla de 24 horas genera avisos, no derrota automática. Un forfeit automático solo debe existir cuando haya una partida/desafío específicamente aceptado con límite verificable o al cierre del torneo según política publicada.
- El panel calcula además el ritmo necesario: `ceil(partidas pendientes / días restantes)`.
- Al terminar la liga: playoff principal adaptativo; con suficiente participación puede existir bracket Challenger.

## League Points vs Community XP

### League Points

Solo cuentan partidas explícitamente enlazadas a slots de la liga oficial.

- Victoria = 3
- Tablas = 1
- Derrota = 0

### Community XP

Es una capa separada para actividad y motivación: partidas casuales verificadas, H2H, rivales distintos, rachas, torneos, logros y progreso de rating. No modifica la clasificación oficial de la liga.

La configuración de XP vive en tabla/configuración editable e incluye caps y rendimiento decreciente para evitar farming entre los mismos jugadores.

## Histórico recuperado

Phase 2 preservó/importó en staging, con provenance y hashes:

- 62 jugadores canónicos derivados de 58 candidatos legacy + 5 miembros MK, con un enlace exacto entre fuentes.
- 65 cuentas de plataforma.
- 191 partidas.
- 120 matchups.
- 107 análisis Stockfish.
- 16 registros Hall of Fame.
- 15 snapshots de rating.
- 120 registros históricos de challenge/matchup.
- 2 torneos.

No hubo fuzzy auto-merge por nombre. Los casos de nombre parecido quedan en REVIEW.

## Identidades pendientes

- 17 casos REVIEW.
- 57 jugadores legacy sin cross-match exacto externo.
- 2 partidas con participantes ambiguos.

El registro 2026 no activa automáticamente a históricos. El jugador debe reconfirmar `nombre + plataforma + username`; un vínculo histórico solo se prepara si plataforma + username coinciden exactamente.

## WhatsApp

El bridge compartido `/opt/cis-whatsapp` se conserva. La V2 usa el contrato auditado:

```text
POST http://127.0.0.1:3010/send
Content-Type: application/json

{
  "chat_id": "<private group JID>",
  "message": "..."
}
```

El JID real y la API key permanecen exclusivamente en entorno privado del VPS y no se almacenan en GitHub.

Phase 2 desactivó de forma reversible los tres timers Future Champions responsables de avisos recurrentes no deseados. El scheduler MK útil permanece activo.

Las tareas legacy de torneo `check_deadlines`, `auto_advance_round`, `assign_deadlines` y `auto_forfeit_expired` quedaron gateadas reversiblemente para no tocar DB/WhatsApp de la competición retirada. Workloads no relacionados siguen operativos.

## Coach V2

No se revive el pipeline privado antiguo cuyo downstream/publisher fue retirado. Se reutilizan datos e infraestructura útiles: identidades, partidas, Stockfish, análisis y bridge WhatsApp.

Interfaz objetivo:

`WhatsApp/Web event -> V2 identity -> verified game -> analysis queue -> Stockfish -> structured insight -> rate-limited opt-in response`

## Arquitectura

```text
chess.hmena.com/preview-v2/ (owner preview)
              |
              v
       Nginx isolated path
              |
              v
       127.0.0.1:3210
        HMENA Chess V2
        |      |      \
        |      |       +-- Worker / metrics
        |      |
        |      +---------- WhatsApp bridge :3010 (dry-run in staging)
        |
        +----------------- SQLite staging / production DB plan
        |
        +----------------- Google Sheets master / Drive
        |
        +----------------- Lichess API / Chess.com PubAPI
```

## Validación actual

Phase 2.5:

- 6/6 suites pasan.
- `npm run check` pasa.
- Registro preview: PASS.
- Tabla/players/activity APIs: PASS.
- Histórico/import: PASS.
- Community XP / H2H: PASS.
- Hall of Fame: PASS.
- WhatsApp: dry-run; no envío real.
- Preview móvil validada con Chromium 390x844.
- `noindex,nofollow`: PASS.
- Nginx: configuración válida y servicio activo.
- Web pública principal: separada, sin cutover V2.

## Antes del cutover público

- Revisión visual del owner sobre `https://chess.hmena.com/preview-v2/`.
- Ajustar UX/copy según esa revisión.
- Decidir qué estadísticas sin data ocultar hasta tener actividad 2026.
- Recibir reconfirmaciones de jugadores históricos y resolver matches exactos.
- Resolver o excluir de métricas oficiales los casos ambiguos restantes.
- Aprobar política de mensajes y habilitar live-send solamente después de pruebas controladas.
- Definir y probar rollback final del cutover.

## Seguridad

- No guardar secretos, tokens OAuth, sesiones WhatsApp, JIDs privados o credenciales Google en GitHub.
- El `.env` vive solo en VPS.
- Los teléfonos/JIDs nunca se exponen en endpoints públicos.
- Los históricos ambiguos no se enlazan por similitud de nombre.
