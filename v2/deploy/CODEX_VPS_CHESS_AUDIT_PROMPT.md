# Codex VPS Chess Audit

**STATUS: COMPLETED on 2026-08-10.** This file is retained as the read-only forensic runbook.

The audit established the production-relevant facts later used by Phase 2:

- Shared WhatsApp bridge lives in `/opt/cis-whatsapp` and must be preserved.
- Audited bridge contract uses `POST /send` with `chat_id` + `message`.
- The correct MK Chess group JID was identified privately on the VPS and is intentionally not stored in GitHub.
- Three Future Champions reminder timers were the source of unwanted recurring chess notices.
- MK scheduler is separate and useful; it was not the source of the unwanted reminders.
- Legacy TMS PostgreSQL held the useful chess history.
- The old private coach pipeline was broken because its downstream publisher/consumer had been retired; the bridge itself was not the root cause.
- Legacy round/deadline Celery automation required a reversible gate before V2 cutover.

Audit evidence bundle:

`/root/hmena-chess-audit/20260810T125920Z/`

Completion marker:

`AUDIT_COMPLETE_NO_CHANGES_MADE`
