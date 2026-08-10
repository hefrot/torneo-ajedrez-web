# HMENA / Mena Kafe Chess League V2

V2 reconstruye la liga histórica sin reemplazar a ciegas la infraestructura existente. GitHub conserva código; Google Drive/Sheets conserva control, histórico legible y reportes; el VPS ejecuta API/workers y reutiliza el bridge compartido de WhatsApp.

## Reglas de liga

- Round robin flexible: todos contra todos, sin rondas bloqueadas.
- Cada pareja disputa una serie de 3 partidas.
- Cada partida: victoria 3, empate 1, derrota 0.
- Máximo por serie: 9 puntos por jugador.
- Los jugadores pueden adelantar cualquier serie pendiente si ambos están disponibles.
- Regla de actividad: al menos una partida validada cada 24 horas mientras queden partidas pendientes.
- La regla de 24 horas genera avisos, no derrota automática. Un forfeit automático solo debe existir cuando haya una partida/desafío específicamente aceptado con límite verificable o al cierre del torneo según política publicada.
- El panel también calcula el ritmo necesario: `ceil(partidas pendientes / días restantes)`.
- Al terminar la liga: top 8 al playoff principal cuando haya al menos 8; con 12+ jugadores se puede abrir Challenger con puestos 9–16. Con cantidades intermedias se usan byes.

## Liga oficial vs comunidad

**League Points** decide la liga y solo cuenta partidas ligadas a slots oficiales: 3/1/0.

**Community XP** será un ledger separado para motivación: actividad, H2H, rivales distintos, rachas, torneos y logros. Debe tener caps y reglas anti-farming. El rating de Lichess/Chess.com nunca se convierte directamente en puntos oficiales de liga.

## Arquitectura después de la auditoría del VPS

```text
chess.hmena.com
      |
      v
 V2 API / web en VPS
      |
      +---- V2 staging DB
      |       |
      |       +---- import/reconciliación desde PostgreSQL legado
      |
      +---- Worker: juegos / ratings / actividad / digests
      |
      +---- Bridge WhatsApp compartido (127.0.0.1:3010)
      |        POST /send { chat_id, message }
      |
      +---- Lichess API / Chess.com PubAPI
      |
      +---- Google Sheets master / Drive
```

### Hallazgos confirmados 2026-08-10

La auditoría read-only encontró:

- 58 candidatos de jugador en el TMS legado.
- 191 partidas históricas.
- 120 matchups legado.
- 107 análisis Stockfish.
- 8 registros Hall of Fame.
- El módulo MK más nuevo solo tiene 5 miembros/identidades y 6 posts programados; aún no tiene partidas, retos o torneos propios persistidos.
- El bridge de WhatsApp está vivo y es infraestructura compartida; no debe reemplazarse ni borrarse.
- El contrato real de texto del bridge es `/send` con `chat_id` + `message`.
- Tres recordatorios Future Champions son la fuente comprobada de avisos recurrentes no deseados y son candidatos a desactivación reversible.
- El viejo coach privado se rompió después de la ingestión de WhatsApp porque su publisher/consumer downstream dejó de existir/estar activo; el bridge no es el origen del fallo.
- Celery Beat conserva automatizaciones de rondas/deadlines del torneo legado que deben quedar gated para que una competencia retirada no vuelva a emitir acciones por accidente.

Véase `AUDIT_FINDINGS_2026-08-10.md` y `deploy/CODEX_PHASE2_MIGRATE_AND_DECOMMISSION.md`.

## Fuentes de datos y autoridad

- **PostgreSQL legado:** fuente histórica que debe reconciliarse antes de borrar o abandonar nada.
- **V2 SQLite actual:** scaffold de staging/desarrollo, no declarado aún como fuente definitiva de producción.
- **Google Drive/Sheets:** control maestro, histórico legible, reportes y backups; no sustituye locks/colas/estado transaccional.
- **WhatsApp:** sesión/bridge compartido; el JID real del grupo de ajedrez vive solo en el VPS/env, no en GitHub.

## Comunidades oficiales

- Lichess: `https://lichess.org/team/menakafelate`
- Chess.com: `https://www.chess.com/club/mk-chess-latam`

## Estado de la V2

Implementado en la rama de trabajo:

1. Motor round robin flexible.
2. Tres slots por pareja.
3. Clasificación 3/1/0 con head-to-head, victorias y Sonneborn-Berger.
4. Cálculo de actividad y ritmo diario.
5. Seed de playoffs principal y Challenger.
6. API inicial de registro, jugadores, temporada, tabla, disponibilidad, rivales y reportes.
7. Adapter Lichess.
8. Adapter Chess.com.
9. Worker inicial de ratings/recordatorios/Sheets/WhatsApp.
10. Web mobile-first con `/registro/`, tabla, jugadores y actividad.
11. Adapter WhatsApp corregido al contrato real auditado `/send`.
12. Auditoría VPS read-only y prompt de Fase 2 controlada.

## Antes de producción

- Reconciliar identidades de los 58 candidatos legado con MK/Lichess/Chess.com/WhatsApp sin fuzzy auto-merge.
- Importar y verificar el histórico antes de elegir la fuente transaccional definitiva de V2.
- Completar soporte real multi-plataforma por jugador.
- Completar OAuth de Lichess y almacenamiento seguro de tokens.
- Asociar challengeId/gameId a cada slot.
- Validar automáticamente partidas reportadas antes de puntuar.
- Completar sincronización con el Control Maestro.
- Desactivar de forma reversible los recordatorios Future Champions obsoletos.
- Gatear las tareas legado de round/deadline sin afectar otros workloads TMS.
- Probar staging y rollback antes del cutover público de `chess.hmena.com`.

## Desarrollo

```bash
cp .env.example .env
npm install
npm test
npm start
```

El motor puro (`src/league-engine.js`) no necesita dependencias externas y puede probarse con `node --test`.

## Seguridad

- Nunca guardar tokens OAuth, sesiones WhatsApp, JIDs privados, teléfonos o credenciales de Google en GitHub.
- El `.env` vive solo en el VPS.
- Los teléfonos no se exponen en endpoints públicos.
- No borrar fuentes legado hasta tener backup reproducible, import reconciliado, hashes/conteos, staging funcional y rollback probado.
