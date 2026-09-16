/* KasiScore — Netlify same-origin API proxy
 * Routes /api/* → FastAPI backend (set BACKENDURL in Netlify env vars)
 * Local development: open index.html directly — the browser auto-detects
 * localhost and calls http://127.0.0.1:8000 directly (no proxy needed).
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: ''
    };
  }

  const backend = String(process.env.BACKENDURL || '').replace(/\/+$/, '');
  if (!backend) {
    console.error('[KasiScore] BACKENDURL env var is not set in Netlify.');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'BACKENDURL is not configured.',
        hint: 'Go to Netlify → Site configuration → Environment variables → add BACKENDURL = https://your-fastapi-server.com'
      })
    };
  }

  let path = event.path || '/api';
  path = path.replace(/^\/api(?:\/|$)/, '/');
  if (!path.startsWith('/')) path = '/' + path;
  const qs = event.rawQuery ? '?' + event.rawQuery : '';
  const target = backend + path + qs;

  try {
    const init = {
      method: event.httpMethod,
      headers: {
        'Accept': 'application/json',
        'Content-Type': event.headers?.['content-type'] || event.headers?.['Content-Type'] || 'application/json'
      }
    };
    if (!['GET', 'HEAD'].includes(event.httpMethod) && event.body) {
      init.body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body;
    }
    const r = await fetch(target, init);
    const body = await r.text();
    return {
      statusCode: r.status,
      headers: {
        'Content-Type': r.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*'
      },
      body
    };
  } catch (e) {
    console.error('[KasiScore] API proxy error:', e);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Backend unavailable', detail: e.message, backend })
    };
  }
};
