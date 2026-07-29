/* Justin Tahara — film photography portfolio.
 *
 * A no-build single-page site: every view (home index, city galleries,
 * Humans of the world, About) renders client-side from the R2 manifest at
 * https://images.justintahara.com/manifest.json (written by
 * scripts/sync-photos.sh). 404.html is a byte-identical copy of index.html so
 * GitHub Pages serves this app for deep links like /city/tokyo-kanto.
 *
 * Aspect ratios: the manifest's width/height (or the baked fallback in
 * assets/data/photo-ratios.json) become <img width height> so the masonry
 * reserves space and never shifts as scans load.
 */

const MANIFEST_URL = 'https://images.justintahara.com/manifest.json';
const RATIOS_URL = '/assets/data/photo-ratios.json';

const CONTACT = {
  instagram: 'https://www.instagram.com/justintahara/',
  github: 'https://github.com/justin-tahara',
  linkedin: 'https://www.linkedin.com/in/justintahara/',
  email: 'mailto:justintahara@gmail.com',
};

/* Curated hero shot per roll (stem). Change a stem here to change a cover;
   anything unlisted falls back to the roll's first landscape frame. */
const COVERS = {
  'san-francisco': '000094330016',            // Golden Gate from the headlands
  'norcal-coast': '8027961_8027961-R1-010-3A', // McWay Falls, Big Sur
  'tahoe': '000004160013',                    // Emerald Bay
  'los-angeles': '35A_0407',                  // downtown skyline
  'san-diego': '_16_0163_Original',           // Scripps pier
  'hawaii': '000058140030',                   // sunset over the water
  'vancouver-banff': '000028060014',          // Banff Springs below the peak
  'chicago': '000058130009',                  // Wrigley Field marquee
  'boston': '000094320002',                   // downtown, golden hour
  'new-york': 'NY-FILM-06',                   // lower Manhattan from the water
  'tokyo-kanto': '000008950016',              // temple under the green mountain
  'kyoto-nara': '1962949_1962949-R5-062-29A', // Byōdō-in reflected
  'nagano': '000008930017',                   // trains at the platform
  'taiwan': '7838965_7838965-R3-039-18',      // Jiufen teahouse
  'europe': '8510935_8510935-R4-036-16A',     // Salzburg from above
};
const HUMANS_COVER = 'tokyo-kanto/000008950028'; // the two gentlemen, Tokyo

/* Photos filed under the wrong roll in R2 — reassigned client-side until the
   next full re-sync moves the objects. Key: "roll/stem" -> correct roll. */
const ROLL_OVERRIDES = {
  'san-francisco/000004160034': 'los-angeles', // Dodger Stadium
};

/* Pulled out of its roll entirely; rendered as the About page portrait. */
const ABOUT_PORTRAIT = 'san-diego/IMG_2801';

/* Rolls with their own section: kept out of the city list and home grid,
   linked from the colophon between Humans and About at /<slug>. */
const SPECIAL_ROLLS = ['jasmine'];

/* Sidebar order: US west to east, then Japan / Asia, then Europe.
   Rolls added to the manifest later are appended alphabetically. */
const NAV_ORDER = [
  'san-francisco', 'norcal-coast', 'tahoe', 'los-angeles', 'san-diego',
  'hawaii', 'vancouver-banff', 'chicago', 'boston', 'new-york',
  'tokyo-kanto', 'kyoto-nara', 'nagano', 'taiwan', 'europe',
];

const app = document.getElementById('app');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let data = null; // { rolls: {slug: [photo]}, titles: {slug: name}, order: [slug] }

/* ---------- utilities ---------- */

