# Phase 2.5 status

- Owner preview: https://chess.hmena.com/preview-v2/
- Public cutover: false
- Preview route isolated behind Nginx; main public route preserved.
- Staging service: 127.0.0.1:3210
- WhatsApp live-send: disabled in staging (`WHATSAPP_DRY_RUN=true`).
- Preview marked `PREVIEW · NO PRODUCCIÓN` and `noindex,nofollow`.
- Phase 2 implementation commit: `88cd5961ee4010dea68660b49441f6347120d349`.
- Phase 2.5 preview implementation commit: `c820f42e520ad6eb3bce25321344856199acc366`.
- 6/6 suites and syntax checks passed before deployment.
- Identity review: 17 REVIEW, 57 unmatched legacy, 2 ambiguous games.
- Future Champions reminder timers disabled; MK scheduler preserved.
- Four legacy tournament Celery tasks gated reversibly.
- Shared cis-whatsapp bridge preserved and healthy.

Owner UX review still required before public cutover.
