import test from 'node:test';
import assert from 'node:assert/strict';
import { sendGroupMessage } from '../src/services/whatsapp.js';

test('WhatsApp adapter uses audited /send contract for groups', async () => {
  let request;
  const result = await sendGroupMessage('Hola ajedrez', {
    bridgeUrl: 'http://127.0.0.1:3010',
    bridgeToken: 'test-token',
    authHeader: 'X-Test-Key',
    groupId: 'example@g.us',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        async json() { return { ok: true }; },
        async text() { return ''; },
      };
    },
  });

  assert.equal(request.url, 'http://127.0.0.1:3010/send');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers['X-Test-Key'], 'test-token');
  assert.deepEqual(JSON.parse(request.options.body), {
    chat_id: 'example@g.us',
    message: 'Hola ajedrez',
  });
  assert.deepEqual(result, { ok: true });
});
