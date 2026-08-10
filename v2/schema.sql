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
