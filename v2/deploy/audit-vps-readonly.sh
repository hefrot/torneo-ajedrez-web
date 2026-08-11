#!/usr/bin/env bash
set -Eeuo pipefail

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${1:-/tmp/hmena-chess-vps-audit-${STAMP}}"
mkdir -p "$OUT"
chmod 700 "$OUT"

log() { printf '[%s] %s\n' "$(date -u +%H:%M:%S)" "$*" | tee -a "$OUT/audit.log" >&2; }
run_text() {
  local name="$1"; shift
  log "$name"
  { "$@"; } >"$OUT/${name}.txt" 2>"$OUT/${name}.err" || true
}
redact_env_keys() {
  local src="$1" dst="$2"
  if [[ -f "$src" ]]; then
    sed -nE 's/^([A-Za-z_][A-Za-z0-9_]*)=.*/\1=<REDACTED>/p' "$src" | sort -u > "$dst"
  fi
}

log "Starting read-only HMENA chess audit in $OUT"
run_text system bash -lc 'date -u; hostname; uname -a; cat /etc/os-release 2>/dev/null || true'
run_text listening_ports bash -lc 'ss -lntp 2>/dev/null || netstat -lntp 2>/dev/null || true'
run_text docker_ps bash -lc 'docker ps --no-trunc 2>/dev/null || true'
run_text docker_compose_projects bash -lc 'docker compose ls 2>/dev/null || true'
run_text systemd_chess bash -lc "systemctl list-units --type=service --all --no-pager 2>/dev/null | grep -Ei 'chess|menaverse|stockfish|whatsapp' || true"
run_text timers_chess bash -lc "systemctl list-timers --all --no-pager 2>/dev/null | grep -Ei 'chess|menaverse|stockfish|whatsapp' || true"
run_text nginx_chess bash -lc "grep -RIn --exclude='*.pem' --exclude='*.key' -E 'chess\.hmena\.com|menaverse-tms|8081|8096|3010' /etc/nginx 2>/dev/null || true"

for root in /root/menaverse-tms /opt/menaverse/chess_automation /opt/stockfish-bot /opt/cis-whatsapp; do
  safe="$(printf '%s' "$root" | sed 's#^/##;s#/#__#g')"
  if [[ -d "$root" ]]; then
    log "Inventory $root"
    find "$root" -maxdepth 4 -type f \
      ! -path '*/.git/*' ! -path '*/node_modules/*' ! -path '*/.venv/*' \
      -printf '%p\t%s bytes\t%TY-%Tm-%Td %TH:%TM:%TS\n' 2>/dev/null | sort > "$OUT/files_${safe}.tsv" || true
    find "$root" -maxdepth 4 -type f \( -name '.env' -o -name '*.env' -o -name '.env.*' \) -print0 2>/dev/null |
      while IFS= read -r -d '' envfile; do
        rel="$(printf '%s' "$envfile" | sed 's#/#__#g')"
        redact_env_keys "$envfile" "$OUT/env_keys_${rel}.txt"
      done
  fi
done

if [[ -d /root/menaverse-tms ]]; then
  run_text menaverse_compose_ps bash -lc 'cd /root/menaverse-tms && docker compose ps 2>/dev/null || true'
  run_text menaverse_compose_services bash -lc 'cd /root/menaverse-tms && docker compose config --services 2>/dev/null || true'
fi

PG_CONTAINER=""
for candidate in menaverse-tms-postgres-1 menaverse_tms-postgres-1; do
  if docker inspect "$candidate" >/dev/null 2>&1; then PG_CONTAINER="$candidate"; break; fi
done
if [[ -z "$PG_CONTAINER" ]]; then
  PG_CONTAINER="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -Ei 'menaverse.*postgres|chess.*postgres' | head -n1 || true)"
fi

if [[ -n "$PG_CONTAINER" ]]; then
  printf '%s\n' "$PG_CONTAINER" > "$OUT/postgres_container.txt"
  PSQL=(docker exec "$PG_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U menaverse -d menaverse_tms)
  "${PSQL[@]}" -Atc "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" > "$OUT/db_tables.txt" 2>"$OUT/db_tables.err" || true
  "${PSQL[@]}" -F $'\t' -Atc "SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position;" > "$OUT/db_schema_columns.tsv" 2>"$OUT/db_schema_columns.err" || true

  mapfile -t TABLES < <(cat "$OUT/db_tables.txt" 2>/dev/null || true)
  for table in "${TABLES[@]:-}"; do
    [[ "$table" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    if [[ "$table" =~ (player|user|member|participant|registration|game|pair|standing|rating|challenge|tournament|league) ]]; then
      cols="$("${PSQL[@]}" -Atc "SELECT string_agg(quote_ident(column_name), ',' ORDER BY ordinal_position) FROM information_schema.columns WHERE table_schema='public' AND table_name='${table}' AND column_name !~* '(password|passwd|secret|token|api.?key|credential|session|cookie|private.?key|oauth)';" 2>/dev/null || true)"
      if [[ -n "$cols" ]]; then
        log "Exporting safe columns from table $table"
        "${PSQL[@]}" -c "COPY (SELECT ${cols} FROM \"${table}\") TO STDOUT WITH CSV HEADER" > "$OUT/db_${table}.csv" 2>"$OUT/db_${table}.err" || true
      fi
    fi
  done
else
  printf 'No matching PostgreSQL container found.\n' > "$OUT/postgres_container.txt"
fi

run_text integration_references bash -lc "grep -RInE --exclude='*.env' --exclude='.env' --exclude='*.key' --exclude='*.pem' --exclude-dir='.git' --exclude-dir='node_modules' --exclude-dir='.venv' 'lichess|chess\.com|firebaseio\.com|whatsapp|pairing|standings|tournament' /root/menaverse-tms /opt/menaverse/chess_automation /opt/stockfish-bot 2>/dev/null | head -n 5000 || true"

if curl --max-time 5 -fsS http://127.0.0.1:3010/chats > "$OUT/whatsapp_chats.json" 2>"$OUT/whatsapp_chats.err"; then
  log "Captured WhatsApp chat list from local bridge"
else
  rm -f "$OUT/whatsapp_chats.json"
fi

for repo in /root/menaverse-tms /opt/menaverse/chess_automation /opt/stockfish-bot /opt/cis-whatsapp; do
  if [[ -d "$repo/.git" ]]; then
    safe="$(printf '%s' "$repo" | sed 's#^/##;s#/#__#g')"
    git -C "$repo" status --short --branch > "$OUT/git_${safe}.txt" 2>&1 || true
    git -C "$repo" log -n 20 --date=iso --pretty=format:'%h%x09%ad%x09%s' > "$OUT/gitlog_${safe}.tsv" 2>&1 || true
  fi
done

cat > "$OUT/README.txt" <<TXT
HMENA Chess VPS read-only audit
Generated: $STAMP UTC

This bundle intentionally redacts .env VALUES and excludes columns whose names look like passwords, tokens, secrets, API keys, credentials, sessions, cookies, private keys or OAuth fields.

Priority files for player recovery:
- db_tables.txt
- db_schema_columns.tsv
- db_*player*.csv / db_*registration*.csv / db_*game*.csv
- whatsapp_chats.json (if local bridge allowed GET /chats)
- files_root__menaverse-tms.tsv
- files_opt__menaverse__chess_automation.tsv
- integration_references.txt
TXT

tar -C "$(dirname "$OUT")" -czf "${OUT}.tar.gz" "$(basename "$OUT")"
chmod 600 "${OUT}.tar.gz"
log "Audit complete: ${OUT}.tar.gz"
printf '%s\n' "${OUT}.tar.gz"
