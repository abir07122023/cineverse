/* ============================================================
   CINEVERSE - Advanced Movie Streaming Platform
   ============================================================ */

// Removed exposed TMDB_KEY – now using secure proxy
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

// ─── SECURE TMDB FUNCTION (calls Vercel proxy) ──────────────
async function tmdb(endpoint, params = {}) {
  const queryParams = new URLSearchParams({ endpoint, ...params }).toString();
  const proxyUrl = `/api/tmdb-proxy?${queryParams}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`TMDB proxy error: ${res.status}`);
  return res.json();
}

// ─── EMBED SERVERS (unchanged) ──────────────────────────────
const EMBED_SOURCES = [
  {
    id: 'vidlink',
    label: 'VidLink Pro',
    url: (id, type = 'movie', season = 1, episode = 1) => type === 'tv'
      ? `https://vidlink.pro/tv/${id}/${season}/${episode}?autoplay=true&primaryColor=e50914`
      : `https://vidlink.pro/movie/${id}?autoplay=true&primaryColor=e50914`,
    priority: 1
  },
  {
    id: 'embed-su',
    label: 'Embed.su',
    url: (id, type = 'movie', season = 1, episode = 1) => type === 'tv'
      ? `https://embed.su/embed/tv/${id}/${season}/${episode}`
      : `https://embed.su/embed/movie/${id}`,
    priority: 1
  },
  {
    id: 'autoembed',
    label: 'AutoEmbed',
    url: (id, type = 'movie', season = 1, episode = 1) => type === 'tv'
      ? `https://player.autoembed.cc/embed/tv/${id}/${season}/${episode}`
      : `https://player.autoembed.cc/embed/movie/${id}`,
    priority: 1
  },
  {
    id: 'vidsrcme',
    label: 'VidSrc.Me',
    url: (id, type = 'movie', season = 1, episode = 1) => type === 'tv'
      ? `https://vidsrc.me/embed/tv/${id}/${season}/${episode}`
      : `https://vidsrc.me/embed/movie/${id}`,
    priority: 1
  },
  {
    id: 'vidsrcxyz',
    label: 'VidSrc.xyz',
    url: (id, type = 'movie', season = 1, episode = 1) => type === 'tv'
      ? `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${season}&episode=${episode}`
      : `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
    priority: 2
  },
  {
    id: 'multiembed',
    label: 'MultiEmbed',
    url: (id, type = 'movie', season = 1, episode = 1) => type === 'tv'
      ? `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1&s=${season}&e=${episode}`
      : `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1`,
    priority: 2
  },
  {
    id: '2embed',
    label: '2Embed',
    url: (id, type = 'movie', season = 1, episode = 1) => type === 'tv'
      ? `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`
      : `https://www.2embed.cc/embed/${id}`,
    priority: 2
  },
  {
    id: 'smashystream',
    label: 'SmashyStream',
    url: (id, type = 'movie', season = 1, episode = 1) => type === 'tv'
      ? `https://player.smashy.stream/tv/${id}?s=${season}&e=${episode}`
      : `https://player.smashy.stream/movie/${id}`,
    priority: 3
  },
  {
    id: 'superembed',
    label: 'SuperEmbed',
    url: (id, type = 'movie', season = 1, episode = 1) => type === 'tv'
      ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`
      : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
    priority: 3
  }
];

const QUALITY_OPTIONS = [
  { id: 'auto', label: 'Auto', value: 'auto' },
  { id: '1080p', label: '1080p HD', value: '1080' },
  { id: '720p', label: '720p HD', value: '720' },
  { id: '480p', label: '480p', value: '480' },
  { id: '360p', label: '360p', value: '360' }
];

const CAPTION_OPTIONS = [
  { id: 'off', label: 'Off', code: null },
  { id: 'en', label: 'English', code: 'en' },
  { id: 'es', label: 'Spanish', code: 'es' },
  { id: 'fr', label: 'French', code: 'fr' },
  { id: 'de', label: 'German', code: 'de' },
  { id: 'it', label: 'Italian', code: 'it' },
  { id: 'pt', label: 'Portuguese', code: 'pt' },
  { id: 'ru', label: 'Russian', code: 'ru' },
  { id: 'ja', label: 'Japanese', code: 'ja' },
  { id: 'ko', label: 'Korean', code: 'ko' },
  { id: 'zh', label: 'Chinese', code: 'zh' },
  { id: 'ar', label: 'Arabic', code: 'ar' },
  { id: 'hi', label: 'Hindi', code: 'hi' }
];

// ─── CACHING SYSTEM ───────────────────────────────────────────
const CACHE_CONFIG = {
  EPISODES_KEY: 'cineverse_episodes_cache',
  SERVER_HEALTH_KEY: 'cineverse_server_health',
  CACHE_DURATION: 24 * 60 * 60 * 1000,
  HEALTH_DURATION: 6 * 60 * 60 * 1000,
  MAX_FAILURES: 3
};

function getCachedEpisodes(tvId, season) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_CONFIG.EPISODES_KEY) || '{}');
    const key = `${tvId}_s${season}`;
    if (cache[key] && Date.now() - cache[key].timestamp < CACHE_CONFIG.CACHE_DURATION) {
      return cache[key].data;
    }
  } catch (e) {}
  return null;
}

function setCachedEpisodes(tvId, season, episodeData) {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_CONFIG.EPISODES_KEY) || '{}');
    cache[`${tvId}_s${season}`] = { data: episodeData, timestamp: Date.now() };
    localStorage.setItem(CACHE_CONFIG.EPISODES_KEY, JSON.stringify(cache));
  } catch (e) {}
}

function recordServerFailure(serverId) {
  try {
    const health = JSON.parse(localStorage.getItem(CACHE_CONFIG.SERVER_HEALTH_KEY) || '{}');
    if (!health[serverId]) health[serverId] = { failures: 0, lastFailed: 0, lastSuccess: Date.now() };
    health[serverId].failures += 1;
    health[serverId].lastFailed = Date.now();
    localStorage.setItem(CACHE_CONFIG.SERVER_HEALTH_KEY, JSON.stringify(health));
  } catch (e) {}
}

function recordServerSuccess(serverId) {
  try {
    const health = JSON.parse(localStorage.getItem(CACHE_CONFIG.SERVER_HEALTH_KEY) || '{}');
    if (!health[serverId]) health[serverId] = { failures: 0, lastFailed: 0, lastSuccess: Date.now() };
    health[serverId].failures = Math.max(0, health[serverId].failures - 1);
    health[serverId].lastSuccess = Date.now();
    localStorage.setItem(CACHE_CONFIG.SERVER_HEALTH_KEY, JSON.stringify(health));
  } catch (e) {}
}

function getSortedServers() {
  try {
    const health = JSON.parse(localStorage.getItem(CACHE_CONFIG.SERVER_HEALTH_KEY) || '{}');
    return [...EMBED_SOURCES].sort((a, b) => {
      const aH = health[a.id] || { failures: 0, lastSuccess: Date.now() };
      const bH = health[b.id] || { failures: 0, lastSuccess: Date.now() };
      if (aH.failures >= CACHE_CONFIG.MAX_FAILURES) return 1;
      if (bH.failures >= CACHE_CONFIG.MAX_FAILURES) return -1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return aH.failures - bH.failures;
    });
  } catch (e) {
    return EMBED_SOURCES;
  }
}

function logServerDiagnostics(serverId, status, details = '') {
  try {
    const server = EMBED_SOURCES.find(s => s.id === serverId);
    const ts = new Date().toLocaleTimeString();
    const icons = { attempt: '⏳', success: '✅', timeout: '⏱️', blocked: '🚫', notfound: '❌', failed: '❌' };
    console.log(`[${ts}] ${icons[status] || '🔹'} ${server?.label || serverId} — ${status}${details ? ` | ${details}` : ''}`);
  } catch (e) {}
}

window.viewServerDiagnostics = function () {
  const health = JSON.parse(localStorage.getItem(CACHE_CONFIG.SERVER_HEALTH_KEY) || '{}');
  console.log('════════════ CINEVERSE SERVERS ════════════');
  EMBED_SOURCES.forEach(s => {
    const h = health[s.id] || { failures: 0 };
    const st = h.failures >= 3 ? '❌' : '✅';
    console.log(`  ${st} [P${s.priority}] ${s.label} — failures: ${h.failures}`);
  });
};

// ─── State ────────────────────────────────────────────────────
let currentPage = 'home';
let currentParams = {};
let searchTimeout = null;
let heroCarouselInterval = null;
let currentHeroSlide = 0;

const AUTH_KEY = 'cineverse_user';
const WATCHLIST_KEY = 'cineverse_mylist';
const CONTINUE_WATCHING_KEY = 'cineverse_continue_watching';
const WATCH_HISTORY_KEY = 'cineverse_watch_history';

// ─── Helpers ──────────────────────────────────────────────────
function updatePageMeta(title, path) {
  document.title = title ? `${title} — CineVerse | Watch Free Movies & TV Shows HD` : 'CineVerse - Watch Movies & TV Shows Online Free in HD';
  history.pushState({ page: currentPage, params: currentParams }, '', path || '/');
}

function getAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch (e) { return null; }
}

function setAuth(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  renderAuthUI();
  renderProfileDropdown();
}

function doSignOut() {
  localStorage.removeItem(AUTH_KEY);
  renderAuthUI();
  navigate('home');
  closeModal('profile-modal');
  toast('Signed out successfully');
}

function renderAuthUI() {
  const user = getAuth();
  const guestBtns = document.getElementById('guest-btns');
  const userSection = document.getElementById('user-section');
  if (guestBtns) guestBtns.style.display = user ? 'none' : 'flex';
  if (userSection) userSection.style.display = user ? 'block' : 'none';
  const sideSinginBtn = document.getElementById('side-signin-btn');
  const sideSignoutBtn = document.getElementById('side-signout-btn');
  if (sideSinginBtn) sideSinginBtn.style.display = user ? 'none' : 'block';
  if (sideSignoutBtn) sideSignoutBtn.style.display = user ? 'block' : 'none';
  if (user) {
    const el = document.getElementById('user-avatar-text');
    if (el) el.textContent = user.name[0].toUpperCase();
  }
}

function openModal(id) {
  document.getElementById(id).style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
  document.body.style.overflow = 'auto';
}

function toast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, duration);
}

// ─── Navigation ───────────────────────────────────────────────
function navigate(page, params = {}) {
  document.body.classList.remove('watch-mode');
  currentPage = page;
  currentParams = params;
  renderPage(page, params);
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === page);
  });
  updateNavbarActiveLink();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateGenre(genreId, genreName) {
  navigate('genre', { genreId, genreName });
}

function navigateDramaSubcategory(subCategory, subCategoryName) {
  navigate('drama', { subCategory, subCategoryName });
}

window.addEventListener('popstate', function (e) {
  document.body.classList.remove('watch-mode');
  if (e.state && e.state.page) {
    currentPage = e.state.page;
    currentParams = e.state.params || {};
    renderPage(currentPage, currentParams);
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.nav === currentPage);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    renderPage('home', {});
  }
});

function renderPage(page, params) {
  const root = document.getElementById('app-root');
  root.innerHTML = '<div style="display:flex;justify-content:center;align-items:center;min-height:60vh;"><div class="spinner"></div></div>';
  const pages = {
    home: renderHome,
    movies: () => renderListing('movie', 'popular', 'Popular Movies'),
    tvshows: () => renderListing('tv', 'popular', 'Popular TV Shows'),
    trending: () => renderTrending(),
    genre: () => renderGenre(params.genreId, params.genreName),
    drama: () => renderDramaCategory(params.subCategory, params.subCategoryName),
    detail: () => renderDetail(params.type || 'movie', params.id),
    watch: () => renderWatch(params.type, params.id, params.server || 0, params.episode || null),
    search: () => renderSearch(params.query),
    mylist: () => renderMyList(),
    actor: () => renderActor(params.id)
  };
  (pages[page] || pages.home)();
}

// ─── Home ─────────────────────────────────────────────────────
async function renderHome() {
  updatePageMeta('', '/');
  const root = document.getElementById('app-root');
  try {
    const [trending, popular, topRated, nowPlaying, onTV] = await Promise.all([
      tmdb('/trending/movie/week', { page: 1 }),
      tmdb('/movie/popular', { page: 1 }),
      tmdb('/movie/top_rated', { page: 1 }),
      tmdb('/movie/now_playing', { page: 1 }),
      tmdb('/tv/on_the_air', { page: 1 })
    ]);
    const heroMovies = trending.results.slice(0, 5);
    let html = `
      <div class="hero-section">
        ${heroMovies.map((movie, index) => `
          <div class="hero-slide ${index === 0 ? 'active' : ''}" data-slide="${index}">
            <img class="hero-backdrop"
                 src="${IMG_BASE}/original${movie.backdrop_path}"
                 alt="${movie.title || movie.name}"
                 loading="lazy"
                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221920%22 height=%221080%22%3E%3Crect width=%221920%22 height=%221080%22 fill=%22%231a1a1a%22/%3E%3C/svg%3E'">
            <div class="hero-gradient"></div>
            <div class="hero-content">
              <h1 class="hero-title">${movie.title || movie.name}</h1>
              <div class="hero-meta">
                <span class="hero-rating"><i class="fas fa-star"></i> ${movie.vote_average?.toFixed(1)}</span>
                <span class="hero-year">${(movie.release_date || movie.first_air_date || '').slice(0, 4)}</span>
              </div>
              <p class="hero-overview">${movie.overview || 'No overview available.'}</p>
              <div class="hero-buttons">
                <button class="btn-hero btn-hero-primary" onclick="navigate('watch',{type:'${movie.media_type || 'movie'}',id:${movie.id}})">
                  <i class="fas fa-play"></i> Watch Now
                </button>
                <button class="btn-hero btn-hero-secondary" onclick="navigate('detail',{type:'${movie.media_type || 'movie'}',id:${movie.id}})">
                  <i class="fas fa-info-circle"></i> More Info
                </button>
              </div>
            </div>
          </div>
        `).join('')}
        <div class="hero-indicators">
          ${heroMovies.map((_, index) => `
            <div class="hero-indicator ${index === 0 ? 'active' : ''}" data-slide="${index}" onclick="goToSlide(${index})"></div>
          `).join('')}
        </div>
      </div>`;

    const sections = [
      { title: 'Trending Now', data: trending.results, viewAllLink: 'trending' },
      { title: 'Popular Movies', data: popular.results, viewAllLink: 'movies' },
      { title: 'Top Rated', data: topRated.results.slice(0, 20) },
      { title: 'Now Playing', data: nowPlaying.results },
      { title: 'On TV Tonight', data: onTV.results }
    ];

    const continueWatching = getContinueWatching();
    if (continueWatching.length > 0) {
      html += `
        <div class="content-section">
          <div class="section-header">
            <div class="section-header-divider"></div>
            <h2 class="section-header-title">Continue Watching</h2>
          </div>
          <div class="movie-row">
            ${continueWatching.map(item => continueWatchCard(item)).join('')}
          </div>
        </div>`;
    }

    try {
      const recommendations = await getRecommendations();
      if (recommendations.length > 0) {
        html += `
          <div class="content-section">
            <div class="section-header">
              <div class="section-header-divider"></div>
              <h2 class="section-header-title">Recommended For You</h2>
            </div>
            <div class="recommendations-grid">
              ${recommendations.slice(0, 12).map(movie => movieCard(movie)).join('')}
            </div>
          </div>`;
      }
    } catch (e) {}

    for (const section of sections) {
      html += `
        <div class="content-section">
          <div class="section-header">
            <div class="section-header-divider"></div>
            <h2 class="section-header-title">${section.title}</h2>
            ${section.viewAllLink ? `<a href="#" onclick="navigate('${section.viewAllLink}'); return false;" class="view-all-link" style="margin-left:auto;">View All <i class="fas fa-arrow-right"></i></a>` : ''}
          </div>
          <div class="movie-row">
            ${section.data.map(movie => movieCard(movie)).join('')}
          </div>
        </div>`;
    }
    root.innerHTML = html;
    startHeroCarousel();
  } catch (error) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-circle"></i></div><h3 class="empty-title">Failed to Load Content</h3><p class="empty-text">Please check your connection and try again.</p></div>`;
  }
}