const esc = (s) => String(s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function photoRatio(p) {
  if (p.width && p.height) return [p.width, p.height];
  return p._baked || null;
}

/* Smallest-first list of [width, url] sources for a photo. */
function sources(p) {
  const s = Object.entries(p.variants || {})
    .map(([w, url]) => [Number(w), url])
    .sort((a, b) => a[0] - b[0]);
  s.push([p.width || 99999, p.original]);
  return s;
}

function srcset(p) {
  return sources(p).map(([w, url]) => `${url} ${w}w`).join(', ');
}

/* Preferred single src: the ~1600px variant if it exists, else the original. */
function mainSrc(p) {
  return (p.variants && p.variants['1600']) || p.original;
}

function imgAttrs(p, sizes, { eager = false } = {}) {
  const r = photoRatio(p);
  const dims = r ? ` width="${r[0]}" height="${r[1]}"` : '';
  const loading = eager ? '' : ' loading="lazy"';
  return `src="${esc(mainSrc(p))}" srcset="${esc(srcset(p))}" sizes="${sizes}"${dims}${loading} decoding="async"`;
}

/* ---------- data ---------- */

/* On localhost, a gitignored /manifest.json at the repo root wins — lets
   unpublished or still-cached rolls be previewed before they're live. */
async function fetchManifest() {
  if (location.hostname === 'localhost') {
    const local = await fetch('/manifest.json').catch(() => null);
    if (local && local.ok && (local.headers.get('content-type') || '').includes('json')) return local.json();
  }
  return fetch(MANIFEST_URL).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
}

async function loadData() {
  const [manifest, ratios] = await Promise.all([
    fetchManifest(),
    fetch(RATIOS_URL).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);

  const rolls = {};
  let aboutPortrait = null;
  for (const [slug, photos] of Object.entries(manifest.rolls)) {
    for (const p of photos) {
      const key = `${slug}/${p.stem}`;
      p._baked = ratios[key] || null;
      if (key === ABOUT_PORTRAIT) { p._roll = slug; aboutPortrait = p; continue; }
      const target = ROLL_OVERRIDES[key] || slug;
      p._roll = target;
      (rolls[target] = rolls[target] || []).push(p);
    }
  }

  const slugs = Object.keys(rolls).filter((s) => !SPECIAL_ROLLS.includes(s));
  const order = NAV_ORDER.filter((s) => slugs.includes(s))
    .concat(slugs.filter((s) => !NAV_ORDER.includes(s))
      .sort((a, b) => (manifest.titles[a] || a).localeCompare(manifest.titles[b] || b)));

  data = { rolls, titles: manifest.titles, order, aboutPortrait };
}

const rollTitle = (slug) => (data.titles[slug] || slug);

function humansPhotos() {
  return data.order.flatMap((slug) =>
    data.rolls[slug].filter((p) => (p.tags || []).includes('humans')));
}

/* Cover for a roll: the curated pick, else first landscape frame, else first. */
function coverPhoto(photos, curatedStem) {
  return (curatedStem && photos.find((p) => p.stem === curatedStem))
    || photos.find((p) => { const r = photoRatio(p); return r && r[0] > r[1]; })
    || photos[0];
}

/* ---------- shared chrome ---------- */

function navListHTML(active) {
  const cities = data.order.map((slug) =>
    `<a href="/city/${esc(slug)}" data-nav${slug === active ? ' class="is-active" aria-current="page"' : ''}>${esc(rollTitle(slug))}</a>`).join('');
  const specials = SPECIAL_ROLLS.filter((s) => data.rolls[s]).map((s) =>
    `<a href="/${esc(s)}" data-nav class="about-link${s === active ? ' is-active' : ''}"${s === active ? ' aria-current="page"' : ''}>${esc(rollTitle(s))}</a>`).join('');
  return `
    <nav class="cities" aria-label="Galleries">${cities}</nav>
    <div class="rule rule-mid"></div>
    <a href="/humans" data-nav class="section-link${active === 'humans' ? ' is-active' : ''}"${active === 'humans' ? ' aria-current="page"' : ''}>Humans <span class="of">of the world</span></a>
    ${specials}
    <a href="/about" data-nav class="about-link${active === 'about' ? ' is-active' : ''}"${active === 'about' ? ' aria-current="page"' : ''}>About</a>`;
}

function contactHTML() {
  return `<div class="contact"><a href="${CONTACT.instagram}" rel="me">Instagram</a> · <a href="${CONTACT.email}">Email</a><br>© Justin Tahara</div>`;
}

function sidebarHTML(active) {
  return `
    <aside class="colophon">
      <div>
        <a href="/" data-nav class="wordmark-link"><div class="wordmark">Justin<br>Tahara</div></a>
        <div class="tagline">photographs on film</div>
      </div>
      <div class="rule rule-top"></div>
      ${navListHTML(active)}
      <div class="spacer"></div>
      ${contactHTML()}
    </aside>`;
}

function topbarHTML(active) {
  return `
    <header class="topbar">
      <a href="/" data-nav class="wordmark-link"><div class="wordmark">Justin Tahara</div></a>
      <button type="button" class="menu-btn" id="menuOpen" aria-haspopup="true">Menu</button>
    </header>
    <div class="menu-overlay" id="menuOverlay">
      <div class="menu-head">
        <div class="wordmark">Justin Tahara</div>
        <button type="button" class="menu-btn" id="menuClose">Close</button>
      </div>
      ${navListHTML(active)}
      ${contactHTML()}
    </div>`;
}

/* ---------- views ---------- */

function renderHome() {
  const cells = data.order.map((slug) => {
    const cover = coverPhoto(data.rolls[slug], COVERS[slug]);
    return `
      <a class="cover will-reveal" href="/city/${esc(slug)}" data-nav>
        <div class="cover-img"><img ${imgAttrs(cover, '(max-width: 480px) 92vw, (max-width: 800px) 46vw, (max-width: 1100px) 31vw, 24vw')} alt="${esc(rollTitle(slug))} — film photographs"></div>
        <div class="cover-name">${esc(rollTitle(slug))}</div>
      </a>`;
  });

  const humans = humansPhotos();
  if (humans.length) {
    const cover = humans.find((p) => `${p._roll}/${p.stem}` === HUMANS_COVER) || coverPhoto(humans);
    cells.push(`
      <a class="cover will-reveal" href="/humans" data-nav>
        <div class="cover-img"><img ${imgAttrs(cover, '(max-width: 480px) 92vw, (max-width: 800px) 46vw, (max-width: 1100px) 31vw, 24vw')} alt="Humans of the world — film portraits"></div>
        <div class="cover-name">Humans <span class="of">of the world</span></div>
      </a>`);
  }

  app.innerHTML = `
    <div class="home">
      <header class="home-head">
        <div>
          <div class="home-name">Justin Tahara</div>
          <div class="tagline">photographs on film</div>
        </div>
        <nav class="home-menu" aria-label="Site">
          <a href="/about" data-nav>About</a><span class="dot">·</span><a href="${CONTACT.instagram}" rel="me">Instagram</a><span class="dot">·</span><a href="${CONTACT.email}">Email</a>
        </nav>
      </header>
      <main>
        <h1 class="visually-hidden">Justin Tahara — photographs on film</h1>
        <div class="covers">${cells.join('')}</div>
      </main>
      <footer class="home-foot">
        <svg class="foot-mark" viewBox="6 2 66 38" aria-hidden="true"><g transform="skewX(-7)" fill="currentColor"><polygon points="12,4 30,4 27,7 15,7"/><polygon points="31,5 31,20 28,17.5 28,8"/><polygon points="31,22 31,37 28,34 28,25"/><polygon points="30,38 12,38 15,35 27,35"/><polygon points="11,37 11,28 14,31 14,34"/><polygon points="42,4 68,4 65,7 45,7"/><polygon points="53,8 57,8 57,35 55,38 53,35"/></g></svg>
        <div>© Justin Tahara — shot on film since 2019</div>
      </footer>
    </div>`;

  document.title = 'Justin Tahara — photographs on film';
  afterRender();
}

function shotHTML(p, i, { line = null } = {}) {
  const label = p.place ? `Open photo: ${p.place}` : 'Open photo';
  return `
    <button type="button" class="shot will-reveal" data-shot="${i}" aria-label="${esc(label)}">
      <img ${imgAttrs(p, '(max-width: 560px) 92vw, (max-width: 900px) 45vw, 30vw', { eager: i < 6 })} alt="${esc(p.place || 'Film photograph')}">
      ${line ? `<div class="shot-line">${esc(line)}</div>` : ''}
    </button>`;
}

/* Masonry: distribute photos into the shortest column by known aspect ratio.
   Beats CSS columns, whose balancing strands photos on sparse rolls, and
   keeps reading order roughly left-to-right. */
const bpNarrow = window.matchMedia('(max-width: 560px)');
const bpMid = window.matchMedia('(max-width: 900px)');

function gridHTML(photos, { humans = false } = {}) {
  const n = bpNarrow.matches ? 1 : bpMid.matches ? 2 : 3;
  const cols = Array.from({ length: n }, () => ({ h: 0, html: [] }));
  photos.forEach((p, i) => {
    const r = photoRatio(p);
    const ar = r ? r[1] / r[0] : 0.75; // photo height in column-width units
    const col = cols.reduce((best, c) => (c.h < best.h ? c : best));
    col.html.push(shotHTML(p, i, { line: humans ? p.place : null }));
    col.h += ar + (humans ? 0.14 : 0.04); // + caption line / gutter
  });
  return cols.map((c) => `<div class="grid-col">${c.html.join('')}</div>`).join('');
}

/* `title` is plain text (document.title, lightbox counter); `headingHTML`
   optionally overrides the styled gallery heading. */
function renderGallery(active, title, photos, { humans = false, headingHTML = null } = {}) {
  app.innerHTML = `
    <div class="page">
      ${sidebarHTML(active)}
      <div class="stage">
        ${topbarHTML(active)}
        <main class="stage-inner">
          <div class="city-head"><h1>${headingHTML || esc(title)}</h1></div>
          <div class="grid" id="grid">${gridHTML(photos, { humans })}</div>
        </main>
      </div>
    </div>`;

  const grid = document.getElementById('grid');
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-shot]');
    if (b) openLightbox(photos, Number(b.dataset.shot), title, { humans, trigger: b });
  });

  afterRender();
}

