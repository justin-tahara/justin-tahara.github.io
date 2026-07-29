/**
 * SPA deep links for justintahara.com.
 *
 * GitHub Pages serves 404.html (a copy of index.html) for /city/*, /about,
 * /humans, /jasmine — with a 404 status, so search engines refuse to index
 * any gallery. This worker answers the known route set with the app shell and
 * a 200, and rewrites <title>/description/OG/canonical per route so crawlers
 * and link unfurlers (Slack, iMessage, Twitter) see the page being shared,
 * not the homepage. It also generates /sitemap.xml from the photo manifest.
 *
 * Scope: only the route patterns in worker.tf reach this script — the
 * homepage, /archive/ and static assets never pay the worker hop. Unknown
 * paths (e.g. a mistyped /city/ slug) pass through untouched, so GitHub
 * Pages keeps serving its 404. Any unexpected error also falls back to
 * pass-through: the failure mode is the status quo, never a broken site.
 *
 * Curation stays in the manifest (rolls + titles). The one duplicated
 * constant is SPECIAL_ROLLS — keep it in sync with assets/js/portfolio.js.
 */

const APEX = "https://justintahara.com";
const MANIFEST_URL = "https://images.justintahara.com/manifest.json";
const SPECIAL_ROLLS = ["jasmine"];

const SITE_TITLE = "Justin Tahara — photographs on film";
const DEFAULT_DESCRIPTION =
  "Film photography by Justin Tahara — city galleries from San Francisco to Tokyo, portraits from around the world.";
// same default as index.html's static og:image
const DEFAULT_IMAGE =
  "https://images.justintahara.com/rolls/san-francisco/000004150017-w1600.jpg";

export default {
  async fetch(request) {
    try {
      return await route(request);
    } catch (e) {
      // fail open: behave as if the worker route didn't exist
      return fetch(request);
    }
  },
};

async function route(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/sitemap.xml") return sitemap();

  const meta = await routeMeta(path);
  if (!meta) return fetch(request);

  // The shell subrequest goes to the homepage route, which no worker route
  // matches — no recursion. Cached at the edge so most hits skip the origin.
  const shell = await fetch(`${APEX}/`, {
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!shell.ok) return fetch(request);

  return new HTMLRewriter()
    .on("title", { element: (e) => e.setInnerContent(meta.title) })
    .on('meta[name="description"]', {
      element: (e) => e.setAttribute("content", meta.description),
    })
    .on('meta[property="og:title"]', {
      element: (e) => e.setAttribute("content", meta.title),
    })
    .on('meta[property="og:description"]', {
      element: (e) => e.setAttribute("content", meta.description),
    })
    .on('meta[property="og:url"]', {
      element: (e) => e.setAttribute("content", meta.url),
    })
    .on('meta[property="og:image"]', {
      element: (e) => e.setAttribute("content", meta.image),
    })
    .on('link[rel="canonical"]', {
      element: (e) => e.setAttribute("href", meta.url),
    })
    .transform(new Response(shell.body, shell));
}

async function routeMeta(path) {
  if (path === "/about") {
    return {
      title: "About — Justin Tahara",
      description:
        "About Justin Tahara — the photographer behind these film galleries.",
      url: `${APEX}/about`,
      image: DEFAULT_IMAGE,
    };
  }
  if (path === "/humans") {
    return {
      title: "Humans of the world — Justin Tahara",
      description: "Portraits of people around the world, shot on film.",
      url: `${APEX}/humans`,
      image: DEFAULT_IMAGE,
    };
  }

  const city = path.match(/^\/city\/([a-z0-9-]+)$/);
  const special = SPECIAL_ROLLS.find((s) => path === `/${s}`);
  const slug = city ? city[1] : special;
  if (!slug) return null;

  const m = await manifest();
  const photos = m.rolls[slug];
  if (!photos || !photos.length) return null; // unknown roll -> real 404
  if (city && SPECIAL_ROLLS.includes(slug)) return null;

  const title = (m.titles && m.titles[slug]) || slug;
  const first = photos[0].variants || {};
  return {
    title: `${title} — Justin Tahara`,
    description: `Photographs from ${title}, shot on film by Justin Tahara.`,
    url: `${APEX}${path}`,
    image: first["1600"] || Object.values(first)[0] || DEFAULT_IMAGE,
  };
}

async function sitemap() {
  const m = await manifest();
  const paths = ["/", "/about", "/humans"];
  for (const slug of Object.keys(m.rolls).sort()) {
    paths.push(SPECIAL_ROLLS.includes(slug) ? `/${slug}` : `/city/${slug}`);
  }
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    paths.map((p) => `  <url><loc>${APEX}${p}</loc></url>`).join("\n") +
    "\n</urlset>\n";
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

async function manifest() {
  const res = await fetch(MANIFEST_URL, {
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`manifest.json ${res.status}`);
  return res.json();
}
