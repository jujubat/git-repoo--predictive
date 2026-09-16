// netlify/functions/api.js
// Proxies /api/* requests to the Render FastAPI backend.
// Set BACKEND_URL in Netlify environment to your Render service URL.
// e.g. BACKEND_URL=https://kasiscore-server.onrender.com

exports.handler = async function(event, context) {
  const BACKEND = (process.env.BACKEND_URL || '').replace(/\/+$/, '');
  
  if (!BACKEND) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'BACKEND_URL not configured',
        message: 'Set BACKEND_URL in Netlify environment variables to your Render server URL.'
      })
    };
  }

  // path comes from the :splat capture in netlify.toml
  // event.path is like /.netlify/functions/api/fixtures?league=ALL
  // We need to extract the part after /api/
  const rawPath = event.path || '';
  const splat = rawPath.replace(/^\/?\.netlify\/functions\/api\/?/, '');
  
  const qs = event.rawQuery ? '?' + event.rawQuery : '';
  const targetUrl = `${BACKEND}/${splat}${qs}`;
  
  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(event.httpMethod) ? event.body : undefined,
    });
    
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();
    
    return {
      statusCode: response.status,
      headers: {
        'Content-Type': contentType || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Cache-Control': response.headers.get('cache-control') || 'no-cache',
      },
      body,
    };
  } catch (err) {
    console.error('Proxy error:', err);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Backend unreachable',
        message: `Could not reach ${BACKEND}. Is the Render service running?`,
        detail: err.message 
      }),
    };
  }
};
