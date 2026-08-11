# Codex Phase 2.8 — automatic game validation and private player access

Use branch `agent/hmena-chess-league-v2`.

Phase 2.7 left real registration OPEN at `https://chess.hmena.com/registro/`, the season in REGISTRATION state, zero real series generated, the current public root unchanged, and WhatsApp in dry-run.

## Hard safety rules

- Do not merge `main`.
- Do not start the real season.
- Do not close registration.
- Do not generate real series.
- Do not send real WhatsApp messages.
- Keep `WHATSAPP_DRY_RUN=true`.
- Do not delete or rewrite historical source data.
- Do not expose phones, WhatsApp JIDs, admin keys, API keys, OAuth tokens, player access tokens or private identity-review data.
- Work only on the V2 branch and existing loopback staging service.
- Before synthetic tests, snapshot staging SQLite and restore it afterward.

## Goal

While players register, complete the last critical league machinery:

1. private player access,
2. league readiness dashboard,
3. challenge/report-to-slot association,
4. automatic provider validation,
5. atomic scoring and series completion,
6. audit/dispute handling.

## 1. Distinguish account existence from account ownership

The current public API lookup proves that a Lichess/Chess.com profile exists. It does not necessarily prove that the person submitting the form owns that account.

Add an explicit verification model, without breaking current registrations:

- `profile_verified`: public profile exists and canonical username was returned by provider API.
- `ownership_verification`: `not_required`, `pending`, `oauth`, `manual`, or another documented method.
- Never represent public-profile existence as OAuth ownership.
- Public roster may continue requiring `profile_verified`, matching the organizer's current policy.
- League readiness must clearly report how many players are profile-verified vs ownership-verified.
- Do not invent a Chess.com OAuth flow. If provider-supported ownership auth is unavailable, keep a manual/one-time-proof path as a configurable future requirement.

## 2. Private player access

Create a private player session/receipt system so a participant cannot edit another player's availability or report games merely by knowing a public player ID.

Requirements:

- On successful verified registration, create a high-entropy one-time player access token.
- Store only a cryptographic hash in the database.
- Return the plaintext token only once to the registering browser.
- Store it client-side with a clear warning/recovery path; never include it in public URLs, logs, Sheets or WhatsApp group posts.
- Add revocation and regeneration by an authenticated administrator.
- Player-scoped endpoints require `Authorization: Bearer <player-token>` or an equivalent secure header.
- The token must authorize only the matching player.
- Rate-limit sensitive endpoints.
- Do not expose the token in error responses.

Add a mobile-first private route such as `/jugador/` that shows:

- confirmed name and verified platform accounts,
- registration/season state,
- pending opponents,
- shared platform(s) for each opponent,
- remaining games in each three-game series,
- challenge/report actions,
- validation status,
- daily pace,
- availability.

Do not expose WhatsApp phone/JID.

## 3. Configurable official league rules

Create a configuration table/API rather than hardcoding launch choices.

Include at least:

- games per opponent = 3,
- win/draw/loss = 3/1/0,
- allowed platform(s),
- time control,
- rated/unrated requirement,
- standard variant requirement,
- color policy,
- registration deadline,
- season maximum days,
- reminder thresholds,
- accepted-challenge deadline policy,
- forfeit policy,
- tiebreak order,
- playoff policy.

Use safe defaults for staging, but mark organizer decisions that still require approval. Do not close registration based on an unapproved date.

Recommended scheduling model for organizer review:

- one three-game series per player per calendar day on average,
- players may play ahead,
- target duration approximately `N-1` days plus one grace day for `N` players,
- 24 hours is an activity alert, not an automatic loss.

## 4. Challenge and game-slot state model

Use explicit states and idempotent transitions:

- game slot: `PENDING -> CHALLENGED -> REPORTED -> VALIDATING -> VALIDATED`
- alternate terminal/intervention states: `REJECTED`, `DISPUTED`, `VOID`
- challenge: `CREATED`, `ACCEPTED`, `EXPIRED`, `CANCELLED`, `LINKED_TO_GAME`

Each official game must be attached to exactly one season, series and game slot before points count.

Persist:

- season ID,
- series ID,
- slot ID,
- expected player IDs,
- expected canonical platform usernames,
- platform,
- challenge ID when available,
- external game ID,
- game URL,
- submitted by,
- validation source,
- validation timestamps,
- rejection/dispute reason,
- provider payload hash/provenance.

Prevent duplicate counting by unique `(platform, external_game_id)` and transactional checks.

## 5. Provider adapters

### Lichess

Implement or complete:

- parse Lichess game/challenge IDs and URLs,
- fetch a specific completed game or deterministically locate it,
- normalize usernames case-insensitively,
- verify both expected players,
- read result, variant, rated flag, time control and timestamps,
- capture challenge-to-game linkage when available.

Creating challenges via OAuth must remain optional until player ownership/OAuth is configured. Never store OAuth tokens in GitHub.

### Chess.com

Implement or complete:

- parse Chess.com game URLs/IDs where possible,
- query public monthly archives/recent games deterministically,
- find the exact submitted game,
- verify both expected usernames,
- verify result, rules and timestamp,
- handle archive delay with retry/backoff and a non-terminal `PENDING_PROVIDER` result.