function startHeroCarousel() {
  if (heroCarouselInterval) clearInterval(heroCarouselInterval);
  heroCarouselInterval = setInterval(() => {
    const slides = document.querySelectorAll('.hero-slide');
    if (!slides.length) return;
    currentHeroSlide = (currentHeroSlide + 1) % slides.length;
    goToSlide(currentHeroSlide);
  }, 5000);
}

function goToSlide(index) {
  currentHeroSlide = index;
  document.querySelectorAll('.hero-slide').forEach((s, i) => s.classList.toggle('active', i === index));
  document.querySelectorAll('.hero-indicator').forEach((d, i) => d.classList.toggle('active', i === index));
}

// ─── Movie Card ───────────────────────────────────────────────
function movieCard(movie) {
  const title = movie.title || movie.name || 'Untitled';
  let posterUrl = '';
  if (movie.poster_path) {
    posterUrl = movie.poster_path.startsWith('http') ? movie.poster_path : `${IMG_BASE}/w500${movie.poster_path}`;
  } else if (movie.poster) {
    posterUrl = movie.poster.startsWith('http') ? movie.poster : `${IMG_BASE}/w500${movie.poster}`;
  }
  const id = movie.id;
  const type = movie.media_type || movie.type || 'movie';
  const year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
  const rating = movie.vote_average?.toFixed(1) || 'N/A';
  const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const posterForButton = movie.poster_path || movie.poster || '';
  return `
    <div class="movie-card" onclick="navigate('detail',{type:'${type}',id:${id}})">
      <div class="movie-poster-wrap">
        <img class="movie-poster"
             src="${posterUrl || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22500%22 height=%22750%22%3E%3Crect width=%22500%22 height=%22750%22 fill=%22%231a1a1a%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2236%22 font-family=%22sans-serif%22%3ENo Image%3C/text%3E%3C/svg%3E'}"
             alt="${title.replace(/'/g, '&#39;')}" loading="lazy">
        <div class="card-rating"><i class="fas fa-star"></i> ${rating}</div>
        <button class="card-watchlist-btn" data-id="${id}" data-type="${type}"
          onclick="event.stopPropagation(); handleWatchlistClick(this, {id:${id},title:'${safeTitle}',type:'${type}',poster_path:'${posterForButton}',vote_average:${movie.vote_average || 0}})"
          title="Add to Watchlist">
          <i class="fas fa-plus"></i>
        </button>
      </div>
      <div class="movie-info">
        <div class="movie-title">${title}</div>
        <div class="movie-year">${year}</div>
      </div>
    </div>`;
}

