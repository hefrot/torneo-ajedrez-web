from __future__ import annotations

import os
import sqlite3
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
BASE = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("DB_PATH", BASE / "league.db"))
SCHEMA = BASE / "schema.sql"
SEASON_ID = os.getenv("SEASON_ID", "2026-01")

PLAYERS = [
    ("P001", "Abraham Solano", "ACTIVO_2025", "Abrahamcitochess", None, 1509),
    ("P002", "Adriana Leilany Romero M.", "ACTIVO_2025", None, None, None),
    ("P003", "Alan Lewis Torres Pérez", "RETIRADO_2025", None, None, None),
    ("P004", "Alejandro Spinola", "ACTIVO_2025", None, None, None),
    ("P005", "Bayron Sánchez", "RETIRADO_2025", "CR-BAYO", None, 1286),
    ("P006", "Cristian Gordillo", "ACTIVO_2025", None, None, None),
    ("P007", "Daniel Vizcarra", "ACTIVO_2025", None, None, None),
    ("P008", "Danny", "RETIRADO_2025", None, None, None),
    ("P009", "Dulce Amarely Cervantes C.", "RETIRADO_2025", None, None, None),
    ("P010", "Elian Pincheira", "RETIRADO_2025", None, None, None),
    ("P011", "Erick Abraham García Rosas", "RETIRADO_2025", None, None, None),
    ("P012", "Francisco Cariño Méndez", "ACTIVO_2025", None, None, None),
    ("P013", "Héctor Roberto Tapia Jaguey", "ACTIVO_2025", None, None, 1823),
    ("P014", "Ivanna Jiménez Guatemala", "ACTIVO_2025", None, None, None),
    ("P015", "Jairo Romero", "ACTIVO_2025", None, None, None),
    ("P016", "Jheynner Zuleta", "ACTIVO_2025", None, None, None),
    ("P017", "Joel Medina", "ACTIVO_2025", "elprofehy", None, 1400),
    ("P018", "Jorge Contrera", "ACTIVO_2025", None, None, None),
    ("P019", "Jorge Michel Aparicio Santizo", "ACTIVO_2025", None, None, None),
    ("P020", "José Adrián Santiago Flores", "ACTIVO_2025", None, None, None),
    ("P021", "Josué Octavio Rodríguez López", "RETIRADO_2025", None, None, 1946),
    ("P022", "Josué Rangel", "RETIRADO_2025", None, None, None),
    ("P023", "Leonardo Set Valencia Rojas", "ACTIVO_2025", None, None, None),
    ("P024", "Luis Orozco Scarpetta", "ACTIVO_2025", None, None, None),
    ("P025", "Sebastián Guatemala Toledo", "ACTIVO_2025", None, None, None),
    ("P026", "Uriel Espinosa Perez", "ACTIVO_2025", None, None, None),
    ("P027", "Yosvani Beitia García", "ACTIVO_2025", None, None, None),
    ("P028", "Zhilakai Borxat", "ACTIVO_2025", None, None, None),
]

# Historical ratings are references only. They are intentionally not used as current ratings.
HISTORICAL_LICHESS_RATINGS = {
    "P001": 1509,
    "P005": 1286,
    "P013": 1823,
    "P017": 1400,
    "P021": 1946,
}


def main() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    con.execute("PRAGMA foreign_keys=ON")
    con.executescript(SCHEMA.read_text(encoding="utf-8"))
    con.execute(
        """
        INSERT OR IGNORE INTO seasons
        (id, name, status, games_per_opponent, win_points, draw_points, loss_points, activity_hours)
        VALUES (?, ?, 'registration', 3, 3, 1, 0, 24)
        """,
        (SEASON_ID, "HMENA Chess League 2026"),
    )
    for pid, name, historical_status, lichess, chesscom, historical_rating in PLAYERS:
        primary = "Lichess" if lichess else None
        con.execute(
            """
            INSERT INTO players
              (id, display_name, lichess_username, chesscom_username, primary_platform, historical_status)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              display_name=excluded.display_name,
              lichess_username=COALESCE(players.lichess_username, excluded.lichess_username),
              chesscom_username=COALESCE(players.chesscom_username, excluded.chesscom_username),
              primary_platform=COALESCE(players.primary_platform, excluded.primary_platform),
              historical_status=excluded.historical_status,
              updated_at=CURRENT_TIMESTAMP
            """,
            (pid, name, lichess, chesscom, primary, historical_status),
        )
        con.execute(
            """
            INSERT OR IGNORE INTO registrations(season_id, player_id, status, reminder_opt_in, notes)
            VALUES (?, ?, 'pending', 1, 'Historical player recovered; invitation pending')
            """,
            (SEASON_ID, pid),
        )
        if historical_rating is not None and lichess:
            con.execute(
                """
                INSERT OR IGNORE INTO rating_snapshots(player_id, platform, perf, rating, snapshot_at)
                VALUES (?, 'lichess', 'legacy_reference', ?, '2025-08-20T00:00:00Z')
                """,
                (pid, historical_rating),
            )
    con.commit()
    print(f"Seeded {len(PLAYERS)} recovered players into {DB_PATH}")
    print("All 2026 registrations remain pending until players confirm.")


if __name__ == "__main__":
    main()
