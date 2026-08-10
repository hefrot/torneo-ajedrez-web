# Codex Phase 2 — migrate useful chess state and decommission obsolete automation

**STATUS: COMPLETED on 2026-08-10.** This file is retained as the executed runbook/evidence reference.

Phase 2 completed with:

- Historical migration to V2 staging.
- 62 canonical players, 65 platform accounts, 191 games, 120 matchups, 107 Stockfish analyses, 16 Hall of Fame records, 15 ratings, 120 historical challenge/matchup records and 2 tournaments preserved with provenance.
- No fuzzy name auto-merges.
- 17 identity REVIEW cases, 57 unmatched legacy players and 2 ambiguous games retained for owner review.
- Shared `/opt/cis-whatsapp` preserved.
- V2 WhatsApp adapter validated against `POST /send` using `chat_id` + `message`.
- `WHATSAPP_DRY_RUN=true` used for staging validation; no live WhatsApp send performed.
- Three obsolete Future Champions reminder timers disabled reversibly; scripts retained.
- MK scheduler preserved enabled/active.
- Legacy Celery tournament tasks `check_deadlines`, `auto_advance_round`, `assign_deadlines`, and `auto_forfeit_expired` gated reversibly while unrelated Celery workloads remained healthy.
- Staging deployed at `127.0.0.1:3210`.
- Tests/checks passed before staging.
- Rollback and evidence bundle generated under `/root/hmena-chess-phase2/20260810T154631Z/`.

The owner preview was implemented in Phase 2.5 and is available at:

`https://chess.hmena.com/preview-v2/`

No public V2 cutover has been approved.
