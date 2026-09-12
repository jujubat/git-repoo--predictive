const fs = require("fs");
const path = require("path");

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  let target = qs.path || "/";
  if (!target.startsWith("/")) target = "/" + target;
  target = target.split("?")[0] || "/";

  const backend = (process.env.BACKENDURL || "").replace(/\/+$/, "");
  if (backend) {
    try {
      const r = await fetch(`${backend}/seo/render?path=${encodeURIComponent(target)}`, {
        headers: { "Accept": "text/html" },
      });
      if (r.ok) {
        return {
          statusCode: 200,
          headers: {
            "Content-Type": "text/html; charset=UTF-8",
            "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
            "X-KasiScore-Rendering": "server",
          },
          body: await r.text(),
        };
      }
    } catch (e) {
      console.warn("KasiScore SSR backend unavailable:", e.message);
    }
  }

  const indexPath = path.join(process.cwd(), "index.html");
  const html = fs.readFileSync(indexPath, "utf8");
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "public, max-age=60",
      "X-KasiScore-Rendering": "spa-fallback",
    },
    body: html,
  };
};