// ─── Listing ──────────────────────────────────────────────────
async function renderListing(mediaType, list, title) {
  updatePageMeta(title, `/${mediaType === 'movie' ? 'movies' : 'tvshows'}`);
  const root = document.getElementById('app-root');
  let page = 1;
  try {
    const data = await tmdb(`/${mediaType}/${list}`, { page: 1 });
    root.innerHTML = `
      <div class="content-section" style="margin-top:24px;">
        <h2 class="section-title">${title}</h2>
      </div>
      <div class="movie-grid" id="listing-grid">
        ${data.results.map(movie => movieCard({ ...movie, media_type: mediaType })).join('')}
      </div>
      <div style="text-align:center;padding:40px;">
        <button class="btn-primary" id="load-more-btn" style="padding:12px 32px;">
          Load More <i class="fas fa-arrow-down"></i>
        </button>
      </div>`;
    document.getElementById('load-more-btn').onclick = async () => {
      page++;
      const next = await tmdb(`/${mediaType}/${list}`, { page });
      const grid = document.getElementById('listing-grid');
      next.results.forEach(movie => {
        const div = document.createElement('div');
        div.innerHTML = movieCard({ ...movie, media_type: mediaType });
        grid.appendChild(div.firstElementChild);
      });
      if (page >= next.total_pages) document.getElementById('load-more-btn').remove();
    };
  } catch (error) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-circle"></i></div><h3 class="empty-title">Failed to Load ${title}</h3><p class="empty-text">Please try again later.</p></div>`;
  }
}

// ─── Trending ─────────────────────────────────────────────────
async function renderTrending() {
  updatePageMeta('Trending', '/trending');
  const root = document.getElementById('app-root');
  try {
    const [day, week] = await Promise.all([
      tmdb('/trending/all/day', { page: 1 }),
      tmdb('/trending/all/week', { page: 1 })
    ]);
    root.innerHTML = `
      <div class="content-section" style="margin-top:24px;">
        <div class="section-header"><h2 class="section-title">Trending Today</h2></div>
        <div class="movie-row">${day.results.map(movie => movieCard(movie)).join('')}</div>
      </div>
      <div class="content-section">
        <div class="section-header"><h2 class="section-title">Trending This Week</h2></div>
        <div class="movie-row">${week.results.map(movie => movieCard(movie)).join('')}</div>
      </div>`;
  } catch (error) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-fire"></i></div><h3 class="empty-title">Failed to Load Trending</h3><p class="empty-text">Please try again later.</p></div>`;
  }
}

