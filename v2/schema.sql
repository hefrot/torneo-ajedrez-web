PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('lichess','chesscom')),
  username TEXT NOT NULL,
  whatsapp TEXT,
  country TEXT,
  registration_status TEXT NOT NULL DEFAULT 'pending',
  availability TEXT NOT NULL DEFAULT 'unknown',
  last_activity_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, username)
);

CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY,
  player1_id TEXT NOT NULL REFERENCES players(id),
  player2_id TEXT NOT NULL REFERENCES players(id),
  games_required INTEGER NOT NULL DEFAULT 3,
  games_played INTEGER NOT NULL DEFAULT 0,
  points1 INTEGER NOT NULL DEFAULT 0,
  points2 INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  UNIQUE(player1_id, player2_id)
);

CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  series_id TEXT NOT NULL REFERENCES series(id),
  player1_id TEXT NOT NULL REFERENCES players(id),
  player2_id TEXT NOT NULL REFERENCES players(id),
  game_no INTEGER NOT NULL,
  platform TEXT,
  external_game_id TEXT,
  url TEXT,
  result TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  played_at TEXT,
  validated_at TEXT,
  UNIQUE(platform, external_game_id),
  UNIQUE(series_id, game_no)
);

CREATE TABLE IF NOT EXISTS rating_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT NOT NULL REFERENCES players(id),
  platform TEXT NOT NULL,
  rating INTEGER,
  rating_type TEXT,
  captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id TEXT REFERENCES players(id),
  channel TEXT NOT NULL,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  scheduled_for TEXT,
  sent_at TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  series_id TEXT REFERENCES series(id),
  game_id TEXT REFERENCES games(id),
  challenger_id TEXT NOT NULL REFERENCES players(id),
  opponent_id TEXT NOT NULL REFERENCES players(id),
  platform TEXT NOT NULL,
  external_challenge_id TEXT,
  external_game_id TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  accepted_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_challenges (
  id TEXT PRIMARY KEY,
  challenger_id TEXT NOT NULL REFERENCES players(id),
  opponent_id TEXT REFERENCES players(id),
  platform TEXT NOT NULL,
  external_game_id TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  points_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- A player can own accounts on both platforms. The legacy columns in players
-- remain as the primary account for backwards-compatible API responses.
CREATE TABLE IF NOT EXISTS player_accounts (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  platform TEXT NOT NULL CHECK(platform IN ('lichess','chesscom')),
  username TEXT NOT NULL,
  username_normalized TEXT NOT NULL,
  account_status TEXT NOT NULL DEFAULT 'historical_unconfirmed',
  source_system TEXT NOT NULL,
  source_record_id TEXT,
  verification_source TEXT,
  verified_at TEXT,
  source_sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, username_normalized)
);

CREATE TABLE IF NOT EXISTS identity_sources (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  source_system TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  display_name TEXT,
  identifier_type TEXT,
  identifier_value TEXT,
  match_status TEXT NOT NULL,
  match_basis TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  last_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_system, source_record_id, identifier_type, identifier_value)
);

CREATE TABLE IF NOT EXISTS source_provenance (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, source_system, source_table, source_id)
);

-- Historical records never enter current League Points automatically.
CREATE TABLE IF NOT EXISTS historical_games (
  id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_game_id TEXT NOT NULL,
  external_game_id TEXT,
  platform TEXT,
  url TEXT,
  played_at TEXT,
  white_player_id TEXT REFERENCES players(id),
  black_player_id TEXT REFERENCES players(id),
  white_external_name TEXT,
  black_external_name TEXT,
  result TEXT,
  winner_player_id TEXT REFERENCES players(id),
  time_class TEXT,
  time_control TEXT,
  rated INTEGER,
  legacy_matchup_id TEXT,
  legacy_league_id TEXT,
  explicit_legacy_league_assignment INTEGER NOT NULL DEFAULT 0,
  identity_status TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  provenance_id TEXT NOT NULL REFERENCES source_provenance(id),
  UNIQUE(source_system, source_game_id)
);

CREATE TABLE IF NOT EXISTS historical_matchups (
  id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_matchup_id TEXT NOT NULL,
  player_a_id TEXT REFERENCES players(id),
  player_b_id TEXT REFERENCES players(id),
  games_played INTEGER,
  series_max INTEGER,
  status TEXT,
  deadline TEXT,
  round_number INTEGER,
  legacy_league_id TEXT,
  identity_status TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  provenance_id TEXT NOT NULL REFERENCES source_provenance(id),
  UNIQUE(source_system, source_matchup_id)
);

