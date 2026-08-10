# Codex prompt — auditoría integral de ajedrez + WhatsApp en VPS

Actúa como arquitecto de sistemas y auditor forense de este VPS. Necesito entender y recuperar TODO lo relacionado con ajedrez, Lichess, Chess.com, WhatsApp, retos, torneos, recordatorios y un intento anterior de coach privado automático, antes de migrar a HMENA Chess League V2.

## REGLA CRÍTICA DE ESTA EJECUCIÓN

ESTA FASE ES READ-ONLY.

NO borres archivos.
NO detengas ni reinicies servicios.
NO deshabilites timers/cron/systemd/PM2/Docker.
NO modifiques Nginx/DNS/TLS.
NO envíes mensajes de WhatsApp.
NO crees retos en Lichess/Chess.com.
NO modifiques bases de datos.
NO hagas prune.
NO muestres valores de contraseñas, tokens, cookies, sesiones, API keys, claves privadas, OAuth tokens ni secretos de .env.
Puedes indicar que un secreto existe y el NOMBRE de la variable, pero nunca su valor.

Si encuentras una automatización inútil o que actualmente manda mensajes/retos, IDENTIFÍCALA y prepara el comando reversible para desactivarla, pero NO lo ejecutes en esta fase.

## Contexto conocido que debes verificar, no asumir

Rutas históricas:
- /root/menaverse-tms
- /opt/menaverse/chess_automation
- /opt/stockfish-bot
- /opt/cis-whatsapp
- /opt/menaverse/state
- /opt/menaverse/var/ops_runs

Dominio histórico:
- chess.hmena.com

Arquitectura anterior reportada en distintos momentos:
- FastAPI / Node en distintas pruebas
- PostgreSQL
- Redis
- Docker / Docker Compose
- systemd timers/services
- Nginx
- WhatsApp bridge separado
- Lichess API
- posibles integraciones Chess.com
- Firebase histórico con nodos players y/o jugadores

Hay una V2 nueva en GitHub, separada de producción, pero NO debes desplegarla todavía.

## Objetivo 1 — inventario total de procesos y automatizaciones

Inspecciona:
- systemctl list-units --type=service --all
- systemctl list-timers --all
- crontab de root y usuarios relevantes
- /etc/cron.d, /etc/cron.daily, /etc/cron.hourly
- PM2 si existe
- supervisord si existe
- Docker ps / compose projects
- sockets/puertos escuchando
- procesos Node/Python/Chrome/Puppeteer relacionados
- Nginx sites-enabled/sites-available y upstreams

Busca específicamente referencias a:
chess, ajedrez, lichess, chess.com, coach, challenge, desafio, desafío, reto, tournament, torneo, pairing, standings, rating, elo, whatsapp, wa.me, sendMessage, send-group, groupId, cron, schedule, reminder, recordatorio, daily, weekly, monthly, stockfish.

Para CADA automatización encontrada devuelve:
- ID inventado estable AUD-XXX
- nombre
- archivo fuente
- línea/función principal
- proceso que la ejecuta
- service/timer/cron/container que la dispara
- frecuencia exacta
- grupo/chat objetivo
- tipo de mensaje
- fuente de datos
- última ejecución observable
- evidencia/log asociado
- dependencias
- estado: ACTIVA / INACTIVA / FALLANDO / DESCONOCIDA
- recomendación: KEEP_SHARED / KEEP_CHESS / MIGRATE_TO_V2 / DISABLE_AFTER_APPROVAL / DELETE_AFTER_BACKUP / UNKNOWN

Quiero localizar con precisión cuál es la automatización que cada cierto tiempo manda desafíos o invitaciones de ajedrez al grupo y cuál era el intento de coach privado automático.

## Objetivo 2 — arquitectura completa del bot de WhatsApp

Audita /opt/cis-whatsapp y cualquier dependencia real.

Determina:
- tecnología: whatsapp-web.js, Puppeteer, Baileys u otra
- entrypoint(s)
- service/systemd/PM2/container que lo mantiene vivo
- puerto(s)
- endpoints HTTP reales disponibles
- rutas para enviar mensaje individual y mensaje a grupo
- forma de autenticación del bridge (solo nombre de header/variable; nunca valor)
- dónde vive la sesión de WhatsApp
- qué perfil Chromium usa
- colas, Redis, dedupe, cooldowns y retries
- group IDs conocidos
- qué grupos tienen tráfico de ajedrez
- cómo se resuelve nombre -> teléfono -> WhatsApp ID
- logs de mensajes enviados
- qué otros sistemas comparten este bridge