// ─── Genre ────────────────────────────────────────────────────
async function renderGenre(genreId, genreName) {
  updatePageMeta(genreName, `/genre/${genreId}`);
  const root = document.getElementById('app-root');
  let page = 1;
  try {
    const data = await tmdb('/discover/movie', { with_genres: genreId, sort_by: 'popularity.desc', page: 1 });
    root.innerHTML = `
      <div class="content-section" style="margin-top:24px;">
        <h2 class="section-title">${genreName}</h2>
      </div>
      <div class="movie-grid" id="genre-grid">
        ${data.results.map(movie => movieCard({ ...movie, media_type: 'movie' })).join('')}
      </div>
      <div style="text-align:center;padding:40px;">
        <button class="btn-primary" id="load-more-btn" style="padding:12px 32px;">
          Load More <i class="fas fa-arrow-down"></i>
        </button>
      </div>`;
    document.getElementById('load-more-btn').onclick = async () => {
      page++;
      const next = await tmdb('/discover/movie', { with_genres: genreId, sort_by: 'popularity.desc', page });
      const grid = document.getElementById('genre-grid');
      next.results.forEach(movie => {
        const div = document.createElement('div');
        div.innerHTML = movieCard({ ...movie, media_type: 'movie' });
        grid.appendChild(div.firstElementChild);
      });
      if (page >= next.total_pages) document.getElementById('load-more-btn').remove();
    };
  } catch (error) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-film"></i></div><h3 class="empty-title">Failed to Load ${genreName}</h3><p class="empty-text">Please try again later.</p></div>`;
  }
}

// ─── Drama Categories ─────────────────────────────────────────
async function renderDramaCategory(subCategory, subCategoryName) {
  updatePageMeta(subCategoryName, `/drama/${subCategory}`);
  const root = document.getElementById('app-root');
  let page = 1;
  try {
    const getDramaParams = (nextPage) => {
      const base = { sort_by: 'popularity.desc', include_adult: false, page: nextPage };
      switch (subCategory) {
        case 'kdrama': return { ...base, with_origin_country: 'KR', with_genres: '18' };
        case 'jdrama': return { ...base, with_origin_country: 'JP', with_genres: '18' };
        case 'thdrama': return { ...base, with_origin_country: 'TH', with_genres: '18' };
        case 'anime': return { ...base, with_origin_country: 'JP', with_genres: '16' };
        default: return { ...base, with_genres: '18' };
      }
    };
    const data = await tmdb('/discover/tv', getDramaParams(1));
    const results = (data.results || []).filter(show => show.poster_path);
    root.innerHTML = `
      <div class="content-section" style="margin-top:24px;">
        <h2 class="section-title">${subCategoryName}</h2>
      </div>
      <div class="movie-grid" id="drama-grid">
        ${results.length ? results.map(show => movieCard({ ...show, media_type: 'tv' })).join('') : `
          <div class="empty-state" style="grid-column:1/-1;">
            <div class="empty-icon"><i class="fas fa-film"></i></div>
            <h3 class="empty-title">No ${subCategoryName} Found</h3>
          </div>`}
      </div>
      <div style="text-align:center;padding:40px;">
        <button class="btn-primary" id="load-more-btn" style="padding:12px 32px;">
          Load More <i class="fas fa-arrow-down"></i>
        </button>
      </div>`;
    document.getElementById('load-more-btn').onclick = async () => {
      page++;
      const next = await tmdb('/discover/tv', getDramaParams(page));
      const grid = document.getElementById('drama-grid');
      (next.results || []).filter(s => s.poster_path).forEach(show => {
        const div = document.createElement('div');
        div.innerHTML = movieCard({ ...show, media_type: 'tv' });
        grid.appendChild(div.firstElementChild);
      });
      if (page >= next.total_pages) document.getElementById('load-more-btn').remove();
    };
  } catch (error) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-film"></i></div><h3 class="empty-title">Failed to Load ${subCategoryName}</h3></div>`;
  }
}

// ─── Detail ───────────────────────────────────────────────────
async function renderDetail(type, id) {
  const root = document.getElementById('app-root');
  try {
    const data = await tmdb(`/${type}/${id}`, { append_to_response: 'credits,videos,similar' });
    const title = data.title || data.name || '';
    updatePageMeta(`${title} - Watch Free Online`, `/${type}/${id}`);
    const backdrop = data.backdrop_path ? `${IMG_BASE}/original${data.backdrop_path}` : '';
    const poster = data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : '';
    const year = (data.release_date || data.first_air_date || '').slice(0, 4);
    const rating = data.vote_average?.toFixed(1) || 'N/A';
    function formatRuntime(m) {
      if (!m) return 'N/A';
      const h = Math.floor(m / 60), min = m % 60;
      if (h === 0) return `${min}m`;
      if (min === 0) return `${h}h`;
      return `${h}h ${min}m`;
    }
    const runtime = data.runtime ? formatRuntime(data.runtime) : (data.episode_run_time?.[0] ? formatRuntime(data.episode_run_time[0]) : 'N/A');
    const genres = data.genres || [];
    const overview = data.overview || 'No overview available.';
    const tagline = data.tagline || '';
    const cast = (data.credits?.cast || []).slice(0, 15);
    const trailer = data.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const similar = (data.similar?.results || []).slice(0, 20);

    root.innerHTML = `
      <div class="detail-page">
        ${trailer ? `
          <div class="detail-backdrop-wrap">
            <iframe class="detail-trailer-bg"
                    src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&playlist=${trailer.key}"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    loading="lazy"></iframe>
            <div class="detail-backdrop-gradient"></div>
          </div>
        ` : backdrop ? `
          <div class="detail-backdrop-wrap">
            <img class="detail-backdrop" src="${backdrop}" alt="${title}" loading="lazy">
            <div class="detail-backdrop-gradient"></div>
          </div>
        ` : ''}
        <div class="detail-content">
          <div class="detail-main">
            <img class="detail-poster"
                 src="${poster || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22500%22 height=%22750%22%3E%3Crect width=%22500%22 height=%22750%22 fill=%22%231a1a1a%22/%3E%3C/svg%3E'}"
                 alt="${title}">
            <div class="detail-info">
              <h1 class="detail-title">${title}</h1>
              ${tagline ? `<p class="detail-tagline">${tagline}</p>` : ''}
              <div class="detail-meta">
                <span class="detail-meta-item"><i class="fas fa-calendar"></i> ${year}</span>
                <span class="detail-meta-item"><i class="fas fa-clock"></i> ${runtime}</span>
                <span class="detail-meta-item detail-rating"><i class="fas fa-star"></i> ${rating}</span>
              </div>
              ${genres.length ? `<div class="genre-list">${genres.map(g => `<span class="genre-badge">${g.name}</span>`).join('')}</div>` : ''}
              <p class="detail-overview">${overview}</p>
              <div class="detail-actions">
                <button class="btn-watch" onclick="navigate('watch',{type:'${type}',id:${id}})">
                  <i class="fas fa-play"></i> Watch Now
                </button>
                ${trailer ? `<a href="https://youtube.com/watch?v=${trailer.key}" target="_blank" class="btn-trailer"><i class="fab fa-youtube"></i> Watch Trailer</a>` : ''}
                <button class="btn-watchlist" id="watchlist-btn-${id}"
                  onclick="addToDetailWatchlist(${id},'${type}','${title.replace(/'/g, "\\'")}','${data.poster_path}')"
                  title="Add to Watchlist">
                  <i class="fas fa-bookmark"></i> Add to Watchlist
                </button>
              </div>
            </div>
          </div>
          ${cast.length ? `
            <div class="cast-section">
              <h3 class="cast-title">Cast</h3>
              <div class="cast-row">
                ${cast.map(person => `
                  <div class="cast-card" onclick="navigate('actor',{id:${person.id}})">
                    <img class="cast-photo"
                         src="${person.profile_path ? IMG_BASE + '/w185' + person.profile_path : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Ccircle cx=%2260%22 cy=%2260%22 r=%2260%22 fill=%22%231a1a1a%22/%3E%3C/svg%3E'}"
                         alt="${person.name}">
                    <div class="cast-name">${person.name}</div>
                    <div class="cast-character">${person.character || ''}</div>
                  </div>`).join('')}
              </div>
            </div>` : ''}
          ${similar.length ? `
            <div class="content-section">
              <h3 class="section-title">Similar ${type === 'movie' ? 'Movies' : 'TV Shows'}</h3>
              <div class="movie-row">${similar.map(movie => movieCard({ ...movie, media_type: type })).join('')}</div>
            </div>` : ''}
        </div>
      </div>`;
  } catch (error) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-circle"></i></div><h3 class="empty-title">Failed to Load Details</h3><p class="empty-text">Please try again later.</p></div>`;
  }
}