CREATE TABLE IF NOT EXISTS stockfish_analyses (
  id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_game_id TEXT NOT NULL,
  player_id TEXT REFERENCES players(id),
  opponent_id TEXT REFERENCES players(id),
  analyzed_at TEXT,
  platform TEXT,
  opening_name TEXT,
  opening_eco TEXT,
  accuracy REAL,
  errors INTEGER,
  blunders INTEGER,
  source_sha256 TEXT NOT NULL,
  provenance_id TEXT NOT NULL REFERENCES source_provenance(id),
  UNIQUE(source_system, source_game_id)
);

CREATE TABLE IF NOT EXISTS hall_of_fame_records (
  id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  season_name TEXT NOT NULL,
  cup TEXT,
  rank INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  player_id TEXT REFERENCES players(id),
  points INTEGER,
  legacy_league_id TEXT,
  identity_status TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  provenance_id TEXT NOT NULL REFERENCES source_provenance(id),
  UNIQUE(source_system, source_record_id)
);

CREATE TABLE IF NOT EXISTS historical_rating_snapshots (
  id TEXT PRIMARY KEY,
  player_id TEXT REFERENCES players(id),
  platform TEXT NOT NULL,
  username TEXT,
  rating_type TEXT,
  rating INTEGER,
  captured_at TEXT,
  identity_status TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  UNIQUE(source_system, source_record_id)
);

CREATE TABLE IF NOT EXISTS historical_challenges (
  id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  record_type TEXT,
  platform TEXT,
  challenger_id TEXT REFERENCES players(id),
  opponent_id TEXT REFERENCES players(id),
  status TEXT,
  created_at TEXT,
  expires_at TEXT,
  accepted_at TEXT,
  league_id TEXT,
  identity_status TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  UNIQUE(source_system, source_record_id)
);

CREATE TABLE IF NOT EXISTS historical_tournaments (
  id TEXT PRIMARY KEY,
  source_system TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  platform TEXT,
  name TEXT,
  starts_at TEXT,
  completed_at TEXT,
  status TEXT,
  external_id TEXT,
  external_url TEXT,
  league_id TEXT,
  participant_count INTEGER,
  winner_id TEXT REFERENCES players(id),
  winner_name TEXT,
  winner_points INTEGER,
  identity_status TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  UNIQUE(source_system, source_record_id)
);

CREATE TABLE IF NOT EXISTS community_xp_config (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  description TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO community_xp_config (key,value_json,description) VALUES
  ('game_base_xp','10','Base XP for a verified casual game'),
  ('daily_game_limit','5','Maximum casual games per player that can earn base XP each UTC day'),
  ('daily_cap','60','Maximum Community XP per player each UTC day'),
  ('weekly_cap','250','Maximum Community XP per player each ISO week'),
  ('repeated_opponent_multipliers','[1,0.75,0.5,0.25,0]','Multiplier by repeated opponent encounter in one UTC day'),
  ('distinct_opponent_bonus','4','Bonus for the first verified game against a distinct opponent each UTC day'),
  ('tournament_participation_xp','20','Verified tournament participation bonus'),
  ('tournament_win_xp','50','Verified tournament win bonus'),
  ('achievement_xp','25','Verified achievement bonus'),
  ('rating_progress_thresholds','[{"delta":25,"xp":5},{"delta":50,"xp":10},{"delta":100,"xp":20}]','Editable verified rating progress awards; rating never becomes League Points');

CREATE TABLE IF NOT EXISTS community_xp_events (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  event_type TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  base_xp REAL NOT NULL,
  multiplier REAL NOT NULL DEFAULT 1,
  awarded_xp INTEGER NOT NULL,
  verified INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(player_id, event_type, source_system, source_id)
);

CREATE INDEX IF NOT EXISTS idx_historical_games_played_at ON historical_games(played_at);
CREATE INDEX IF NOT EXISTS idx_historical_games_players ON historical_games(white_player_id,black_player_id);
CREATE INDEX IF NOT EXISTS idx_historical_ratings_player_time ON historical_rating_snapshots(player_id,captured_at);
CREATE INDEX IF NOT EXISTS idx_community_xp_player_time ON community_xp_events(player_id,occurred_at);

CREATE TABLE IF NOT EXISTS registration_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('lichess','chesscom')),
  username TEXT NOT NULL,
  username_normalized TEXT NOT NULL,
  whatsapp TEXT,
  country TEXT,
  matched_player_id TEXT REFERENCES players(id),
  match_basis TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  reviewed_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_registration_pending_username
ON registration_requests(platform,username_normalized)
WHERE status IN ('pending','pending_exact_candidate');
