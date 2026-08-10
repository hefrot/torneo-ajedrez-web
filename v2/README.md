# HMENA Chess League V2

V2 reconstruye la liga histórica sin modificar la web anterior. El objetivo es una operación casi totalmente automática con una arquitectura pequeña: GitHub conserva código, Google Drive/Sheets conserva el control maestro e histórico, y el VPS solo ejecuta API, base transaccional, workers y el puente de WhatsApp.

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

## Arquitectura

```text
GitHub Pages / chess.hmena.com
          |
          v
   Node API en VPS ------ SQLite (operación en vivo)
      |      |  \
      |      |   +------ Worker programado
      |      |              |-- ratings / juegos
      |      |              |-- alertas 18h / 23h / 24h
      |      |              |-- resúmenes de actividad
      |      |
      |      +-----------> WhatsApp bridge existente
      |
      +------------------> Google Sheets master / Drive
      |
      +------------------> Lichess API / Chess.com PubAPI
```

### Qué vive dónde

- **GitHub:** código, pruebas y despliegue.
- **Google Drive / Sheets:** roster maestro, histórico, reportes, ratings, notificaciones y backups legibles.
- **VPS:** SQLite/PostgreSQL operativo, API y worker. No es la única copia de información importante.
- **WhatsApp:** se reutiliza mediante un adapter HTTP; no se mezclan sesiones de WhatsApp con el motor de torneo.

## Estado de esta primera entrega

Implementado en este scaffold:

1. Motor round robin flexible y pruebas.
2. Generación de todas las series y 3 slots por pareja.
3. Clasificación 3/1/0 con desempates iniciales: puntos, head-to-head, victorias y Sonneborn-Berger.
4. Cálculo de actividad y ritmo diario.
5. Seed de playoffs principal y Challenger.
6. API de registro, jugadores, inicio de temporada, tabla, disponibilidad, rivales elegibles y reporte de partida.
7. Adapter Lichess para perfiles, export de partidas y creación de desafío con OAuth token.
8. Adapter Chess.com para stats y archivos públicos.
9. Worker de ratings + recordatorios + sincronización opcional a Google Sheets + resumen de WhatsApp.
10. Web móvil inicial para inscripción y clasificación.

Pendiente antes de producción:

- OAuth completo de Lichess por jugador y almacenamiento cifrado/separado de tokens.
- Validación automática de un `gameId` reportado contra API antes de marcar `VALIDATED`.
- Asociación desafío -> gameId para que una partida casual entre dos miembros no cuente accidentalmente en la liga.
- Sincronización bidireccional completa con las pestañas exactas del Control Maestro.
- Identificar el `groupId` exacto del grupo de ajedrez; no se debe asumir que cualquier grupo configurado en el VPS es el correcto.
- Pruebas de integración en staging y revisión de DNS de `chess.hmena.com`.

## Desarrollo

```bash
cp .env.example .env
npm install
npm test
npm start
```

El motor puro (`src/league-engine.js`) no necesita dependencias externas y puede probarse con `node --test`.

## Flujo de temporada

1. Se abre registro.
2. El usuario entrega nombre + Lichess o Chess.com + usuario de plataforma.
3. Se valida que la cuenta exista.
4. Al cerrar registro se marcan participantes como `registered`.
5. `POST /api/admin/season/start` crea `n(n-1)/2` series y 3 slots por serie.
6. El jugador abre su panel y ve todos sus rivales pendientes; no espera una ronda específica.
7. Cuando se crea un reto, el backend debe guardar la relación serie/slot/challengeId.
8. El worker consulta APIs y solo valida la partida ligada al slot esperado (o una partida reportada y verificada).
9. Se actualiza clasificación, actividad, Sheets y WhatsApp.
10. Al acabar todas las series se generan playoffs.

## Seguridad

- No guardar secretos, tokens OAuth, sesiones de WhatsApp o credenciales de Google en GitHub.
- El `.env` vive solo en el VPS.
- El panel administrativo requiere `X-Admin-Key` en este scaffold; antes de producción conviene reemplazarlo por autenticación de administrador más fuerte.
- Los teléfonos no se exponen en endpoints públicos.
