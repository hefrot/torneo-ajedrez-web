export async function sendGroupMessage(
  text,
  {
    bridgeUrl = process.env.WHATSAPP_BRIDGE_URL,
    bridgeToken = process.env.WHATSAPP_BRIDGE_TOKEN,
    authHeader = process.env.WHATSAPP_BRIDGE_AUTH_HEADER || 'X-API-Key',
    groupId = process.env.WHATSAPP_GROUP_ID,
    dryRun = String(process.env.WHATSAPP_DRY_RUN ?? 'true').toLowerCase() !== 'false',
    dryRunLog = process.env.WHATSAPP_DRY_RUN_LOG,
    fetchImpl = fetch,
  } = {},
) {
  if (!bridgeUrl || !groupId) {
    return { skipped: true, reason: 'WhatsApp bridge/group not configured' };
  }

  if (dryRun) {
    const {createHash} = await import('node:crypto');
    const targetHash = createHash('sha256').update(groupId).digest('hex');
    const messageHash = createHash('sha256').update(text).digest('hex');
    if (dryRunLog) {
      const {appendFileSync,mkdirSync} = await import('node:fs');
      const {dirname} = await import('node:path');
      mkdirSync(dirname(dryRunLog),{recursive:true});
      appendFileSync(dryRunLog,`${JSON.stringify({at:new Date().toISOString(),target:groupId,targetHash,messageHash,messageLength:text.length})}\n`,{mode:0o600});
    }
    return {dryRun:true,targetHash,messageHash,messageLength:text.length};
  }

  const headers = { 'Content-Type': 'application/json' };
  if (bridgeToken) headers[authHeader] = bridgeToken;

  const response = await fetchImpl(`${bridgeUrl.replace(/\/$/, '')}/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ chat_id: groupId, message: text }),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp bridge ${response.status}: ${await response.text()}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json') ? response.json() : { ok: true };
}
