# Codex Phase 2 — migrate useful chess state and decommission obsolete automation

Run this only after the 2026-08-10 read-only audit bundle exists and is intact.

## Goal

Move useful chess history and current MK identity/configuration into a clean V2 staging data model, preserve the shared WhatsApp bridge, and disable only obsolete legacy chess automation after evidence/rollback checks.

## Safety gates

- Do not delete legacy databases, tables, source trees, WhatsApp sessions, Chromium profiles, Redis volumes, Docker volumes or audit evidence.
- Do not modify CIS/finance/trading/health/market-brief consumers of the shared WhatsApp bridge.
- Do not send production WhatsApp messages during migration validation. Use dry-run/fake target mechanisms where available.
- Do not expose secrets in logs or artifacts.
- Before changing any systemd timer/service, capture `systemctl cat`, enabled/active state and last logs into the Phase 2 evidence directory.
- Every disable action must have an explicit rollback command recorded first.
- If current runtime differs materially from the completed audit, STOP and report drift.

## 1. Verify audit integrity

Locate the latest completed bundle under `/root/hmena-chess-audit/` whose summary ends with `AUDIT_COMPLETE_NO_CHANGES_MADE`.

Verify:
- `SHA256SUMS`
- `EXECUTIVE_SUMMARY.md`
- `automation_inventory.csv`
- `outbound_message_map.csv`
- `players_recovered.csv`
- `accounts_recovered.csv`
- `games_recovered.csv`
- `challenges_recovered.csv`
- `rating_snapshots_recovered.csv`
- `tournaments_recovered.csv`
- `coach_legacy_audit.md`
- `DATA_AUTHORITY_MAP.md`

Create `/root/hmena-chess-phase2/<UTC_TIMESTAMP>/` and record all commands and before/after evidence there.

## 2. Reconcile identities — no fuzzy auto-merges

Build a canonical mapping from:
- legacy TMS player candidates,
- MK members/identities,
- Lichess usernames,
- Chess.com usernames,
- WhatsApp JIDs,
- recovered historical handles.

Automatic merge is permitted only on exact stable identifiers such as the same normalized platform username or exact WhatsApp JID.

Name similarity must only produce `REVIEW` candidates.

Produce:
- `identity_map.csv`
- `identity_conflicts.csv`
- `unmatched_legacy_players.csv`
- `confirmed_platform_accounts.csv`

Never publish phone/JID data to the public web.

## 3. Preserve historical chess records

Import/reconcile the historical 191 games, 120 matchups, 107 Stockfish analyses and Hall-of-Fame data into a **staging V2 namespace/database/schema** without changing the legacy source rows.

Requirements:
- keep original source IDs,
- preserve game URLs/external IDs/platform/result/timestamps when present,
- add provenance fields,
- do not count ambiguous player mappings as confirmed,
- keep league-official games distinguishable from community/casual history,
- record import counts and deterministic hashes.

Produce a before/after reconciliation report proving no source rows were silently lost.

## 4. Community statistics layer

Create derived/read models for:
- games 7d / 30d / all time,
- H2H total and W-D-L,
- distinct opponents,
- current and longest activity streak,
- rating delta 7d / 30d when snapshots exist,
- tournaments participated/won when evidence exists,
- Stockfish analyses available,
- Hall-of-Fame achievements.

Keep these separate from official league scoring.

### League points
- win = 3
- draw = 1
- loss = 0
- only explicitly linked league slots count

### Community XP
Implement as a separate ledger/event family. Proposed initial anti-farming rules for staging:
- first 5 verified casual games/day can earn base XP,
- decreasing XP for repeated games against the same opponent in a day,
- bonus for distinct opponents,
- daily and weekly caps,
- tournament/achievement bonuses only on verified evidence,
- rating itself is never converted directly into league points.

Do not finalize numeric XP values without a configuration table so they can be changed without code deployment.

## 5. Shared WhatsApp bridge

Preserve `/opt/cis-whatsapp` and its active session.

V2 integration must use the audited bridge contract and the chess group JID already recovered in the audit/VPS configuration. Do not copy the JID into a public repository.

Before any live send, implement a test/dry-run mode that logs the intended target + message hash but does not call WhatsApp.

Future message families:
- official league alerts,
- daily digest,
- weekly digest,
- milestone/achievement notifications with rate limits,
- opt-in 1v1 challenges,
- tournament announcements.

Never resurrect unsolicited recurring 1v1 challenge spam.

## 6. Decommission obsolete Future Champions reminders

From `automation_inventory.csv` and `outbound_message_map.csv`, identify exactly the three enabled Future Champions reminder timers/services proven to have produced the unwanted recurring notices.

For each one:
1. record unit file and current state,
2. record last 100 relevant journal lines,
3. write rollback commands,
4. stop the timer/service if currently active,
5. disable the timer so it cannot fire again,
6. verify it is inactive/disabled,
7. do **not** delete its source file yet.

Do not disable MK weekly mission/digest automation as part of this step.

## 7. Gate retired legacy TMS round/deadline automation

The audit found Celery Beat tasks that can still run legacy deadline/round actions even though recovered legacy matchups are closed.

Implement the least invasive reversible gate so retired legacy competitions cannot emit WhatsApp league events or mutate old rounds while V2 is being built.

Prefer configuration/feature-gate/queue exclusion over deleting worker code.

Do not affect unrelated TMS workloads.

Document:
- exact task names,
- how they were gated,
- how to restore them,
- proof unrelated Celery tasks still run.

## 8. Do not revive the old coach pipeline

Keep reusable pieces:
- WhatsApp bridge,
- historical player/account data,
- game history,
- Stockfish analyses,
- Stockfish binary/service if healthy and shared safely.

Do not reconnect the deleted/stopped old publisher blindly.

Instead document the interface a future V2 coach should use:
`WhatsApp/Web event -> V2 identity -> verified game -> analysis queue -> Stockfish -> structured insight -> rate-limited response`.

The new coach must be opt-in and stateless/recoverable enough that a missing consumer does not silently break the group workflow.

## 9. V2 staging deployment preparation

Use the GitHub branch `agent/hmena-chess-league-v2` as the code source. Do not merge `main` during this task.

Before deployment:
- pull/fetch branch safely,
- run tests,
- verify the WhatsApp adapter uses `/send` with `chat_id` + `message`,
- keep the real group JID and API key only in VPS environment,
- configure Lichess team and Chess.com club public URLs,
- keep `chess.hmena.com/registro` as the canonical registration route.

Deploy to a staging port/hostname or loopback-only port first. Do not cut over the public domain until registration, players, standings, activity and rollback tests pass.

## 10. Deliverables

Create inside the Phase 2 evidence directory:
- `PHASE2_SUMMARY.md`
- `BEFORE_STATE.md`
- `AFTER_STATE.md`
- `identity_map.csv`
- `identity_conflicts.csv`
- `import_reconciliation.csv`
- `community_metrics_sample.csv`
- `disabled_automation.csv`
- `celery_gate_report.md`
- `whatsapp_v2_contract.md`
- `staging_validation.md`
- `rollback.sh` (reviewable; no secrets)
- `commands_run.log`
- `SHA256SUMS`

Create a `.tar.gz` evidence bundle.

End with a concise report containing:
1. migrated/reconciled row counts,
2. identity conflicts requiring human review,
3. exact obsolete automations disabled,
4. legacy Celery gate status,
5. shared WhatsApp bridge health,
6. staging test results,
7. blockers before public cutover,
8. rollback location,
9. evidence bundle path.

Finish exactly with:
`PHASE2_COMPLETE_REVIEW_BEFORE_PUBLIC_CUTOVER`