function renderCity(slug) {
  renderGallery(slug, rollTitle(slug), data.rolls[slug]);
  document.title = `${rollTitle(slug)} — Justin Tahara`;
}

function renderHumans() {
  renderGallery('humans', 'Humans of the world', humansPhotos(), {
    humans: true,
    headingHTML: 'Humans <span style="text-transform:none;letter-spacing:.02em;font-style:italic;">of the world</span>',
  });
  document.title = 'Humans of the world — Justin Tahara';
}

function renderAbout() {
  const portrait = data.aboutPortrait;
  const portraitHTML = portrait ? `
    <figure class="about-portrait">
      <img ${imgAttrs(portrait, '(max-width: 700px) 92vw, 280px', { eager: true })} alt="Justin, mid-bite at a restaurant">
      <figcaption>${esc(portrait.place || '')}, mid-bite</figcaption>
    </figure>` : '';

  app.innerHTML = `
    <div class="page">
      ${sidebarHTML('about')}
      <div class="stage">
        ${topbarHTML('about')}
        <main class="stage-inner">
          <div class="about-col">
            <h1>About</h1>
            <div class="about-sub">photographs on film, since 2019</div>
            ${portraitHTML}
            <p>I'm Justin. I'm an infrastructure engineer, and I like shooting film —
            this site is what happened when those two things collided. If you're
            curious how it works under the hood, it's all on my
            <a href="${CONTACT.github}">GitHub</a>.</p>
            <p>Everything here was shot on 35mm in places I've lived and traveled,
            and scanned straight off the negative.</p>
            <p>Barcelona, Borussia Dortmund, and the Dodgers are my teams. That
            should explain all the stadiums.</p>
            <p>Want a print of something? <a href="${CONTACT.email}">Email me</a>.</p>
            <div class="rule"></div>
            <nav class="elsewhere" aria-label="Elsewhere">
              <a href="${CONTACT.instagram}" rel="me">Instagram</a><span class="dot">·</span><a href="${CONTACT.email}">Email</a><span class="dot">·</span><a href="${CONTACT.github}">GitHub</a><span class="dot">·</span><a href="${CONTACT.linkedin}">LinkedIn</a>
            </nav>
          </div>
        </main>
      </div>
    </div>`;

  document.title = 'About — Justin Tahara';
  afterRender();
}

