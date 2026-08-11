import test from 'node:test';
import assert from 'node:assert/strict';
import { ChessComClient, chessComRating } from '../src/providers/chesscom.js';

const response = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  async json() { return body; },
  async text() { return JSON.stringify(body); },
});

test('Chess.com retries a 429 once without deadlocking the request queue', async () => {
  const calls = [];
  const sleeps = [];
  const replies = [
    response(429, { error: 'rate limited' }),
    response(200, { chess_rapid: { last: { rating: 1542 } } }),
  ];
  const client = new ChessComClient({
    userAgent: 'HMENA-test/1.0 (contact: test@example.com)',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return replies.shift();
    },
    throttleMs: 0,
    sleepImpl: async ms => { sleeps.push(ms); },
  });

  const stats = await client.getStats('ExamplePlayer');
  assert.equal(calls.length, 2);
  assert.equal(sleeps[0], 60_000);
  assert.equal(stats.chess_rapid.last.rating, 1542);
});

test('Chess.com serialized queue continues after a retried request', async () => {
  let call = 0;
  const client = new ChessComClient({
    userAgent: 'HMENA-test/1.0 (contact: test@example.com)',
    fetchImpl: async () => {
      call += 1;
      if (call === 1) return response(429, {});
      if (call === 2) return response(200, { first: true });
      return response(200, { second: true });
    },
    throttleMs: 0,
    sleepImpl: async () => {},
  });

  const first = client.request('/first');
  const second = client.request('/second');
  assert.deepEqual(await first, { first: true });
  assert.deepEqual(await second, { second: true });
  assert.equal(call, 3);
});

test('chessComRating selects the first available preferred rating', () => {
  assert.deepEqual(
    chessComRating({
      chess_blitz: { last: { rating: 1337 } },
      chess_bullet: { last: { rating: 1200 } },
    }),
    { type: 'chess_blitz', rating: 1337 },
  );
});
