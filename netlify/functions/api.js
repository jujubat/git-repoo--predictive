// netlify/functions/api.js
// Proxies /api/* to the Render FastAPI backend.
// Set BACKEND_URL in Netlify environment variables.

exports.handler = async function(event, context) {
  const BACKEND = (process.env.BACKEND_URL || '').replace(/\/+$/, '');

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
      body: '',
    };
  }

  if (!BACKEND) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'BACKEND_URL not configured',
        message: 'Set BACKEND_URL in Netlify environment variables to your Render server URL.',
      }),
    };
  }

  // Extract the path after /.netlify/functions/api/
  // event.path = "/.netlify/functions/api/health" → we want "health"
  // event.path = "/.netlify/functions/api/fixtures" → we want "fixtures"
  const rawPath = event.path || '';
  const splat = rawPath
    .replace(/^\/?\.netlify\/functions\/api\/?/, '')
    .replace(/^\/+/, '');

  const qs = event.rawQuery ? '?' + event.rawQuery : '';
  const targetUrl = `${BACKEND}/${splat}${qs}`;

  console.log(`[api.js] ${event.httpMethod} ${targetUrl}`);

  try {
    const fetchOptions = {
      method: event.httpMethod || 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };

    if (['POST', 'PUT', 'PATCH'].includes(event.httpMethod) && event.body) {
      fetchOptions.body = event.body;
    }

    // Forward Authorization header if present (for auth endpoints)
    if (event.headers && event.headers['authorization']) {
      fetchOptions.headers['Authorization'] = event.headers['authorization'];
    }

    const response = await fetch(targetUrl, fetchOptions);
    const contentType = response.headers.get('content-type') || 'application/json';
    const body = await response.text();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Cache-Control': response.headers.get('cache-control') || 'no-cache',
      },
      body,
    };
  } catch (err) {
    console.error('[api.js] Proxy error:', err.message);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Backend unreachable',
        message: `Could not reach ${BACKEND}. Is the Render service running?`,
        detail: err.message,
        targetUrl,
      }),
    };
  }
};