// ─── Watch Page ───────────────────────────────────────────────
async function renderWatch(type, id, serverIndex = 0, episode = null) {
  document.body.classList.add('watch-mode');
  const root = document.getElementById('app-root');
  const server = EMBED_SOURCES[serverIndex] || EMBED_SOURCES[0];
  updatePageMeta('Watch', `/watch/${type}/${id}`);

  let mediaData = null;
  let episodes = [];
  let seasons = [];
  let selectedSeason = 1;
  let selectedEpisode = episode || 1;

  try {
    mediaData = await tmdb(`/${type}/${id}`, {});
    trackWatchedMovie({
      id, type,
      title: mediaData.title || mediaData.name,
      poster: mediaData.poster_path ? `${IMG_BASE}/w300${mediaData.poster_path}` : ''
    });
  } catch (e) {
    trackWatchedMovie({ id, type, title: 'Now Playing', poster: '' });
  }

  if (type === 'tv') {
    try {
      const tvData = mediaData || await tmdb(`/tv/${id}`, {});
      seasons = tvData.seasons || [];
      if (seasons.length > 0) {
        const firstSeason = seasons.find(s => s.season_number > 0) || seasons[0];
        selectedSeason = firstSeason.season_number;
        const cached = getCachedEpisodes(id, selectedSeason);
        if (cached) {
          episodes = cached;
        } else {
          const seasonData = await tmdb(`/tv/${id}/season/${selectedSeason}`, {});
          episodes = seasonData.episodes || [];
          setCachedEpisodes(id, selectedSeason, episodes);
        }
      }
    } catch (e) {
      console.error('Failed to load episodes:', e);
    }
  }

  const embedUrl = server.url(id, type, selectedSeason, selectedEpisode);

  root.innerHTML = `
    <div class="watch-page">
      <div class="watch-header">
        <div class="watch-header-left">
          <button class="btn-back" onclick="navigate('detail',{type:'${type}',id:${id}})">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <span class="watch-title" id="watch-title-label">
            ${type === 'tv' ? `S${selectedSeason} · E${selectedEpisode}` : (mediaData?.title || mediaData?.name || 'Now Playing')}
          </span>
        </div>
        <div class="watch-header-controls">
          <button class="watch-header-btn" onclick="openServersModal()">
            <i class="fas fa-server"></i> Servers
          </button>
          ${type === 'tv' ? `
            <button class="watch-header-btn" onclick="previousEpisode()">
              <i class="fas fa-chevron-left"></i>
            </button>
            <button class="watch-header-btn" onclick="nextEpisode()">
              <i class="fas fa-chevron-right"></i>
            </button>` : ''}
          <button class="watch-header-btn" onclick="toggleFullscreen()">
            <i class="fas fa-expand"></i>
          </button>
        </div>
      </div>

      <div id="servers-modal" class="servers-modal hidden">
        <div class="servers-modal-content">
          <div class="servers-modal-header">
            <span class="servers-modal-title"><i class="fas fa-server"></i> Select Server</span>
            <button class="servers-modal-close" onclick="closeServersModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">If one server is black or broken, try the next one.</p>
          <div class="servers-list">
            ${EMBED_SOURCES.map((s, i) => `
              <div class="server-item ${i === serverIndex ? 'active' : ''}"
                   onclick="selectServer(${i}, '${type}', ${id})">
                <i class="fas fa-shield-alt"></i>
                <span>${s.label}</span>
                ${i === 0 ? '<span style="margin-left:auto;font-size:10px;background:rgba(229,9,20,0.3);padding:2px 6px;border-radius:4px;">BEST</span>' : ''}
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="watch-content">
        <div class="player-container">
          <div class="player-wrapper">
            <iframe id="main-player"
                    src="${embedUrl}"
                    allowfullscreen
                    webkitallowfullscreen
                    mozallowfullscreen
                    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; xr-spatial-tracking; web-share; clipboard-write"
                    scrolling="no"
                    frameborder="0"></iframe>
          </div>
        </div>

        ${type === 'tv' && episodes.length > 0 ? `
          <div class="episodes-panel">
            <div class="episodes-header">
              <div class="episodes-title">Episodes</div>
              <select class="season-dropdown" onchange="switchSeason(this.value, '${type}', ${id})">
                ${seasons.filter(s => s.season_number > 0).map(season => `
                  <option value="${season.season_number}" ${season.season_number === selectedSeason ? 'selected' : ''}>
                    Season ${season.season_number}
                  </option>`).join('')}
              </select>
            </div>
            <div class="episodes-list">
              ${episodes.map(ep => `
                <div class="episode-item ${ep.episode_number === selectedEpisode ? 'active' : ''}"
                     onclick="switchEpisode('${type}', ${id}, ${selectedSeason}, ${ep.episode_number})">
                  <div class="episode-number">EP ${ep.episode_number}</div>
                  <div class="episode-name">${ep.name || `Episode ${ep.episode_number}`}</div>
                </div>`).join('')}
            </div>
          </div>` : ''}
      </div>
    </div>`;

  const iframe = document.getElementById('main-player');
  if (iframe) {
    iframe.dataset.serverIndex = serverIndex;
    iframe.dataset.type = type;
    iframe.dataset.id = id;
    iframe.dataset.season = selectedSeason;
    iframe.dataset.episode = selectedEpisode;
    logServerDiagnostics(server.id, 'attempt');
    setTimeout(() => {
      recordServerSuccess(server.id);
      logServerDiagnostics(server.id, 'success');
    }, 4000);
  }
}

// ─── Server modal ─────────────────────────────────────────────
function openServersModal() {
  const modal = document.getElementById('servers-modal');
  if (modal) modal.classList.remove('hidden');
}
function closeServersModal() {
  const modal = document.getElementById('servers-modal');
  if (modal) modal.classList.add('hidden');
}
function selectServer(serverIndex, type, id) {
  switchServer(serverIndex, type, id);
  closeServersModal();
}

// ─── Episode navigation ───────────────────────────────────────
function previousEpisode() {
  const activeEp = document.querySelector('.episode-item.active');
  if (!activeEp) return;
  const prev = activeEp.previousElementSibling;
  if (prev && prev.classList.contains('episode-item')) prev.click();
}
function nextEpisode() {
  const activeEp = document.querySelector('.episode-item.active');
  if (!activeEp) return;
  const next = activeEp.nextElementSibling;
  if (next && next.classList.contains('episode-item')) next.click();
}
function switchSeason(season, type, id) {
  switchEpisode(type, id, parseInt(season), 1);
}

function toggleFullscreen() {
  const player = document.getElementById('main-player');
  if (!player) return;
  if (player.requestFullscreen) player.requestFullscreen();
  else if (player.webkitRequestFullscreen) player.webkitRequestFullscreen();
  else if (player.mozRequestFullScreen) player.mozRequestFullScreen();
}

// ─── Switch server (no full reload) ──────────────────────────
function switchServer(serverIndex, type, id) {
  const server = EMBED_SOURCES[serverIndex];
  if (!server) return;
  const iframe = document.getElementById('main-player');
  if (iframe) {
    const season = parseInt(iframe.dataset.season || 1);
    const episode = parseInt(iframe.dataset.episode || 1);
    iframe.src = server.url(id, type, season, episode);
    iframe.dataset.serverIndex = serverIndex;
    iframe.dataset.type = type;
    iframe.dataset.id = id;
    iframe.dataset.season = season;
    iframe.dataset.episode = episode;
    logServerDiagnostics(server.id, 'attempt', 'manual switch');
  }
  document.querySelectorAll('.server-item').forEach((item, i) => {
    item.classList.toggle('active', i === serverIndex);
  });
  toast(`▶ Switched to ${server.label}`);
}

function autoSwitchServer(type, id) {
  const iframe = document.getElementById('main-player');
  if (!iframe) return;
  const currentIndex = parseInt(iframe.dataset.serverIndex || 0);
  const sorted = getSortedServers();
  const currentId = EMBED_SOURCES[currentIndex]?.id;
  for (const candidate of sorted) {
    if (candidate.id !== currentId) {
      const nextIndex = EMBED_SOURCES.findIndex(s => s.id === candidate.id);
      if (nextIndex !== -1) {
        toast(`${EMBED_SOURCES[currentIndex]?.label} failed — trying ${candidate.label}...`);
        switchServer(nextIndex, type, id);
        return;
      }
    }
  }
}

function switchEpisode(type, id, season, episode) {
  if (type !== 'tv') return;
  const iframe = document.getElementById('main-player');
  if (iframe) {
    const serverIndex = parseInt(iframe.dataset.serverIndex || 0);
    const server = EMBED_SOURCES[serverIndex] || EMBED_SOURCES[0];
    iframe.src = server.url(id, type, season, episode);
    iframe.dataset.season = season;
    iframe.dataset.episode = episode;
  }
  document.querySelectorAll('.episode-item').forEach(item => {
    const epNum = parseInt(item.querySelector('.episode-number').textContent.replace('EP', '').trim());
    item.classList.toggle('active', epNum === episode);
  });
  const dropdown = document.querySelector('.season-dropdown');
  if (dropdown) dropdown.value = season;
  const label = document.getElementById('watch-title-label');
  if (label) label.textContent = `S${season} · E${episode}`;
  toast(`▶ S${season} E${episode}`);
}

// ─── Search ───────────────────────────────────────────────────
async function renderSearch(query) {
  updatePageMeta(`Search: ${query}`, `/search?q=${encodeURIComponent(query)}`);
  const root = document.getElementById('app-root');
  if (!query || !query.trim()) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-search"></i></div><h3 class="empty-title">Start Searching</h3><p class="empty-text">Type something in the search box.</p></div>`;
    return;
  }
  try {
    const [movies, tv] = await Promise.all([
      tmdb('/search/movie', { query, page: 1 }),
      tmdb('/search/tv', { query, page: 1 })
    ]);
    const allResults = [
      ...movies.results.map(m => ({ ...m, media_type: 'movie' })),
      ...tv.results.map(t => ({ ...t, media_type: 'tv' }))
    ].filter(item => item.poster_path);
    if (!allResults.length) {
      root.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-search"></i></div><h3 class="empty-title">No Results Found</h3><p class="empty-text">No results for "${query}".</p></div>`;
      return;
    }
    root.innerHTML = `
      <div class="content-section" style="margin-top:24px;">
        <h2 class="section-title">Results for "${query}"</h2>
        <p style="color:var(--text-muted);margin-top:8px;font-size:14px;">${allResults.length} result${allResults.length !== 1 ? 's' : ''} found</p>
      </div>
      <div class="movie-grid">${allResults.map(movie => movieCard(movie)).join('')}</div>`;
  } catch (error) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-exclamation-circle"></i></div><h3 class="empty-title">Search Failed</h3><p class="empty-text">Please try again.</p></div>`;
  }
}

