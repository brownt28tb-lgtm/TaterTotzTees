const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxiFs40EPlnVtlMtMornw_1Yua2apUhDG8_EqlIuTdva6tR-CqKAQFyD_57v-pKF0qP/exec';

async function readPayload(request) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    try { return JSON.parse(request.body); } catch {}
  }

  let raw = '';
  await new Promise((resolve, reject) => {
    request.on('data', chunk => { raw += chunk; });
    request.on('end', resolve);
    request.on('error', reject);
  });

  if (!raw) return {};
  return JSON.parse(raw);
}

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method === 'GET') {
    return response.status(200).json({ ok: true });
  }

  if (request.method !== 'POST') {
    return response.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const payload = await readPayload(request);

    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await upstream.text();
    let result;

    try {
      result = JSON.parse(text);
    } catch {
      return response.status(502).json({ ok: false, error: 'Order service unavailable' });
    }

    if (!upstream.ok || result?.ok !== true) {
      return response.status(502).json({ ok: false, error: 'Order service unavailable' });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Order submission failed:', error);
    return response.status(500).json({ ok: false, error: 'Unable to submit order right now' });
  }
};
