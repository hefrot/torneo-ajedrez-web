# Codex Phase 2.7 — open real registration, freeze-ready roster

Deploy the current `agent/hmena-chess-league-v2` branch to the existing V2 staging service, validate lifecycle/readiness, and then expose only the real registration surface at `https://chess.hmena.com/registro/`. Do not merge `main`, do not replace the public `/` root, and keep WhatsApp live-send disabled.

## Safety

- Keep `WHATSAPP_DRY_RUN=true`.
- Do not start the season yet.
- Do not generate series yet.
- Do not delete historical data.
- Snapshot staging SQLite before synthetic lifecycle tests and restore it afterward.
- Back up the current Nginx vhost before changes; `nginx -t` must pass before reload.
- Roll back immediately on any failed health, registration, public-filter, or Nginx validation.

## 1. Sync and gates

- Fast-forward `agent/hmena-chess-league-v2` to the exact remote HEAD.
- From `v2/`, run `npm test` and `npm run check`; stop on failure.
- Record HEAD and diff since the Phase 2.6 deployment.

## 2. Validate season lifecycle and compatibility

Confirm the new schema creates:
- `season_control`, default registration OPEN / season REGISTRATION.
- `series_platforms`.

Validate in a temporary/snapshotted staging DB:
- registration succeeds only while registration is OPEN.
- closing registration requires at least 2 verified public players.
- closing registration refuses when any player pair has no shared verified platform.
- adding a verified second platform account to the affected player resolves the blocker without creating a duplicate player.
- closing registration then freezes the ready roster.
- reopening registration is permitted only before series exist / season starts.
- `POST /api/admin/season/start` refuses while registration is OPEN.
- after registration is CLOSED and readiness passes, a synthetic start creates exactly N(N-1)/2 series and 3 game slots per series, and writes allowed shared platforms to `series_platforms`.
- restore the database afterward so the real season remains NOT STARTED and registration OPEN.

Do not log or publish the admin key.

## 3. Deploy staging

Update only the existing loopback staging service at `127.0.0.1:3210` to the remote HEAD.
Keep `WHATSAPP_DRY_RUN=true`.
Verify `/api/health`, `/api/config`, public verified-player filtering and registration-provider checks.

## 4. Open the real registration URL only

Keep the existing public `/` root untouched.
Add/reconcile isolated Nginx routes so:
- `https://chess.hmena.com/registro/` serves V2 `registro/`.
- the registration page can reach only the V2 endpoints it needs, at minimum `/api/registration` and `/api/config`, without redirecting unrelated existing `/api/*` traffic.
- preserve `/preview-v2/` for owner preview.
- keep registration `noindex,nofollow` for this launch phase.

Back up Nginx first, run `nginx -t`, reload only if valid, and prove the old `/` response remains unchanged.

## 5. Registration UX

Confirm the real page has no `PREVIEW · NO PRODUCCIÓN` ribbon and shows:
- Mena Kafe Chess League 2026
- 3 partidas por rival
- 3/1/0
- orden flexible
- Nombre
- Lichess o Chess.com
- username
- WhatsApp opcional
- verification-in-progress state
- success only after platform API verification
- closed-registration state when `registrationOpen=false`
- Lichess team URL `https://lichess.org/team/menakafelate`
- Chess.com club URL `https://www.chess.com/club/mk-chess-latam`

At 390x844, require no horizontal overflow.

## 6. Do not announce or start yet

Do not send the WhatsApp invitation in this phase.
Do not call the season-start endpoint in the restored real DB.
Leave:
- registration OPEN
- season status REGISTRATION
- series count 0
- WhatsApp dry-run true

## 7. Evidence / final report

Create `/root/hmena-chess-phase2_7/<UTC_TIMESTAMP>/` with before/after state, Nginx backup/diff, test logs, lifecycle/readiness test evidence, mobile render evidence, SQLite snapshot/restore evidence, rollback instructions, secret scan and SHA256SUMS.

Report:
- `REMOTE_HEAD=`
- `TESTS=`
- `STAGING_HEALTH=`
- `REGISTRATION_URL=https://chess.hmena.com/registro/`
- `REGISTRATION_OPEN=`
- `SEASON_STATUS=`
- `PUBLIC_VERIFIED_PLAYERS=`
- `READINESS_BLOCKED_PAIRS=`
- `SERIES_COUNT=`
- `PUBLIC_ROOT_UNCHANGED=`
- `MOBILE_RENDER=`
- `WHATSAPP_DRY_RUN=true`
- `PUBLIC_SEASON_STARTED=false`
- rollback/evidence paths

Finish exactly with:
`PHASE2_7_REGISTRATION_OPEN_READY`
