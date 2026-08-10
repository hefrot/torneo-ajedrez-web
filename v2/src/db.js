import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function openDatabase(path = process.env.DATABASE_PATH || './data/league.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  const schemaPath = fileURLToPath(new URL('../schema.sql', import.meta.url));
  db.exec(readFileSync(schemaPath, 'utf8'));
  return db;
}
export function listPlayers(db,{registeredOnly=false}={}){const where=registeredOnly?" WHERE registration_status='registered'":'';return db.prepare(`SELECT * FROM players${where} ORDER BY name`).all();}
export function loadGames(db){return db.prepare(`SELECT id, player1_id AS player1Id, player2_id AS player2Id, result, status FROM games`).all();}
export function loadSeries(db){return db.prepare(`SELECT id, player1_id AS player1Id, player2_id AS player2Id, games_required AS gamesRequired, games_played AS gamesPlayed, points1, points2, status FROM series ORDER BY id`).all();}
