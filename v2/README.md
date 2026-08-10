# HMENA Chess League v2 (2026)

This directory is the clean rebuild of the old tournament site. It intentionally leaves the legacy root files untouched until the new flow is verified.

## Tournament model

- Round robin: every pair of registered players has one **series**.
- Every series contains **3 games**.
- Per game: win = 3 points, draw = 1, loss = 0.
- Players may play ahead against any available opponent whose series is incomplete.
- While a player still has unfinished series, the activity SLA is one validated game every 24 hours.
- Suggested season duration: roughly N days for N players, but completion is based on all series finishing rather than fixed daily rounds.
- League champion is the player with the most points; tiebreaks are configurable.
- After league completion: top-8 Championship bracket; ranks 9-16 Challenger bracket when enough players exist. Smaller fields use byes automatically.

## Architecture

```text
Browser / mobile
    |
    v
chess.hmena.com
    |-- static web (v2/web)
    |-- /api -> FastAPI (v2/api)
                    |
                    |-- SQLite now (PostgreSQL-ready later)
                    |-- Lichess adapter
                    |-- Chess.com PubAPI adapter
                    |-- scheduler / 24h rules
                    |-- WhatsApp outbox hook
                    |-- Google Sheets sync hook

GitHub = source + history + rollback
VPS = only live API/database/worker + existing WhatsApp bridge
Google Drive/Sheet = master control, reporting, archive and backups
```

The Google Sheet is **not** used as the transactional database because simultaneous game validation, deadlines and web requests need atomic writes. The VPS database stays deliberately small and is synchronized to Drive.

## Public web

`v2/web/` is a responsive public portal with:

- registration
- standings
- player availability
- one-click challenge links for Lichess / Chess.com
- web challenge inbox (so WhatsApp is optional)
- 24h activity status
- playoff view

It calls same-origin `/api`. If the API is not present, it shows a safe recovered-player preview rather than failing blank.

## API

`v2/api/` contains the first runnable backend:

- `GET /api/health`
- `GET /api/public/snapshot`
- `GET /api/players`
- `POST /api/register`
- `POST /api/availability`
- `GET /api/challenges`
- `POST /api/challenges`
- `POST /api/games/report`
- `GET /api/standings`

Run locally:

```bash
cd v2/api
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python seed_players.py
uvicorn main:app --host 127.0.0.1 --port 8096 --reload
```

## Provider behavior

### Lichess

Public profile/rating/game data can be synchronized through the Lichess API. Requests must use a descriptive User-Agent. Full automatic challenge creation is optional because it requires authorization; the public web can always open the opponent's Lichess challenge/profile flow without storing player credentials.

### Chess.com

Chess.com's PubAPI is read-only. The portal therefore opens the official challenge page for the opponent, then the worker verifies completed public games. Reported game URLs can be stored immediately while API verification catches up.

## WhatsApp

The backend writes notification jobs to an outbox. The existing WhatsApp bridge should consume this outbox instead of tournament logic being embedded inside the WhatsApp process. That separation lets the web, API and bot evolve independently.

Recommended automatic messages:

1. registration/invite
2. opponent available / challenge received
3. 18h activity reminder
4. 23h urgent reminder
5. 24h overdue notice
6. series completed update
7. daily standings summary
8. weekly/monthly rating gain + activity leaderboard

## Migration rule

Do not delete the old Firebase/Sheets data. Import it into canonical player IDs, mark uncertain phone/name matches for review, and only then retire the legacy frontend.
