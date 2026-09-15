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

CREATE TABLE IF NOT EXISTS series_platforms (
  series_id TEXT PRIMARY KEY REFERENCES series(id) ON DELETE CASCADE,
  allowed_platforms_json TEXT NOT NULL
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

CREATE TABLE IF NOT EXISTS season_control (
  id INTEGER PRIMARY KEY CHECK(id=1),
  registration_state TEXT NOT NULL DEFAULT 'OPEN' CHECK(registration_state IN ('OPEN','CLOSED')),
  season_status TEXT NOT NULL DEFAULT 'REGISTRATION' CHECK(season_status IN ('REGISTRATION','STARTED','COMPLETED')),
  registration_opened_at TEXT,
  registration_closed_at TEXT,
  roster_frozen_at TEXT,
  started_at TEXT,
  completed_at TEXT
);

INSERT OR IGNORE INTO season_control (id,registration_state,season_status,registration_opened_at)
VALUES (1,'OPEN','REGISTRATION',CURRENT_TIMESTAMP);

CREATE TABLE IF NOT EXISTS account_verification_state (
  account_id TEXT PRIMARY KEY REFERENCES player_accounts(id) ON DELETE CASCADE,
  profile_verified INTEGER NOT NULL DEFAULT 0 CHECK(profile_verified IN (0,1)),
  profile_verification_source TEXT,
  profile_verified_at TEXT,
  ownership_verification TEXT NOT NULL DEFAULT 'pending'
    CHECK(ownership_verification IN ('not_required','pending','oauth','manual')),
  ownership_verified_at TEXT,
  ownership_verified_by TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_access_tokens (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  last_used_at TEXT,
  revoked_at TEXT,
  created_by TEXT NOT NULL DEFAULT 'registration',
  rotated_from_id TEXT REFERENCES player_access_tokens(id)
);
CREATE INDEX IF NOT EXISTS idx_player_access_active ON player_access_tokens(player_id,revoked_at,expires_at);

CREATE TABLE IF NOT EXISTS league_rule_config (
  rule_key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  approval_state TEXT NOT NULL DEFAULT 'PENDING' CHECK(approval_state IN ('APPROVED','PENDING')),
  description TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);
INSERT OR IGNORE INTO league_rule_config(rule_key,value_json,approval_state,description) VALUES
('games_per_opponent','3','APPROVED','Official games required against every opponent'),
('scoring','{"win":3,"draw":1,"loss":0}','APPROVED','Official league points'),
('allowed_platforms','["lichess","chesscom"]','APPROVED','Platforms accepted for official games'),
('standard_variant_required','true','APPROVED','Only standard chess counts'),
('time_control','{"mode":"organizer_decision","allowed":[]}','PENDING','Accepted time controls'),
('rated_requirement','"organizer_decision"','PENDING','Whether games must be rated or unrated'),
('color_policy','"any"','PENDING','Color assignment policy'),
('registration_deadline','null','PENDING','Registration deadline; never closes automatically while pending'),
('season_max_days','null','PENDING','Maximum season duration'),
('reminder_thresholds','{"reminder_hours":18,"urgent_hours":23,"activity_alert_hours":24}','PENDING','Reminder and activity alert thresholds'),
('accepted_challenge_deadline_policy','null','PENDING','Deadline after an accepted challenge'),
('forfeit_policy','{"automatic_24h_forfeit":false,"method":"manual_adjudication"}','PENDING','Forfeit policy'),
('tiebreak_order','["head_to_head","wins","sonneborn_berger"]','PENDING','Standings tiebreak order'),
('playoff_policy','null','PENDING','Playoff qualification and format'),
('ownership_requirement','"profile_only"','APPROVED','Current launch policy; profile existence is not OAuth ownership');

CREATE TABLE IF NOT EXISTS official_challenges (
  id TEXT PRIMARY KEY,
  series_id TEXT NOT NULL REFERENCES series(id),
  slot_id TEXT NOT NULL REFERENCES games(id),
  platform TEXT NOT NULL CHECK(platform IN ('lichess','chesscom')),
  provider_challenge_id TEXT,
  challenge_url TEXT,
  created_by_player_id TEXT NOT NULL REFERENCES players(id),
  status TEXT NOT NULL CHECK(status IN ('CREATED','ACCEPTED','EXPIRED','CANCELLED','LINKED_TO_GAME')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS official_game_submissions (
  id TEXT PRIMARY KEY,
  season_key TEXT NOT NULL DEFAULT 'CURRENT',
  series_id TEXT NOT NULL REFERENCES series(id),
  slot_id TEXT NOT NULL REFERENCES games(id),
  expected_player1_id TEXT NOT NULL REFERENCES players(id),
  expected_player2_id TEXT NOT NULL REFERENCES players(id),
  expected_player1_username TEXT NOT NULL,
  expected_player2_username TEXT NOT NULL,
  platform TEXT NOT NULL CHECK(platform IN ('lichess','chesscom')),
  challenge_id TEXT REFERENCES official_challenges(id),
  external_game_id TEXT NOT NULL,
  game_url TEXT,
  submitted_by_player_id TEXT NOT NULL REFERENCES players(id),
  status TEXT NOT NULL CHECK(status IN ('REPORTED','VALIDATING','PENDING_PROVIDER','VALIDATED','REJECTED','DISPUTED','VOID')),
  eligible_at TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  validation_source TEXT,
  provider_payload_sha256 TEXT,
  validated_at TEXT,
  rejection_reason TEXT,
  dispute_reason TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT,
  UNIQUE(platform,external_game_id)
);
CREATE INDEX IF NOT EXISTS idx_official_submission_status ON official_game_submissions(status,next_retry_at);
CREATE INDEX IF NOT EXISTS idx_official_submission_slot ON official_game_submissions(slot_id,status);

CREATE TABLE IF NOT EXISTS official_game_validation_evidence (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL UNIQUE REFERENCES official_game_submissions(id),
  provider TEXT NOT NULL,
  external_game_id TEXT NOT NULL,
  normalized_payload_json TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  validation_contract_version TEXT NOT NULL,
  validated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS official_game_disputes (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES official_game_submissions(id),
  opened_by_type TEXT NOT NULL CHECK(opened_by_type IN ('player','admin','worker')),
  opened_by_id TEXT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RESOLVED','VOID')),
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolution TEXT
);

CREATE TABLE IF NOT EXISTS league_audit_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_league_audit_entity ON league_audit_events(entity_type,entity_id,created_at);

CREATE TABLE IF NOT EXISTS job_runs (
  id TEXT PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('RUNNING','SUCCEEDED','FAILED')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  counts_json TEXT,
  error_category TEXT
);
CREATE TABLE IF NOT EXISTS job_dead_letters (
  id TEXT PRIMARY KEY,
  job_name TEXT NOT NULL,
  entity_id TEXT,
  error_category TEXT NOT NULL,
  safe_message TEXT NOT NULL,
  retry_after TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);