Do not claim Chess.com can create challenges through an API unless the deployed integration proves it.

## 6. Validation rules

A game may become `VALIDATED` only when all configured requirements pass:

- both provider usernames exactly match the two expected players,
- the platform is shared by the pair and selected for the series,
- the game is completed with a supported result,
- the game started after the slot/season became eligible,
- the game is not already linked to another official slot,
- variant/time control/rated rules match configuration,
- neither player is an unrelated account,
- provider response is authentic and internally consistent.

If provider lookup is temporarily unavailable, keep the game pending; do not reject it as nonexistent.

Return safe, understandable player messages for common failures.

## 7. Atomic scoring and series reconciliation

On successful validation, in one database transaction:

1. store immutable validation evidence/hash,
2. mark the slot `VALIDATED`,
3. write normalized result,
4. award 3/1/0 through the league engine,
5. recalculate the parent series games played and points,
6. mark series `COMPLETE` after all three validated games,
7. update both players' last official activity,
8. preserve idempotency if the worker retries,
9. append an audit event.

Historical/community games must never enter official League Points unless explicitly linked to a current official slot.

## 8. Readiness/admin dashboard

Create an authenticated admin-only readiness endpoint/page showing:

- registration state,
- verified registered-player count,
- ownership-verification count/status,
- platform distribution,
- incompatible pairs,
- players needing a secondary account,
- duplicate/conflicting registration requests,
- missing rule decisions,
- series count that would be generated,
- total official games,
- recommended pace/duration,
- blockers preventing roster freeze/start.

Provide explicit `READY` / `BLOCKED` checks. Do not expose admin data publicly.

## 9. Worker behavior

Refactor the worker into idempotent jobs rather than one monolithic execution:

- refresh ratings,
- poll reported/challenged games,
- validate official games,
- reconcile series,
- calculate activity/reminders,
- optionally sync Sheets,
- produce WhatsApp dry-run digests.

Add per-job logs, counts, error categories, retry/backoff and dead-letter/dispute records. One provider failure must not stop processing other games.

## 10. Security and privacy

- Protect player-mutating routes with player session tokens.
- Protect admin routes with existing admin authentication and rate limits.
- Do not trust client-supplied result, opponent, score or canonical username.
- Escape public text.
- Enforce JSON/body size limits.
- Do not log player tokens, admin keys, OAuth tokens, phone numbers or JIDs.
- Public endpoints continue showing only verified registered players.

## 11. Tests

Add deterministic unit/integration tests covering at least:

- player token hash/auth/revocation,
- one player cannot modify another,
- exact Lichess player pair and result validates,
- wrong Lichess opponent rejects,
- exact Chess.com archive game validates,
- provider delay stays pending rather than rejected,
- duplicate external game cannot count twice,
- wrong time control/variant/rated rule rejects,
- pre-season game rejects,
- transaction updates points/series/activity exactly once,
- historical game never counts without official slot link,
- all three results and 3/1/0 scoring,
- series completes only after three validated games,
- readiness blocks incompatible pairs,
- readiness reports missing configuration,
- WhatsApp remains dry-run and does not call `/send`.

Run `npm test` and `npm run check` before any staging deployment.

## 12. Staging validation

Deploy only to the existing loopback staging service and `/preview-v2/` or other isolated owner-only route. Keep the real registration route OPEN and preserve real registration rows.

For synthetic tests:

- make a consistent SQLite snapshot including WAL/SHM,
- use isolated test rows/fixtures,
- restore/clean them deterministically,
- prove no real registration was lost,
- prove no real season/series was created,
- prove no WhatsApp send occurred.

Do not change the public root or start the real league.

## Deliverables

Create `/root/hmena-chess-phase2_8/<UTC_TIMESTAMP>/` with:

- `PHASE2_8_REPORT.md`
- `BEFORE_STATE.md`
- `AFTER_STATE.md`
- `PLAYER_ACCESS_SECURITY.md`
- `GAME_VALIDATION_CONTRACT.md`
- `PROVIDER_VALIDATION_MATRIX.md`
- `LEAGUE_READINESS_SAMPLE.json`
- `staging_validation.md`
- `rollback.sh` or `ROLLBACK.md`
- `commands_run.log`
- `SHA256SUMS`

Create a `.tar.gz` evidence bundle.

Final report must include:

- `REMOTE_HEAD=`
- `TESTS=`
- `REGISTRATION_STATE=`
- `REAL_REGISTRATIONS_PRESERVED=`
- `REAL_SERIES_CREATED=0`
- `PLAYER_ACCESS_AUTH=`
- `LICHESS_VALIDATOR=`
- `CHESSCOM_VALIDATOR=`
- `DUPLICATE_PROTECTION=`
- `ATOMIC_SCORING=`
- `READINESS_DASHBOARD=`
- `WHATSAPP_DRY_RUN=true`
- `PUBLIC_CUTOVER=false`
- blockers requiring organizer decisions,
- rollback/evidence paths.

Finish exactly with:

`PHASE2_8_GAME_VALIDATION_READY_FOR_RULES_APPROVAL`
