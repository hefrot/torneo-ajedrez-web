const BASE = 'https://api.chess.com/pub';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

export class ChessComClient {
  constructor({
    userAgent = process.env.CHESSCOM_USER_AGENT,
    fetchImpl = fetch,
    throttleMs = 350,
    sleepImpl = sleep,
  } = {}) {
    if (!userAgent) throw new Error('CHESSCOM_USER_AGENT is required');
    this.userAgent = userAgent;
    this.fetch = fetchImpl;
    this.throttleMs = throttleMs;
    this.sleep = sleepImpl;
    this.queue = Promise.resolve();
  }

  async request(path) {
    const task = async () => {
      const requestOnce = () => this.fetch(`${BASE}${path}`, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
      });

      let response = await requestOnce();
      if (response.status === 429) {
        await this.sleep(60_000);
        response = await requestOnce();
      }

      if (!response.ok) {
        throw new Error(`Chess.com ${response.status}: ${await response.text()}`);
      }

      await this.sleep(this.throttleMs);
      return response.json();
    };

    const next = this.queue.then(task, task);
    this.queue = next.then(() => undefined, () => undefined);
    return next;
  }

  getStats(username) {
    return this.request(`/player/${encodeURIComponent(username)}/stats`);
  }

  getArchives(username) {
    return this.request(`/player/${encodeURIComponent(username)}/games/archives`);
  }

  async getRecentGames(username, months = 2) {
    const { archives = [] } = await this.getArchives(username);
    const selected = archives.slice(-Math.max(1, months));
    const batches = [];
    for (const archiveUrl of selected) {
      const path = archiveUrl.replace('https://api.chess.com/pub', '');
      const payload = await this.request(path);
      batches.push(...(payload.games ?? []));
    }
    return batches;
  }
}

export function chessComRating(
  stats,
  preferred = ['chess_rapid', 'chess_blitz', 'chess_bullet', 'chess_daily'],
) {
  for (const key of preferred) {
    const rating = stats?.[key]?.last?.rating;
    if (Number.isFinite(rating)) return { type: key, rating };
  }
  return { type: null, rating: null };
}