// ─── Watchlist ────────────────────────────────────────────────
function addToDetailWatchlist(id, type, title, poster) {
  addToWatchlist({ id, type, title, poster_path: poster });
}

function removeFromWatchlist(id) {
  const watchlist = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist.filter(item => item.id !== id)));
  toast('✓ Removed from watchlist');
  renderMyList();
}

function isInWatchlist(id, type) {
  return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]').some(i => i.id === id && i.type === type);
}

function handleWatchlistClick(btn, item) {
  const user = getAuth();
  if (!user) { openModal('auth-modal'); toast('Please sign in to add to watchlist'); return; }
  if (!item || !item.id || !item.type) { toast('Error: Invalid item'); return; }
  const watchlist = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
  if (watchlist.find(i => i.id === item.id && i.type === item.type)) {
    showWatchlistNotification(); return;
  }
  addToWatchlist(item, btn);
}

function showWatchlistNotification() {
  const n = document.createElement('div');
  n.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(229,9,20,0.95);color:white;padding:16px 24px;border-radius:8px;font-size:14px;font-weight:600;z-index:9999;';
  n.textContent = "It's already in your watchlist";
  document.body.appendChild(n);
  setTimeout(() => { n.style.opacity = '0'; n.style.transition = 'opacity 0.3s'; setTimeout(() => n.remove(), 300); }, 2000);
}

function addToWatchlist(item, btn) {
  const watchlist = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
  watchlist.push({ ...item, poster_path: item.poster_path || item.poster, addedAt: Date.now() });
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  if (btn) { btn.innerHTML = '<i class="fas fa-bookmark"></i>'; btn.classList.add('saved'); btn.title = 'Already in watchlist'; }
  toast('✓ Added to watchlist!');
}