function renderError() {
  app.innerHTML = `
    <div class="home">
      <header class="home-head">
        <div>
          <div class="home-name">Justin Tahara</div>
          <div class="tagline">photographs on film</div>
        </div>
      </header>
      <p class="status-note">The photographs didn't load — <a href="">try again</a>,
      or <a href="${CONTACT.email}">write me</a> if it keeps happening.</p>
    </div>`;
}

/* ---------- post-render: reveals, image fades, mobile menu ---------- */

let revealObserver = null;

function afterRender() {
  // fade each scan in as it arrives
  app.querySelectorAll('img').forEach((img) => {
    if (img.complete && img.naturalWidth) img.classList.add('is-loaded');
    else img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
  });

  // scroll-reveal with a small stagger, gated on prefers-reduced-motion
  if (revealObserver) revealObserver.disconnect();
  const tiles = [...app.querySelectorAll('.will-reveal')];
  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    tiles.forEach((t) => t.classList.add('reveal'));
  } else {
    revealObserver = new IntersectionObserver((entries, obs) => {
      entries.filter((e) => e.isIntersecting).forEach((e, i) => {
        e.target.style.animationDelay = `${Math.min(i, 8) * 0.05}s`;
        e.target.classList.add('reveal');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px 60px' });
    tiles.forEach((t) => revealObserver.observe(t));
  }

  // mobile menu
  const overlay = document.getElementById('menuOverlay');
  if (overlay) {
    document.getElementById('menuOpen').addEventListener('click', () => {
      overlay.classList.add('open');
      overlay.querySelector('a, button').focus();
    });
    document.getElementById('menuClose').addEventListener('click', () => overlay.classList.remove('open'));
  }

  // move focus to the view for screen readers / keyboard users
  const h1 = app.querySelector('h1');
  if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
}

/* ---------- lightbox ---------- */

const lb = document.getElementById('lightbox');
const lbState = { photos: [], index: 0, context: '', humans: false, trigger: null, open: false };

function lbPhotoEl() { return document.getElementById('lbPhoto'); }

/* The variant the grid most likely loaded (mirrors the grid's sizes attr),
   so the lightbox underlay paints from cache instead of refetching w800. */
function gridVariant(p) {
  const frac = bpNarrow.matches ? 0.92 : bpMid.matches ? 0.45 : 0.3;
  const target = frac * window.innerWidth * (window.devicePixelRatio || 1);
  const s = sources(p);
  return (s.find(([w]) => w >= target) || s[s.length - 1])[1];
}

/* Real rendered CSS width of the mat-constrained photo — sizes="100vw"
   made the browser fetch far larger variants than it displayed. */
function lbSizes(p) {
  const narrow = bpNarrow.matches;
  const maxW = window.innerWidth - (narrow ? 44 : 130);
  const maxH = window.innerHeight - (narrow ? 168 : 210);
  const r = photoRatio(p);
  const w = r ? Math.min(maxW, maxH * (r[0] / r[1])) : maxW;
  return `${Math.max(1, Math.round(w))}px`;
}

/* Warm the exact candidate the <img> will select (same srcset + sizes).
   The Map keeps refs — an unreferenced Image can be GC'd mid-fetch. */
const preloaded = new Map();
function preload(p) {
  if (!p || preloaded.has(p.stem)) return;
  const img = new Image();
  img.sizes = lbSizes(p);
  img.srcset = srcset(p);
  preloaded.set(p.stem, img);
  if (preloaded.size > 24) preloaded.delete(preloaded.keys().next().value);
}

function lbRender() {
  const { photos, index, context, humans } = lbState;
  const p = photos[index];

  document.getElementById('lbCounter').textContent =
    `${context} · ${index + 1} / ${photos.length}`;

  const caption = document.getElementById('lbCaption');
  if (humans && p.name) {
    caption.innerHTML = `<span class="lb-name">${esc(p.name)}</span><span class="lb-line">${esc(p.place || '')}</span>`;
  } else {
    caption.textContent = p.place || '';
  }

  // Fresh <img> per photo (a reused one keeps showing the previous frame);
  // the cached w800 paints as background while the full size streams in.
  const old = lbPhotoEl();
  const img = document.createElement('img');
  img.id = 'lbPhoto';
  const r = photoRatio(p);
  if (r) { img.width = r[0]; img.height = r[1]; }
  img.alt = p.place || 'Film photograph';
  img.decoding = 'async';
  img.style.backgroundImage = `url("${gridVariant(p)}")`;
  img.sizes = lbSizes(p);
  img.srcset = srcset(p);
  old.replaceWith(img);

  preload(photos[(index + 1) % photos.length]);
  preload(photos[(index - 1 + photos.length) % photos.length]);
}

function openLightbox(photos, index, context, { humans = false, trigger = null } = {}) {
  Object.assign(lbState, { photos, index, context, humans, trigger, open: true });
  lb.classList.add('open');
  document.body.classList.add('lb-open');
  lbRender();
  document.getElementById('lbClose').focus();
}

function closeLightbox() {
  lbState.open = false;
  lb.classList.remove('open');
  document.body.classList.remove('lb-open');
  if (lbState.trigger && document.contains(lbState.trigger)) lbState.trigger.focus();
  lb.dispatchEvent(new CustomEvent('lb:closed'));
}

function lbStep(delta) {
  const n = lbState.photos.length;
  lbState.index = (lbState.index + delta + n) % n;
  lbRender();
}

function initLightbox() {
  document.getElementById('lbClose').addEventListener('click', closeLightbox);
  document.getElementById('lbPrev').addEventListener('click', () => lbStep(-1));
  document.getElementById('lbNext').addEventListener('click', () => lbStep(1));
  lb.addEventListener('click', (e) => {
    if (e.target === lb || e.target.classList.contains('lb-stagewrap')) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!lbState.open) return;
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') lbStep(-1);
    else if (e.key === 'ArrowRight') lbStep(1);
    else if (e.key === 'Tab') {
      // keep focus inside the dialog
      const focusables = [...lb.querySelectorAll('button')];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // swipe on touch
  let touchX = null;
  lb.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 44) lbStep(dx < 0 ? 1 : -1);
  }, { passive: true });
}

/* ---------- router ---------- */

function renderRoute() {
  if (lbState.open) closeLightbox();
  const path = location.pathname.replace(/\/+$/, '') || '/';

  if (path === '/') return renderHome();
  if (path === '/about') return renderAbout();
  if (path === '/humans') return renderHumans();

  const special = SPECIAL_ROLLS.find((s) => path === `/${s}` && data.rolls[s]);
  if (special) {
    renderGallery(special, rollTitle(special), data.rolls[special]);
    document.title = `${rollTitle(special)} — Justin Tahara`;
    return;
  }

  const city = path.match(/^\/city\/([a-z0-9-]+)$/);
  if (city && data.rolls[city[1]] && !SPECIAL_ROLLS.includes(city[1])) return renderCity(city[1]);

  // unknown path — the front door is the index
  history.replaceState(null, '', '/');
  return renderHome();
}

function transitionTo(fn) {
  if (reducedMotion.matches) {
    fn();
    return;
  }
  if (document.startViewTransition) {
    document.startViewTransition(fn);
    return;
  }
  // no View Transitions (e.g. Firefox): a quick manual cross-fade
  app.classList.add('fade-out');
  setTimeout(() => {
    fn();
    app.classList.remove('fade-out');
    app.classList.add('fade-in');
    setTimeout(() => app.classList.remove('fade-in'), 300);
  }, 170);
}

function navigate(href) {
  if (href === location.pathname) return;
  history.pushState(null, '', href);
  transitionTo(() => {
    renderRoute();
    window.scrollTo(0, 0);
  });
}

function initRouter() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-nav]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    navigate(a.getAttribute('href'));
  });

  window.addEventListener('popstate', () => transitionTo(renderRoute));

  // masonry column count is baked into the DOM — rebuild when a breakpoint
  // flips (deferred while the lightbox is up, e.g. a phone rotation)
  let pendingRelayout = false;
  const onBreakpoint = () => {
    if (!document.getElementById('grid')) return;
    if (lbState.open) { pendingRelayout = true; return; }
    renderRoute();
  };
  [bpNarrow, bpMid].forEach((q) => q.addEventListener('change', onBreakpoint));
  lb.addEventListener('lb:closed', () => {
    if (pendingRelayout) { pendingRelayout = false; onBreakpoint(); }
  });
}

/* ---------- boot ---------- */

(async function boot() {
  initLightbox();
  initRouter();
  try {
    await loadData();
  } catch (err) {
    renderError();
    return;
  }
  renderRoute();
})();
