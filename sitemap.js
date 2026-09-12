const fs = require('fs');
const path = require('path');

exports.handler = async () => {
  const backend = (process.env.BACKENDURL || '').replace(/\/+$/, '');
  if (backend) {
    try {
      const r = await fetch(`${backend}/seo/sitemap.xml`, { headers: { Accept: 'application/xml' } });
      if (r.ok) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/xml; charset=UTF-8',
            'Cache-Control': 'public, max-age=900, s-maxage=900, stale-while-revalidate=3600',
          },
          body: await r.text(),
        };
      }
    } catch (e) {
      console.warn('KasiScore sitemap backend unavailable:', e.message);
    }
  }
  const file = path.join(process.cwd(), 'sitemap.xml');
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/xml; charset=UTF-8', 'Cache-Control': 'public, max-age=900' },
    body: fs.readFileSync(file, 'utf8'),
  };
};
