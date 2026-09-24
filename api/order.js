const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyhm8ztvbedVlKUfqIZJ2r-WtckrHy80DP92eqrYU5RgsSpOU-8Nb6iH9C5n-WKgz37/exec';

module.exports = async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');

  if (request.method !== 'POST') {
    return response.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const payload = request.body || {};

    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await upstream.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch {
      return response.status(502).json({
        ok: false,
        error: 'Order service returned an invalid response',
      });
    }

    if (!upstream.ok || result?.ok !== true) {
      return response.status(502).json({
        ok: false,
        error: result?.error || 'Order service rejected the submission',
      });
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error('Order submission failed:', error);
    return response.status(500).json({
      ok: false,
      error: 'Unable to submit order right now',
    });
  }
};