IMPORTANTE: /opt/cis-whatsapp puede ser infraestructura compartida. No propongas borrar la carpeta completa si otros sistemas dependen de ella.

Produce un diagrama Mermaid real de la arquitectura actual:
WhatsApp session -> bridge -> routers/jobs -> chess automation -> DB/APIs -> grupo/DM.

## Objetivo 3 — recuperar TODOS los jugadores y usuarios históricos

Busca jugadores en TODAS las fuentes posibles:
- PostgreSQL
- SQLite
- Redis persistido si hay datos útiles
- JSON/CSV
- código fuente
- backups
- Firebase configs/exportes
- logs históricos
- chats/exportes WhatsApp locales
- configuraciones de torneos
- scripts de Lichess
- menaverse-tms
- chess_automation
- stockfish-bot

Crear `players_recovered.csv` con columnas:
- canonical_candidate_id
- display_name
- phone_raw
- phone_e164
- whatsapp_id
- lichess_username
- chesscom_username
- historical_rating
- rating_platform
- country
- source_system
- source_file_or_table
- last_seen_at
- active_evidence
- confidence HIGH/MEDIUM/LOW
- possible_duplicate_of
- notes

No inventes coincidencias. Si “Jairo” podría ser Jairo Romero pero no hay prueba, déjalo como posible_duplicate_of y confidence LOW/MEDIUM.

Quiero una segunda tabla `accounts_recovered.csv` porque una misma persona puede tener Lichess + Chess.com y cambiar de username.

## Objetivo 4 — recuperar actividad histórica y relaciones entre jugadores

Localiza cualquier dato que permita reconstruir:
- partidas
- game IDs/URLs
- resultados
- rival
- fecha
- plataforma
- torneos
- challenges
- series
- wins/draws/losses
- ratings snapshots
- puntos históricos

Crear, si hay datos:
- games_recovered.csv
- challenges_recovered.csv
- rating_snapshots_recovered.csv
- tournaments_recovered.csv

Necesito poder calcular cosas como:
- Juan vs Pedro: cuántas partidas esta semana/mes/todo el tiempo
- balance H2H: victorias/empates/derrotas
- jugador más activo 7d/30d
- rivales distintos jugados
- racha de días jugando
- mayor subida de rating 7d/30d
- participación en torneos diarios

## Objetivo 5 — auditar el coach privado viejo

Encuentra TODO lo relacionado con el intento de coach privado automático:
- prompts
- bots
- modelos/API
- comandos de WhatsApp
- estados por usuario
- historial de sesiones
- Stockfish/análisis
- schedulers
- mensajes automáticos
- bases/tablas

Explica por qué probablemente no quedó operativo si la evidencia lo permite.

Clasifica cada pieza como:
- REUSABLE_DATA: perfiles, usuarios, historial, preferencias
- REUSABLE_INFRA: routing, queue, dedupe, API helper
- DISCARD_LOGIC: lógica rota o innecesaria
- UNKNOWN

NO lo reactives.

## Objetivo 6 — mapa de mensajes salientes

Quiero saber TODO lo que el VPS puede mandar actualmente al WhatsApp relacionado con ajedrez.

Genera `outbound_message_map.csv`:
- trigger
- schedule
- code_path
- target_type group/DM
- target_id
- sample_message_sanitized
- active
- last_sent
- useful_now YES/NO/MAYBE
- recommended_action

Especialmente identifica:
- retos automáticos aleatorios
- recordatorios antiguos
- coach automático
- rankings
- torneos
- invitaciones
- mensajes de prueba
- mensajes duplicados

## Objetivo 7 — diseñar migración al nuevo sistema

NO implementes producción todavía. Diseña cómo migrar lo útil a HMENA Chess League V2.

Arquitectura objetivo:

1. League Core
- Round robin flexible.
- 3 partidas por rival.
- victoria 3, empate 1, derrota 0.
- tabla oficial separada.

