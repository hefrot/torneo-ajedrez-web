export async function sendGroupMessage(
  text,
  {
    bridgeUrl = process.env.WHATSAPP_BRIDGE_URL,
    bridgeToken = process.env.WHATSAPP_BRIDGE_TOKEN,
    authHeader = process.env.WHATSAPP_BRIDGE_AUTH_HEADER || 'X-API-Key',
    groupId = process.env.WHATSAPP_GROUP_ID,
    fetchImpl = fetch,
  } = {},
) {
  if (!bridgeUrl || !groupId) {
    return { skipped: true, reason: 'WhatsApp bridge/group not configured' };
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
