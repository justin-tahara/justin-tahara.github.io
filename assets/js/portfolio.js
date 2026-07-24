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
  email: 'mailto:justintahara@gmail.com',
};

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

async function loadData() {
  const [manifest, ratios] = await Promise.all([
    fetch(MANIFEST_URL).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch(RATIOS_URL).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
  ]);

  const slugs = Object.keys(manifest.rolls);
  const order = NAV_ORDER.filter((s) => slugs.includes(s))
    .concat(slugs.filter((s) => !NAV_ORDER.includes(s))
      .sort((a, b) => (manifest.titles[a] || a).localeCompare(manifest.titles[b] || b)));

  for (const slug of slugs) {
    for (const p of manifest.rolls[slug]) {
      p._roll = slug;
      p._baked = ratios[`${slug}/${p.stem}`] || null;
    }
  }

  data = { rolls: manifest.rolls, titles: manifest.titles, order };
}

const rollTitle = (slug) => (data.titles[slug] || slug);

function humansPhotos() {
  return data.order.flatMap((slug) =>
    data.rolls[slug].filter((p) => (p.tags || []).includes('humans')));
}

/* Cover for a roll: first landscape frame (they crop to 3:2 best), else first. */
function coverPhoto(photos) {
  return photos.find((p) => { const r = photoRatio(p); return r && r[0] > r[1]; }) || photos[0];
}

/* ---------- shared chrome ---------- */

function navListHTML(active) {
  const cities = data.order.map((slug) =>
    `<a href="/city/${esc(slug)}" data-nav${slug === active ? ' class="is-active" aria-current="page"' : ''}>${esc(rollTitle(slug))}</a>`).join('');
  return `
    <nav class="cities" aria-label="Galleries">${cities}</nav>
    <div class="rule rule-mid"></div>
    <a href="/humans" data-nav class="section-link${active === 'humans' ? ' is-active' : ''}"${active === 'humans' ? ' aria-current="page"' : ''}>Humans <span class="of">of the world</span></a>
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
    const cover = coverPhoto(data.rolls[slug]);
    return `
      <a class="cover will-reveal" href="/city/${esc(slug)}" data-nav>
        <div class="cover-img"><img ${imgAttrs(cover, '(max-width: 480px) 92vw, (max-width: 800px) 46vw, (max-width: 1100px) 31vw, 24vw')} alt="${esc(rollTitle(slug))} — film photographs"></div>
        <div class="cover-name">${esc(rollTitle(slug))}</div>
      </a>`;
  });

  const humans = humansPhotos();
  if (humans.length) {
    cells.push(`
      <a class="cover will-reveal" href="/humans" data-nav>
        <div class="cover-img"><img ${imgAttrs(coverPhoto(humans), '(max-width: 480px) 92vw, (max-width: 800px) 46vw, (max-width: 1100px) 31vw, 24vw')} alt="Humans of the world — film portraits"></div>
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
      <footer class="home-foot">© Justin Tahara — shot on film since 2019</footer>
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

function renderGallery(active, heading, photos, { humans = false } = {}) {
  app.innerHTML = `
    <div class="page">
      ${sidebarHTML(active)}
      <div class="stage">
        ${topbarHTML(active)}
        <main class="stage-inner">
          <div class="city-head"><h1>${heading}</h1></div>
          <div class="grid" id="grid">
            ${photos.map((p, i) => shotHTML(p, i, { line: humans ? p.place : null })).join('')}
          </div>
        </main>
      </div>
    </div>`;

  const grid = document.getElementById('grid');
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-shot]');
    if (b) openLightbox(photos, Number(b.dataset.shot), heading, { humans, trigger: b });
  });

  afterRender();
}

function renderCity(slug) {
  const photos = data.rolls[slug];
  renderGallery(slug, esc(rollTitle(slug)), photos);
  document.title = `${rollTitle(slug)} — Justin Tahara`;
}

function renderHumans() {
  renderGallery('humans', 'Humans <span style="text-transform:none;letter-spacing:.02em;font-style:italic;">of the world</span>', humansPhotos(), { humans: true });
  document.title = 'Humans of the world — Justin Tahara';
}

function renderAbout() {
  app.innerHTML = `
    <div class="page">
      ${sidebarHTML('about')}
      <div class="stage">
        ${topbarHTML('about')}
        <main class="stage-inner">
          <div class="about-col">
            <h1>About</h1>
            <div class="about-sub">photographs on film, since 2019</div>
            <p>I shoot film — mostly 35mm, mostly while walking. The photographs here
            were made in the places I've lived and the places I've been lucky to wander:
            up and down the California coast, across the States, and through Japan,
            Taiwan, and Europe.</p>
            <p>Everything on this site is scanned from the negative and left largely
            alone. The grain, the missed exposures, the colors that aren't quite
            true — that's the point.</p>
            <p>By day I'm a software engineer. Prints of any photograph are available —
            write me.</p>
            <div class="rule"></div>
            <nav class="elsewhere" aria-label="Elsewhere">
              <a href="${CONTACT.instagram}" rel="me">Instagram</a><span class="what">most new work lands here first</span><br>
              <a href="${CONTACT.email}">Email</a><span class="what">prints, questions, anything</span><br>
              <a href="${CONTACT.github}">GitHub</a><span class="what">the software side</span><br>
              <a href="/archive/">Résumé site</a><span class="what">the previous version of this site</span>
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
      <p class="status-note">The photographs didn't load — please try again in a moment,
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

function preload(p) {
  if (!p) return;
  const img = new Image();
  img.src = mainSrc(p);
}

function lbRender() {
  const { photos, index, context, humans } = lbState;
  const p = photos[index];

  document.getElementById('lbCounter').textContent =
    `${context.replace(/<[^>]*>/g, '')} · ${index + 1} / ${photos.length}`;

  const caption = document.getElementById('lbCaption');
  if (humans && p.name) {
    caption.innerHTML = `<span class="lb-name">${esc(p.name)}</span><span class="lb-line">${esc(p.place || '')}</span>`;
  } else {
    caption.textContent = p.place || '';
  }

  const img = lbPhotoEl();
  img.classList.remove('is-loaded');
  const r = photoRatio(p);
  if (r) { img.width = r[0]; img.height = r[1]; }
  img.alt = p.place || 'Film photograph';
  img.sizes = '100vw';
  img.srcset = srcset(p);
  img.src = mainSrc(p);
  if (img.complete && img.naturalWidth) img.classList.add('is-loaded');

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

  const img = lbPhotoEl();
  img.addEventListener('load', () => img.classList.add('is-loaded'));

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

  const city = path.match(/^\/city\/([a-z0-9-]+)$/);
  if (city && data.rolls[city[1]]) return renderCity(city[1]);

  // unknown path — the front door is the index
  history.replaceState(null, '', '/');
  return renderHome();
}

function transitionTo(fn) {
  if (reducedMotion.matches || !document.startViewTransition) {
    fn();
    return;
  }
  document.startViewTransition(fn);
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
