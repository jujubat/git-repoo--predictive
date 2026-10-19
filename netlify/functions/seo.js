const allowed = (path) =>
  path === "/today" ||
  path === "/weekend" ||
  path === "/football" ||
  ["/football/", "/team/", "/player/", "/match/"]
    .some(prefix => path.startsWith(prefix));

exports.handler = async (event) => {
  const qs = event.queryStringParameters || {};
  let target = String(qs.path || "/");

  if (!target.startsWith("/")) target = "/" + target;
  target = target.split("?")[0];

  if (
    !allowed(target) ||
    target.includes("..") ||
    target.includes("\\") ||
    target.includes("//")
  ) {
    return {
      statusCode: 404,
      body: "SEO page not found"
    };
  }

  const backend = String(
    process.env.BACKENDURL ||
    process.env.KASISCORE_BACKEND_URL ||
    ""
  ).replace(/\/+$/, "");

  if (!/^https:\/\//i.test(backend)) {
    return {
      statusCode: 503,
      body: "SEO rendering temporarily unavailable"
    };
  }

  try {
    const response = await fetch(
      `${backend}/seo/render?path=${encodeURIComponent(target)}`,
      { headers: { Accept: "text/html" } }
    );

    if (response.status === 404) {
      return {
        statusCode: 404,
        body: "SEO page not found"
      };
    }

    if (!response.ok) {
      return {
        statusCode: 503,
        body: "SEO rendering temporarily unavailable"
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "public, max-age=0, s-maxage=60",
        "X-KasiScore-Rendering": "server"
      },
      body: await response.text()
    };
  } catch (error) {
    console.error("SEO renderer unavailable:", error.message);
    return {
      statusCode: 503,
      body: "SEO rendering temporarily unavailable"
    };
  }
};
