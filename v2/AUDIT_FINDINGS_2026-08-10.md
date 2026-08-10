# VPS audit findings — 2026-08-10

Sanitized project note from the completed read-only audit. No WhatsApp group JIDs, tokens, phone numbers, session data, API keys or secret values belong in this repository.

## Confirmed architecture

- The shared WhatsApp bridge is alive under `/opt/cis-whatsapp`, implemented with `whatsapp-web.js` and persistent Chromium state.
- The audited bridge listens locally on port `3010` and its core text contract is `POST /send` with `chat_id` + `message`. Read endpoints include `/chats` and `/groups`; media has its own endpoint.
- The bridge is shared by chess and non-chess systems. It must **not** be replaced, deleted, or isolated as a chess-only component.
- The authoritative legacy TMS database is PostgreSQL (`menaverse_tms`).
- Historical chess data recovered from TMS includes 58 legacy player candidates, 191 games, 120 matchups, 107 Stockfish analyses and 8 Hall-of-Fame rows.
- The newer MK Chess module currently has only 5 member/identity rows and 6 scheduled posts; it has no persisted MK games, challenges or tournaments yet.

## Outbound automation findings

- Three enabled **Future Champions** reminder timers are the source of the unwanted recurring chess notices. Logs proved successful live sends through 2026-08-05.
- These Future Champions jobs are separate from the MK scheduler and should be treated as `DISABLE_AFTER_APPROVAL`.
- The six MK scheduled posts are a weekly mission/digest family, not 1v1 challenge spam. Preserve them until V2 replaces the behavior intentionally.
- TMS Celery Beat still has legacy deadline/round automation capable of extensions, forfeits, round changes, disqualifications and best-game messages if legacy matchups become active again. The recovered 120 legacy matchups are currently closed, but this mechanism should be gated/disabled for the retired league before V2 launch.

## Why the old private coach stopped working

- The WhatsApp bridge itself is not the root failure.
- Incoming chess messages are still observed by the bridge/listener.
- The downstream publisher/consumer that previously received those messages was removed/stopped; the bridge still attempts to reach its old internal destination and logs unreachable-connection errors.
- Therefore the old private coach pipeline is broken after ingestion, not at WhatsApp login.
- Reuse the bridge, historical games and Stockfish analyses; do not blindly resurrect the old publisher logic.

## V2 consequences

1. Preserve the shared WhatsApp bridge.
2. Configure the real chess group only through VPS secrets/environment, never GitHub.
3. Use `/send`, not an invented `/send-group` endpoint.
4. Reconcile the 58 legacy candidates and 191 games before choosing the production data source.
5. Treat the current SQLite V2 database as a staging scaffold until PostgreSQL migration/authority is resolved.
6. Keep official **League Points** separate from **Community XP**.
7. Historical games can seed H2H, activity, achievements and community statistics after identity reconciliation.
8. Future 1v1 challenges must be opt-in/event-driven and rate-limited, not unsolicited recurring spam.

## Public communities recovered

- Lichess team: `https://lichess.org/team/menakafelate`
- Chess.com club slug: `mk-chess-latam`

## Safety

No legacy source should be deleted until:

- a reproducible backup exists,
- player/account reconciliation is complete,
- imported row counts and hashes are checked,
- V2 staging passes functional tests,
- rollback has been demonstrated.
