# Codex Phase 2.6 — verified public roster

Deploy the current `agent/hmena-chess-league-v2` branch to the existing V2 staging service and preview only. Do not merge `main`, do not cut over the public root, and keep WhatsApp live-send disabled.

## Required behavior

1. Pull/fetch the exact remote branch and record its HEAD.
2. From `v2/`, run `npm test` and `npm run check`. Stop on failure.
3. Confirm registration now verifies the submitted account through the platform public API before enrollment:
   - Lichess user lookup for Lichess registrations.
   - Chess.com public profile lookup for Chess.com registrations.
   - a missing username must not create/activate a player.
   - a provider outage must not be treated as a missing account and must not enroll the player.
4. Confirm public endpoints expose only players satisfying both:
   - `players.registration_status='registered'`
   - at least one `player_accounts` row with `account_status='verified'` and non-null `verified_at`.
5. Historical/unconfirmed identities remain preserved in the database but must not appear in public Players, Activity, H2H, XP, Hall of Fame or highlights until re-registration verifies an exact platform username.
6. Exact historical platform username matches may reconnect history. Never fuzzy-merge by name.
7. Deploy only to the existing loopback staging service at `127.0.0.1:3210`; the existing `/preview-v2/` Nginx route may continue proxying it. Do not replace the public `/` route.
8. Keep `WHATSAPP_DRY_RUN=true` and prove no WhatsApp `/send` call is made.

## Safe validation

Before synthetic registration tests, snapshot the staging SQLite database. Restore the snapshot after tests so no test accounts remain.

Validate at minimum:
- `GET /api/health` PASS.
- `GET /api/players` contains no historical-unconfirmed players.
- One known-valid Lichess public test account can pass verification in the temporary test database.
- One known-valid Chess.com public test account can pass verification in the temporary test database.
- A deliberately nonexistent username returns a validation error and creates no public player.
- The registration page says the account is being verified and shows success only after verification.
- Preview text includes the league rules: 3 games per opponent, 3/1/0, flexible opponent order.
- Empty community highlight cards are hidden; no `SIN DATA` cards are visible.
- Mobile Chromium render at 390x844 passes without horizontal overflow.
- Team URL remains `https://lichess.org/team/menakafelate`.
- Chess.com club remains `https://www.chess.com/club/mk-chess-latam`.

## Final report

Report:
- `REMOTE_HEAD=`
- `TESTS=`
- `STAGING_HEALTH=`
- `PREVIEW_URL=https://chess.hmena.com/preview-v2/`
- `PUBLIC_VERIFIED_PLAYERS=`
- `HISTORICAL_HIDDEN=`
- `VALID_LICHESS_TEST=`
- `VALID_CHESSCOM_TEST=`
- `INVALID_USERNAME_TEST=`
- `EMPTY_HIGHLIGHTS_HIDDEN=`
- `MOBILE_RENDER=`
- `WHATSAPP_DRY_RUN=true`
- `PUBLIC_CUTOVER=false`
- rollback/evidence paths.

Finish exactly with:
`PHASE2_6_VERIFIED_ROSTER_READY`
