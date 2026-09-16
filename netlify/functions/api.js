// netlify/functions/api.js
// Proxies /api/* → Render backend, stripping the Netlify function prefix.
//
// netlify.toml should contain:
//   [[redirects]]
//   from = "/api/*"
//   to   = "/.netlify/functions/api/:splat"
//   status = 200
//
// The function then receives paths like:
//   /.netlify/functions/api/fixtures
//   /.netlify/functions/api/health
// and forwards them as:
//   https://your-render-app.onrender.com/fixtures
//   https://your-render-app.onrender.com/health

const https = require('https');
const http  = require('http');
const { URL } = require('url');

const BACKEND_URL = (process.env.BACKEND_URL || '').replace(/\/+$/, '');

// The prefix Netlify prepends when a redirect hits this function.
// Matches both the standard path and the splat-style path.
const FUNCTION_PREFIX_RE = /^\/?\.netlify\/functions\/api\/?/;

exports.handler = async function(event) {
  // ── 1. Validate backend is configured ─────────────────────────────────────
  if (!BACKEND_URL) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'BACKEND_URL environment variable is not set.' }),
    };
  }

  // ── 2. Derive the upstream path ────────────────────────────────────────────
  // event.path  → the raw Netlify function path  e.g. /.netlify/functions/api/fixtures
  // event.rawPath is the same on newer runtimes; fall back to event.path.
  const rawPath = (event.rawPath || event.path || '/').split('?')[0];

  // Strip the function prefix so we get just "/fixtures", "/health", etc.
  const upstreamPath = '/' + rawPath.replace(FUNCTION_PREFIX_RE, '').replace(/^\/+/, '');

  // ── 3. Rebuild query string ────────────────────────────────────────────────
  const qs = event.queryStringParameters
    ? Object.entries(event.queryStringParameters)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')
    : '';

  const targetUrl = BACKEND_URL + upstreamPath + (qs ? `?${qs}` : '');

  // ── 4. Forward the request ─────────────────────────────────────────────────
  const method = (event.httpMethod || 'GET').toUpperCase();
  const body   = event.body
    ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64') : event.body)
    : null;

  // Forward a safe subset of request headers; drop host/connection.
  const SKIP_HEADERS = new Set(['host', 'connection', 'content-length', 'transfer-encoding']);
  const forwardHeaders = {};
  for (const [k, v] of Object.entries(event.headers || {})) {
    if (!SKIP_HEADERS.has(k.toLowerCase())) forwardHeaders[k] = v;
  }
  if (body) {
    forwardHeaders['content-length'] = Buffer.byteLength(body).toString();
  }

  try {
    const result = await makeRequest(targetUrl, method, forwardHeaders, body);
    return result;
  } catch (err) {
    console.error('[api.js] Upstream request failed:', err.message, '→', targetUrl);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Upstream request failed.', detail: err.message, target: targetUrl }),
    };
  }
};

// ── Minimal promise-based HTTP/HTTPS request ────────────────────────────────
function makeRequest(urlStr, method, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const lib    = parsed.protocol === 'https:' ? https : http;

    const opts = {
      hostname: parsed.hostname,
      port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path:     parsed.pathname + parsed.search,
      method,
      headers,
    };

    const req = lib.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw      = Buffer.concat(chunks);
        const isText   = /text|json|xml|javascript/.test(res.headers['content-type'] || '');
        const respBody = isText ? raw.toString('utf8') : raw.toString('base64');

        resolve({
          statusCode: res.statusCode,
          headers:    sanitiseResponseHeaders(res.headers),
          body:       respBody,
          isBase64Encoded: !isText,
        });
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Remove hop-by-hop headers that must not be forwarded to the client.
function sanitiseResponseHeaders(raw) {
  const HOP_BY_HOP = new Set([
    'connection', 'keep-alive', 'transfer-encoding', 'upgrade',
    'proxy-authenticate', 'proxy-authorization', 'te', 'trailers',
  ]);
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) out[k] = Array.isArray(v) ? v[0] : v;
  }
  // Allow the browser to call from any origin (Netlify frontend → same origin anyway).
  out['access-control-allow-origin'] = '*';
  return out;
}
