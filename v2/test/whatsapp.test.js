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
    dryRun: false,
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

test('WhatsApp dry-run never calls the bridge and returns deterministic hashes', async () => {
  let called=false;
  const result=await sendGroupMessage('Mensaje de prueba',{bridgeUrl:'http://127.0.0.1:3010',groupId:'private-example@g.us',dryRun:true,fetchImpl:async()=>{called=true;throw new Error('must not call');}});
  assert.equal(called,false);
  assert.equal(result.dryRun,true);
  assert.match(result.targetHash,/^[a-f0-9]{64}$/);
  assert.match(result.messageHash,/^[a-f0-9]{64}$/);
});