2. Community Activity Layer, SEPARADA de la tabla oficial
Debe poder registrar partidas casuales y actividad de la comunidad.
Proponer tablas/eventos para:
- community_games
- community_points_ledger
- head_to_head_stats
- achievements
- daily_challenges
- tournaments
- rating_snapshots
- activity_streaks

3. Gamificación que quiero
Proponer una fórmula de Community XP con límites anti-farming.
La idea es reconocer:
- partidas verificadas
- jugar con rivales diferentes
- completar reto diario
- participar en torneo
- rachas
- hitos de 10/25/50/100 partidas
- actividad semanal/mensual

NO sumar rating Lichess/Chess.com directamente a los puntos de liga.
NO permitir que dos personas farmeen infinitos puntos jugando 100 veces entre sí. Propón caps diarios/semanales.

Quiero poder publicar automáticamente ejemplos como:
- “🔥 Juan jugó 18 partidas esta semana.”
- “⚔️ Juan vs Pedro: 31–10–9 en 50 partidas este mes.”
- “📈 María subió +126 de rating en Lichess este mes.”
- “🌎 Carlos enfrentó a 8 rivales distintos esta semana.”
- “🏆 Ana ganó el torneo diario.”
- “🔥 Luis lleva 7 días seguidos jugando.”

4. WhatsApp futuro
El WhatsApp NO debe spamear cada evento.
Propón:
- digest diario opcional
- resumen semanal
- alerta de liga solo cuando corresponde
- reto uno-a-uno solo por opt-in / disponibilidad / comando
- mensajes de logros con rate limit
- comandos posibles: !registro, !perfil, !tabla, !reto, !disponible, !rivales, !actividad

5. Web
URL canónica planificada: https://chess.hmena.com/registro
Aun si un jugador estaba en la lista vieja, debe volver a confirmar participación y usuario para 2026.

## Objetivo 8 — plan de limpieza, PERO NO EJECUTARLO

Crear `cleanup_plan.md` con tres grupos:

A. CONSERVAR
Infra compartida, sesiones WhatsApp, datos, usuarios, DBs, código/API helpers útiles.

B. DESACTIVAR DESPUÉS DE APROBACIÓN
Timers/cron/jobs que mandan retos inútiles, coach roto, recordatorios viejos, procesos duplicados.

C. BORRAR SOLO DESPUÉS DE BACKUP + VALIDACIÓN
Código abandonado, builds viejos, páginas duplicadas, logs/caches no necesarios, versiones obsoletas.

Para cada candidato incluir:
- evidencia de que no tiene dependencia
- tamaño
- última modificación
- proceso/timer/import que lo referencia
- backup mínimo necesario
- comando exacto de disable/move/delete
- comando de rollback

NO ejecutar ninguno.

## Objetivo 9 — paquete final que debes entregarme

Crea una carpeta:
`/root/hmena-chess-audit/<UTC_TIMESTAMP>/`

y dentro:
- EXECUTIVE_SUMMARY.md
- CURRENT_ARCHITECTURE.md
- architecture.mmd
- automation_inventory.csv
- outbound_message_map.csv
- players_recovered.csv
- accounts_recovered.csv
- games_recovered.csv (si existe información)
- challenges_recovered.csv
- rating_snapshots_recovered.csv
- tournaments_recovered.csv
- coach_legacy_audit.md
- DATA_AUTHORITY_MAP.md
- MIGRATION_TO_V2.md
- cleanup_plan.md
- env_keys_only.txt
- commands_run.log
- SHA256SUMS

Además crea un `.tar.gz` del paquete.

## Qué debes imprimir al final en terminal

No me vomites miles de líneas.
Muestra un resumen máximo de unas 150 líneas con:
1. arquitectura actual
2. qué proceso manda los desafíos inútiles
3. todos los schedulers de ajedrez activos
4. cantidad de jugadores/handles recuperados por fuente
5. ubicación del bot WhatsApp y cómo se comunica
6. group ID(s) candidatos del grupo de ajedrez y evidencia
7. qué partes del coach viejo existen
8. KEEP / MIGRATE / DISABLE / DELETE-LATER
9. blockers
10. ruta exacta del `.tar.gz`

Y termina exactamente con:
`AUDIT_COMPLETE_NO_CHANGES_MADE`

No ejecutes fase de cleanup hasta que Héctor revise el reporte y dé una segunda instrucción explícita.