function renderMyList() {
  updatePageMeta('My Watchlist', '/watchlist');
  const root = document.getElementById('app-root');
  const user = getAuth();
  if (!user) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-bookmark"></i></div><h3 class="empty-title">Sign In Required</h3><p class="empty-text">Sign in to manage your watchlist.</p><button class="btn-primary" onclick="openModal('auth-modal')" style="margin:20px auto 0;"><i class="fas fa-sign-in-alt"></i> Sign In</button></div>`;
    return;
  }
  const watchlist = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
  if (!watchlist.length) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-bookmark"></i></div><h3 class="empty-title">Your Watchlist is Empty</h3><p class="empty-text">Add movies and shows to watch them later.</p><button class="btn-primary" onclick="navigate('home')" style="margin:20px auto 0;"><i class="fas fa-home"></i> Browse Content</button></div>`;
    return;
  }
  root.innerHTML = `
    <div class="content-section" style="margin-top:24px;">
      <h2 class="section-title">My Watchlist</h2>
      <p style="color:var(--text-muted);margin-top:8px;font-size:14px;">${watchlist.length} item${watchlist.length !== 1 ? 's' : ''}</p>
    </div>
    <div class="movie-grid">${[...watchlist].reverse().map(item => `
      <div style="position:relative;" class="watchlist-card-wrapper">
        ${movieCard(item)}
        <button class="watchlist-remove-btn" onclick="removeFromWatchlist(${item.id})" title="Remove from watchlist">
          <i class="fas fa-trash"></i>
        </button>
      </div>`).join('')}</div>`;
}

// ─── Continue Watching ────────────────────────────────────────
function trackWatchedMovie(movie) {
  const history = JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]');
  const idx = history.findIndex(m => m.id === movie.id && m.type === movie.type);
  if (idx > -1) history.splice(idx, 1);
  history.unshift({ id: movie.id, type: movie.type, title: movie.title || movie.name, poster: movie.poster, watchedAt: Date.now(), progress: 0 });
  localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
}

function getContinueWatching() {
  return JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]').slice(0, 8);
}

async function getRecommendations() {
  try {
    const history = JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]');
    if (history.length === 0) {
      return (await tmdb('/movie/popular', { page: 1 })).results.slice(0, 20);
    }
    const recent = history[0];
    const data = await tmdb(`/${recent.type}/${recent.id}`, {});
    const genres = data.genres?.map(g => g.id) || [];
    if (!genres.length) return (await tmdb('/movie/popular', { page: 1 })).results.slice(0, 20);
    return (await tmdb('/discover/movie', { with_genres: genres.slice(0, 2).join(','), sort_by: 'popularity.desc', page: 1 })).results.slice(0, 20);
  } catch (e) {
    return (await tmdb('/movie/popular', { page: 1 })).results.slice(0, 20);
  }
}

function continueWatchCard(item) {
  return `
    <div class="continue-watch-card" onclick="navigate('watch',{type:'${item.type || 'movie'}',id:${item.id}})">
      <img class="continue-watch-poster"
           src="${item.poster || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22220%22 height=%22280%22%3E%3Crect width=%22220%22 height=%22280%22 fill=%22%231a1a1a%22/%3E%3C/svg%3E'}"
           alt="${item.title || ''}">
      <button class="continue-watch-remove-btn" onclick="event.stopPropagation(); removeFromContinueWatching(${item.id})">
        <i class="fas fa-trash"></i>
      </button>
      <div class="continue-watch-info">
        <div class="continue-watch-title">${item.title || 'Untitled'}</div>
        <div class="continue-watch-progress">
          <div class="continue-watch-progress-bar" style="width:${item.progress || 0}%"></div>
        </div>
        <div class="continue-watch-meta">
          <span>${item.progress || 0}% watched</span>
          <span><i class="fas fa-play-circle"></i> Continue</span>
        </div>
      </div>
    </div>`;
}

function removeFromContinueWatching(id) {
  const h = JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]').filter(i => i.id !== id);
  localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(h));
  toast('Removed from continue watching');
  renderHome();
}

// ─── Actor ────────────────────────────────────────────────────
async function renderActor(id) {
  const root = document.getElementById('app-root');
  try {
    const data = await tmdb(`/person/${id}`, { append_to_response: 'movie_credits,tv_credits' });
    updatePageMeta(data.name, `/person/${id}`);
    const movies = (data.movie_credits?.cast || []).filter(m => m.poster_path).slice(0, 20);
    root.innerHTML = `
      <div class="detail-page">
        <div class="detail-content" style="margin-top:24px;">
          <div class="detail-main">
            <img class="detail-poster" style="width:280px;"
                 src="${data.profile_path ? IMG_BASE + '/w500' + data.profile_path : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22500%22 height=%22750%22%3E%3Crect width=%22500%22 height=%22750%22 fill=%22%231a1a1a%22/%3E%3C/svg%3E'}"
                 alt="${data.name}">
            <div class="detail-info">
              <h1 class="detail-title">${data.name}</h1>
              <p class="detail-tagline">${data.known_for_department || 'Actor'}</p>
              <div class="detail-meta">
                ${data.birthday ? `<span class="detail-meta-item"><i class="fas fa-birthday-cake"></i> ${data.birthday}</span>` : ''}
                ${data.place_of_birth ? `<span class="detail-meta-item"><i class="fas fa-map-marker-alt"></i> ${data.place_of_birth}</span>` : ''}
              </div>
              <p class="detail-overview">${data.biography || 'No biography available.'}</p>
            </div>
          </div>
          ${movies.length ? `
            <div class="content-section">
              <h3 class="section-title">Known For</h3>
              <div class="movie-row">${movies.map(movie => movieCard({ ...movie, media_type: 'movie' })).join('')}</div>
            </div>` : ''}
        </div>
      </div>`;
  } catch (error) {
    root.innerHTML = `<div class="empty-state"><div class="empty-icon"><i class="fas fa-user"></i></div><h3 class="empty-title">Failed to Load Actor</h3></div>`;
  }
}

// ─── Profile ──────────────────────────────────────────────────
function openProfile() {
  const user = getAuth();
  if (!user) return;
  const watchlist = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
  const history = JSON.parse(localStorage.getItem(WATCH_HISTORY_KEY) || '[]');
  document.getElementById('profile-content').innerHTML = `
    <div class="profile-page-container">
      <div class="profile-header">
        <div class="profile-avatar"><i class="fas fa-user-circle"></i></div>
        <div class="profile-header-info">
          <h1 class="profile-name">${user.name}</h1>
          <p class="profile-email">${user.email}</p>
          <p class="profile-member-since">Member since ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
        </div>
      </div>
      <div class="profile-stats">
        <div class="stat-card"><i class="fas fa-bookmark"></i><div class="stat-content"><div class="stat-label">Watchlist Items</div><div class="stat-value">${watchlist.length}</div></div></div>
        <div class="stat-card"><i class="fas fa-history"></i><div class="stat-content"><div class="stat-label">Watch History</div><div class="stat-value">${history.length}</div></div></div>
        <div class="stat-card"><i class="fas fa-fire"></i><div class="stat-content"><div class="stat-label">This Month</div><div class="stat-value">${Math.ceil(Math.random() * 20)}</div></div></div>
      </div>
      <div class="profile-section">
        <h2 class="section-title">Account Information</h2>
        <div class="profile-info-grid">
          <div class="info-item"><label class="info-label">Name</label><p class="info-value">${user.name}</p></div>
          <div class="info-item"><label class="info-label">Email</label><p class="info-value">${user.email}</p></div>
        </div>
      </div>
      <div class="profile-section">
        <h2 class="section-title">Preferences</h2>
        <div class="settings-list">
          <div class="settings-item"><div class="settings-label"><i class="fas fa-bell"></i><span>Notifications</span></div><label class="toggle-switch"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
          <div class="settings-item"><div class="settings-label"><i class="fas fa-closed-captioning"></i><span>Auto-play Next Episode</span></div><label class="toggle-switch"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
          <div class="settings-item"><div class="settings-label"><i class="fas fa-sun"></i><span>Dark Mode</span></div><label class="toggle-switch"><input type="checkbox" checked><span class="toggle-slider"></span></label></div>
        </div>
      </div>
      <div class="profile-section danger-zone">
        <h2 class="section-title">Danger Zone</h2>
        <button class="btn-danger" onclick="doSignOut()"><i class="fas fa-sign-out-alt"></i> Sign Out</button>
      </div>
    </div>`;
  openModal('profile-modal');
}

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('contextmenu', e => { e.preventDefault(); return false; });
document.addEventListener('keydown', function (e) {
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'C', 'J', 'K'].includes(e.key))) {
    e.preventDefault(); return false;
  }
});

