const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyhm8ztvbedVlKUfqIZJ2r-WtckrHy80DP92eqrYU5RgsSpOU-8Nb6iH9C5n-WKgz37/exec';

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
      console.error('Apps Script rejected order:', {
        status: upstream.status,
        result
      });
      return response.status(502).json({
        ok: false,
        error: result?.error || ('Google order service returned HTTP ' + upstream.status)
      });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Order submission failed:', error);
    return response.status(500).json({ ok: false, error: 'Unable to submit order right now' });
  }
};
