PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  starts_at TEXT,
  registration_closes_at TEXT,
  status TEXT NOT NULL DEFAULT 'registration',
  games_per_opponent INTEGER NOT NULL DEFAULT 3,
  win_points INTEGER NOT NULL DEFAULT 3,
  draw_points INTEGER NOT NULL DEFAULT 1,
  loss_points INTEGER NOT NULL DEFAULT 0,
  activity_hours INTEGER NOT NULL DEFAULT 24,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  phone_e164 TEXT,
  country TEXT,
  lichess_username TEXT,
  chesscom_username TEXT,
  primary_platform TEXT,
  historical_status TEXT,
  contact_verified INTEGER NOT NULL DEFAULT 0,
  platform_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_lichess_ci
ON players(lower(lichess_username)) WHERE lichess_username IS NOT NULL AND lichess_username <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_chesscom_ci
ON players(lower(chesscom_username)) WHERE chesscom_username IS NOT NULL AND chesscom_username <> '';

CREATE TABLE IF NOT EXISTS registrations (
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  seed INTEGER,
  joined_at TEXT,
  reminder_opt_in INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  PRIMARY KEY (season_id, player_id)
);

CREATE TABLE IF NOT EXISTS availability (
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unknown',
  message TEXT,
  expires_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (season_id, player_id)
);

CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  player1_id TEXT NOT NULL REFERENCES players(id),
  player2_id TEXT NOT NULL REFERENCES players(id),
  games_required INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  UNIQUE (season_id, player1_id, player2_id),
  CHECK (player1_id < player2_id)
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  series_id TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  external_game_id TEXT,
  game_url TEXT,
  white_player_id TEXT REFERENCES players(id),
  black_player_id TEXT REFERENCES players(id),
  result TEXT,
  winner_player_id TEXT REFERENCES players(id),
  p1_points INTEGER NOT NULL DEFAULT 0,
  p2_points INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'reported',
  started_at TEXT,
  played_at TEXT,
  reported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  validated_at TEXT,
  raw_json TEXT,
  UNIQUE (platform, external_game_id)
);

CREATE TABLE IF NOT EXISTS challenge_requests (
  id TEXT PRIMARY KEY,
  season_id TEXT REFERENCES seasons(id) ON DELETE CASCADE,
  sender_player_id TEXT NOT NULL REFERENCES players(id),
  recipient_player_id TEXT REFERENCES players(id),
  platform TEXT,
  time_control TEXT,
  message TEXT,
  scope TEXT NOT NULL DEFAULT 'league',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  accepted_at TEXT
);

CREATE TABLE IF NOT EXISTS rating_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  perf TEXT NOT NULL,
  rating INTEGER,
  snapshot_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (player_id, platform, perf, snapshot_at)
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  due_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TEXT,
  error TEXT,
  dedupe_key TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_state (
  season_id TEXT NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  last_validated_game_at TEXT,
  next_deadline_at TEXT,
  reminder18_sent_at TEXT,
  reminder23_sent_at TEXT,
  overdue_sent_at TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (season_id, player_id)
);

CREATE TABLE IF NOT EXISTS sync_state (
  provider TEXT NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  cursor TEXT,
  last_success_at TEXT,
  last_error TEXT,
  PRIMARY KEY (provider, player_id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