document.addEventListener('DOMContentLoaded', function () {
  renderAuthUI();
  window.addEventListener('scroll', function () {
    const nb = document.getElementById('navbar-desktop') || document.getElementById('navbar-mobile');
    if (nb) nb.classList.toggle('scrolled', window.scrollY > 50);
  });
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.onclick = function () {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const isSignIn = tab.dataset.tab === 'signin';
      document.getElementById('signin-form').style.display = isSignIn ? 'flex' : 'none';
      document.getElementById('signup-form').style.display = isSignIn ? 'none' : 'flex';
    };
  });
  document.getElementById('signin-submit-btn').onclick = function () {
    const email = document.getElementById('si-email').value.trim();
    const password = document.getElementById('si-password').value;
    if (!email || password.length < 3) { document.getElementById('si-error').textContent = 'Invalid email or password'; return; }
    setAuth({ name: email.split('@')[0], email });
    closeModal('auth-modal');
    toast('Signed in successfully!');
  };
  document.getElementById('signup-submit-btn').onclick = function () {
    const name = document.getElementById('su-name').value.trim();
    const email = document.getElementById('su-email').value.trim();
    const password = document.getElementById('su-password').value;
    const confirm = document.getElementById('su-confirm').value;
    if (!name || !email || password.length < 6 || password !== confirm) {
      document.getElementById('su-error').textContent = 'Please fill all fields correctly. Password must be at least 6 characters and match.';
      return;
    }
    setAuth({ name, email });
    closeModal('auth-modal');
    toast('Account created successfully!');
  };
  const authCloseBtn = document.getElementById('auth-close-btn');
  const profileCloseBtn = document.getElementById('profile-close-btn');
  if (authCloseBtn) authCloseBtn.onclick = () => closeModal('auth-modal');
  if (profileCloseBtn) profileCloseBtn.onclick = () => closeModal('profile-modal');
  history.replaceState({ page: 'home', params: {} }, '', '/');
  navigate('home');
});

function toggleSideMenu() {
  const sideMenu = document.getElementById('side-menu-pro');
  if (!sideMenu) return;
  const isOpen = sideMenu.style.display === 'flex';
  sideMenu.style.display = isOpen ? 'none' : 'flex';
  document.body.style.overflow = isOpen ? '' : 'hidden';
}

function openSearchModal() {
  const expandDesktop = document.getElementById('expandable-search-desktop');
  const expandMobile = document.getElementById('expandable-search-mobile');
  if (expandDesktop && window.innerWidth >= 1024) {
    expandDesktop.style.display = 'flex';
    document.getElementById('search-input-navbar-desktop')?.focus();
  } else if (expandMobile && window.innerWidth < 1024) {
    expandMobile.style.display = 'flex';
    document.getElementById('search-input-navbar-mobile')?.focus();
  }
}

function closeSearchModal() {
  const expandDesktop = document.getElementById('expandable-search-desktop');
  const expandMobile = document.getElementById('expandable-search-mobile');
  if (expandDesktop) { expandDesktop.style.display = 'none'; const inp = document.getElementById('search-input-navbar-desktop'); if (inp) inp.value = ''; }
  if (expandMobile) { expandMobile.style.display = 'none'; const inp = document.getElementById('search-input-navbar-mobile'); if (inp) inp.value = ''; }
}

async function performSearch(query) {
  if (!query || query.trim().length < 2) { toast('Please enter at least 2 characters'); return; }
  closeSearchModal();
  navigate('search', { query: query.trim() });
}

function setupSearchFunctionality() {
  const searchInput = document.getElementById('search-input-pro');
  if (!searchInput) return;
  searchInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (query) { navigate('search', { query }); closeSearchModal(); }
    }
  });
}

function openAuthModal() { openModal('auth-modal'); }

function toggleProfileDropdown() {
  const dropdown = document.getElementById('profile-dropdown-desktop');
  if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

function updateNavbarActiveLink() {
  document.querySelectorAll('.nav-link-desktop[data-page], .bottom-nav-item').forEach(link => {
    const page = link.dataset.page;
    if (page) link.classList.toggle('active', page === currentPage);
  });
}

function renderProfileDropdown() {
  const user = getAuth();
  const dropdown = document.getElementById('profile-dropdown-content-desktop');
  if (!dropdown) return;
  dropdown.innerHTML = user ? `
    <div class="profile-user-info">
      <div class="profile-user-name">${user.name}</div>
      <div class="profile-user-email">${user.email}</div>
    </div>
    <a href="#" onclick="navigate('mylist'); document.getElementById('profile-dropdown-desktop').style.display='none'; return false;" class="profile-dropdown-item">
      <i class="fas fa-bookmark" style="width:20px;"></i> My Watchlist
    </a>
    <a href="#" onclick="openProfile(); document.getElementById('profile-dropdown-desktop').style.display='none'; return false;" class="profile-dropdown-item">
      <i class="fas fa-user" style="width:20px;"></i> My Account
    </a>
    <div class="profile-dropdown-divider"></div>
    <a href="#" onclick="doSignOut(); document.getElementById('profile-dropdown-desktop').style.display='none'; return false;" class="profile-dropdown-item">
      <i class="fas fa-sign-out-alt" style="width:20px;"></i> Sign Out
    </a>` : `
    <a href="#" onclick="openModal('auth-modal'); document.getElementById('profile-dropdown-desktop').style.display='none'; return false;" class="profile-dropdown-item">
      <i class="fas fa-sign-in-alt" style="width:20px;"></i> Sign In
    </a>`;
}

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeSearchModal();
    const sideMenu = document.getElementById('side-menu-pro');
    if (sideMenu && sideMenu.style.display === 'flex') toggleSideMenu();
    document.body.style.overflow = 'auto';
  }
});

document.addEventListener('click', function (e) {
  const profileBtn = document.getElementById('profile-btn-desktop');
  const dropdown = document.getElementById('profile-dropdown-desktop');
  if (profileBtn && dropdown && !profileBtn.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

document.addEventListener('DOMContentLoaded', function () {
  setupSearchFunctionality();
  renderProfileDropdown();
  updateNavbarActiveLink();
});
          
        
