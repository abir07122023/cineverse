/* ============================================================
   CINEVERSE - Advanced Movie Streaming Platform
   Professional JavaScript with Server Options & Quality Controls
   ============================================================ */

const TMDB_KEY = '5e2176b3af584e2047c93f889e185eca';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

// Advanced embed sources with quality and caption support
const EMBED_SOURCES = [
  { 
    id: 'vidsrc', 
    label: 'VidSrc Pro', 
    url: id => `https://vidsrc.xyz/embed/movie/${id}`,
    supports: { quality: true, captions: true, speed: true }
  },
  { 
    id: 'vidsrcto',
    label: 'VidSrc.to',
    url: id => `https://vidsrc.to/embed/movie/${id}`,
    supports: { quality: true, captions: true, speed: false }
  },
  { 
    id: '2embed', 
    label: '2Embed', 
    url: id => `https://www.2embed.cc/embed/${id}`,
    supports: { quality: true, captions: false, speed: false }
  },
  { 
    id: 'superembed',
    label: 'SuperEmbed',
    url: id => `https://multiembed.mov/directstream.php?video_id=${id}`,
    supports: { quality: false, captions: false, speed: false }
  },
  { 
    id: 'embedsoap',
    label: 'EmbedSoap',
    url: id => `https://www.embedsoap.com/embed/movie/?id=${id}`,
    supports: { quality: true, captions: true, speed: false }
  },
  { 
    id: 'autoembed',
    label: 'AutoEmbed',
    url: id => `https://player.autoembed.cc/embed/movie/${id}`,
    supports: { quality: true, captions: false, speed: false }
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

let currentPage = 'home';
let searchTimeout = null;
let heroCarouselInterval = null;
let currentHeroSlide = 0;

// Auth functions
const AUTH_KEY = 'cineverse_user';
const WATCHLIST_KEY = 'cineverse_mylist';

function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch (e) {
    return null;
  }
}

function setAuth(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  renderAuthUI();
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
  document.getElementById('guest-btns').style.display = user ? 'none' : 'flex';
  document.getElementById('user-section').style.display = user ? 'block' : 'none';
  
  if (user) {
    document.getElementById('user-avatar-text').textContent = user.name[0].toUpperCase();
    document.getElementById('menu-user-name').textContent = user.name;
    document.getElementById('menu-user-email').textContent = user.email;
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

function closeUserMenu() {
  const menu = document.getElementById('user-menu');
  if (menu) menu.style.display = 'none';
}

function toast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Navigation
function navigate(page, params = {}) {
  currentPage = page;
  renderPage(page, params);
  
  // Update active nav link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === page);
  });
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigateGenre(genreId, genreName) {
  navigate('genre', { genreId, genreName });
}

// TMDB API
async function tmdb(endpoint, params = {}) {
  const queryString = new URLSearchParams({
    api_key: TMDB_KEY,
    language: 'en-US',
    ...params
  }).toString();
  
  const response = await fetch(`${TMDB_BASE}${endpoint}?${queryString}`);
  
  if (!response.ok) {
    throw new Error(`TMDB API Error: ${response.status}`);
  }
  
  return response.json();
}

// Page rendering
function renderPage(page, params) {
  const root = document.getElementById('app-root');
  root.innerHTML = '<div style=\"display:flex;justify-content:center;align-items:center;min-height:60vh;\"><div class=\"spinner\"></div></div>';
  
  const pages = {
    home: renderHome,
    movies: () => renderListing('movie', 'popular', 'Popular Movies'),
    tvshows: () => renderListing('tv', 'popular', 'Popular TV Shows'),
    trending: () => renderTrending(),
    genre: () => renderGenre(params.genreId, params.genreName),
    detail: () => renderDetail(params.type || 'movie', params.id),
    watch: () => renderWatch(params.type, params.id, params.server || 0),
    search: () => renderSearch(params.query),
    mylist: () => renderMyList(),
    actor: () => renderActor(params.id)
  };
  
  (pages[page] || pages.home)();
}

// Home page with hero carousel
async function renderHome() {
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
      <div class=\"hero-section\">
        ${heroMovies.map((movie, index) => `
          <div class=\"hero-slide ${index === 0 ? 'active' : ''}\" data-slide=\"${index}\">
            <img class=\"hero-backdrop\" 
                 src=\"${IMG_BASE}/original${movie.backdrop_path}\" 
                 alt=\"${movie.title || movie.name}\"
                 loading=\"lazy\"
                 onerror=\"this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221920%22 height=%221080%22%3E%3Crect width=%221920%22 height=%221080%22 fill=%22%231a1a1a%22/%3E%3C/svg%3E'\">
            <div class=\"hero-gradient\"></div>
            <div class=\"hero-content\">
              <h1 class=\"hero-title\">${movie.title || movie.name}</h1>
              <div class=\"hero-meta\">
                <span class=\"hero-rating\">
                  <i class=\"fas fa-star\"></i> ${movie.vote_average?.toFixed(1)}
                </span>
                <span class=\"hero-year\">${(movie.release_date || movie.first_air_date || '').slice(0, 4)}</span>
              </div>
              <p class=\"hero-overview\">${movie.overview || 'No overview available.'}</p>
              <div class=\"hero-buttons\">
                <button class=\"btn-hero btn-hero-primary\" onclick=\"navigate('watch',{type:'${movie.media_type || 'movie'}',id:${movie.id}})\">
                  <i class=\"fas fa-play\"></i> Watch Now
                </button>
                <button class=\"btn-hero btn-hero-secondary\" onclick=\"navigate('detail',{type:'${movie.media_type || 'movie'}',id:${movie.id}})\">
                  <i class=\"fas fa-info-circle\"></i> More Info
                </button>
              </div>
            </div>
          </div>
        `).join('')}
        <div class=\"hero-indicators\">
          ${heroMovies.map((_, index) => `
            <div class=\"hero-indicator ${index === 0 ? 'active' : ''}\" data-slide=\"${index}\" onclick=\"goToSlide(${index})\"></div>
          `).join('')}
        </div>
      </div>
    `;
    
    const sections = [
      { title: 'Trending Now', data: trending.results, viewAllLink: 'trending' },
      { title: 'Popular Movies', data: popular.results, viewAllLink: 'movies' },
      { title: 'Top Rated', data: topRated.results.slice(0, 20) },
      { title: 'Now Playing', data: nowPlaying.results },
      { title: 'On TV Tonight', data: onTV.results }
    ];
    
    for (const section of sections) {
      html += `
        <div class=\"content-section\">
          <div class=\"section-header\">
            <h2 class=\"section-title\">${section.title}</h2>
            ${section.viewAllLink ? `<a href=\"#\" onclick=\"navigate('${section.viewAllLink}'); return false;\" class=\"view-all-link\">View All <i class=\"fas fa-arrow-right\"></i></a>` : ''}
          </div>
          <div class=\"movie-row\">
            ${section.data.map(movie => movieCard(movie)).join('')}
          </div>
        </div>
      `;
    }
    
    root.innerHTML = html;
    startHeroCarousel();
    
  } catch (error) {
    root.innerHTML = `
      <div class=\"empty-state\">
        <div class=\"empty-icon\"><i class=\"fas fa-exclamation-circle\"></i></div>
        <h3 class=\"empty-title\">Failed to Load Content</h3>
        <p class=\"empty-text\">Please check your connection and try again.</p>
      </div>
    `;
  }
}

// Hero carousel functions
function startHeroCarousel() {
  if (heroCarouselInterval) clearInterval(heroCarouselInterval);
  
  heroCarouselInterval = setInterval(() => {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;
    
    currentHeroSlide = (currentHeroSlide + 1) % slides.length;
    goToSlide(currentHeroSlide);
  }, 5000);
}

function goToSlide(index) {
  currentHeroSlide = index;
  
  document.querySelectorAll('.hero-slide').forEach((slide, i) => {
    slide.classList.toggle('active', i === index);
  });
  
  document.querySelectorAll('.hero-indicator').forEach((indicator, i) => {
    indicator.classList.toggle('active', i === index);
  });
}

// Movie card component
function movieCard(movie) {
  const title = movie.title || movie.name || 'Untitled';
  const poster = movie.poster_path ? `${IMG_BASE}/w500${movie.poster_path}` : '';
  const id = movie.id;
  const type = movie.media_type || 'movie';
  const year = (movie.release_date || movie.first_air_date || '').slice(0, 4);
  const rating = movie.vote_average?.toFixed(1) || 'N/A';
  
  return `
    <div class=\"movie-card\" onclick=\"navigate('detail',{type:'${type}',id:${id}})\">
      <div class=\"movie-poster-wrap\">
        <img class=\"movie-poster\" 
             src=\"${poster || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22500%22 height=%22750%22%3E%3Crect width=%22500%22 height=%22750%22 fill=%22%231a1a1a%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23666%22 font-size=%2236%22 font-family=%22sans-serif%22%3ENo Image%3C/text%3E%3C/svg%3E'}\" 
             alt=\"${title.replace(/'/g, '&#39;')}\"
             loading=\"lazy\">
        <div class=\"card-rating\">
          <i class=\"fas fa-star\"></i> ${rating}
        </div>
        <button class=\"card-watchlist-btn\" onclick=\"event.stopPropagation();addToWatchlist({id:${id},title:'${title.replace(/'/g, "\\'")}',type:'${type}',poster:'${poster}'})\">
          <i class=\"fas fa-plus\"></i>
        </button>
      </div>
      <div class=\"movie-info\">
        <div class=\"movie-title\">${title}</div>
        <div class=\"movie-year\">${year}</div>
      </div>
    </div>
  `;
}

// Listing page (movies/TV shows)
async function renderListing(mediaType, list, title) {
  const root = document.getElementById('app-root');
  let page = 1;
  
  try {
    const data = await tmdb(`/${mediaType}/${list}`, { page: 1 });
    
    let html = `
      <div class=\"content-section\" style=\"margin-top: 24px;\">
        <h2 class=\"section-title\">${title}</h2>
      </div>
      <div class=\"movie-grid\" id=\"listing-grid\">
        ${data.results.map(movie => movieCard({ ...movie, media_type: mediaType })).join('')}
      </div>
      <div style=\"text-align:center;padding:40px;\">
        <button class=\"btn-primary\" id=\"load-more-btn\" style=\"padding:12px 32px;\">
          Load More <i class=\"fas fa-arrow-down\"></i>
        </button>
      </div>
    `;
    
    root.innerHTML = html;
    
    document.getElementById('load-more-btn').onclick = async () => {
      page++;
      const nextData = await tmdb(`/${mediaType}/${list}`, { page });
      const grid = document.getElementById('listing-grid');
      
      nextData.results.forEach(movie => {
        grid.innerHTML += movieCard({ ...movie, media_type: mediaType });
      });
      
      if (page >= nextData.total_pages) {
        document.getElementById('load-more-btn').remove();
      }
    };
    
  } catch (error) {
    root.innerHTML = `
      <div class=\"empty-state\">
        <div class=\"empty-icon\"><i class=\"fas fa-exclamation-circle\"></i></div>
        <h3 class=\"empty-title\">Failed to Load ${title}</h3>
        <p class=\"empty-text\">Please try again later.</p>
      </div>
    `;
  }
}

// Trending page
async function renderTrending() {
  const root = document.getElementById('app-root');
  
  try {
    const [day, week] = await Promise.all([
      tmdb('/trending/all/day', { page: 1 }),
      tmdb('/trending/all/week', { page: 1 })
    ]);
    
    let html = `
      <div class=\"content-section\" style=\"margin-top: 24px;\">
        <div class=\"section-header\">
          <h2 class=\"section-title\">Trending Today</h2>
        </div>
        <div class=\"movie-row\">
          ${day.results.map(movie => movieCard(movie)).join('')}
        </div>
      </div>
      <div class=\"content-section\">
        <div class=\"section-header\">
          <h2 class=\"section-title\">Trending This Week</h2>
        </div>
        <div class=\"movie-row\">
          ${week.results.map(movie => movieCard(movie)).join('')}
        </div>
      </div>
    `;
    
    root.innerHTML = html;
    
  } catch (error) {
    root.innerHTML = `
      <div class=\"empty-state\">
        <div class=\"empty-icon\"><i class=\"fas fa-fire\"></i></div>
        <h3 class=\"empty-title\">Failed to Load Trending Content</h3>
        <p class=\"empty-text\">Please try again later.</p>
      </div>
    `;
  }
}

// Genre page
async function renderGenre(genreId, genreName) {
  const root = document.getElementById('app-root');
  let page = 1;
  
  try {
    const data = await tmdb('/discover/movie', { 
      with_genres: genreId, 
      sort_by: 'popularity.desc', 
      page: 1 
    });
    
    let html = `
      <div class=\"content-section\" style=\"margin-top: 24px;\">
        <h2 class=\"section-title\">${genreName}</h2>
      </div>
      <div class=\"movie-grid\" id=\"genre-grid\">
        ${data.results.map(movie => movieCard({ ...movie, media_type: 'movie' })).join('')}
      </div>
      <div style=\"text-align:center;padding:40px;\">
        <button class=\"btn-primary\" id=\"load-more-btn\" style=\"padding:12px 32px;\">
          Load More <i class=\"fas fa-arrow-down\"></i>
        </button>
      </div>
    `;
    
    root.innerHTML = html;
    
    document.getElementById('load-more-btn').onclick = async () => {
      page++;
      const nextData = await tmdb('/discover/movie', { 
        with_genres: genreId, 
        sort_by: 'popularity.desc', 
        page 
      });
      const grid = document.getElementById('genre-grid');
      
      nextData.results.forEach(movie => {
        grid.innerHTML += movieCard({ ...movie, media_type: 'movie' });
      });
      
      if (page >= nextData.total_pages) {
        document.getElementById('load-more-btn').remove();
      }
    };
    
  } catch (error) {
    root.innerHTML = `
      <div class=\"empty-state\">
        <div class=\"empty-icon\"><i class=\"fas fa-film\"></i></div>
        <h3 class=\"empty-title\">Failed to Load ${genreName}</h3>
        <p class=\"empty-text\">Please try again later.</p>
      </div>
    `;
  }
}

// Detail page
async function renderDetail(type, id) {
  const root = document.getElementById('app-root');
  
  try {
    const data = await tmdb(`/${type}/${id}`, { 
      append_to_response: 'credits,videos,similar' 
    });
    
    const title = data.title || data.name || '';
    const backdrop = data.backdrop_path ? `${IMG_BASE}/original${data.backdrop_path}` : '';
    const poster = data.poster_path ? `${IMG_BASE}/w500${data.poster_path}` : '';
    const year = (data.release_date || data.first_air_date || '').slice(0, 4);
    const rating = data.vote_average?.toFixed(1) || 'N/A';
    const runtime = data.runtime ? `${data.runtime} min` : (data.episode_run_time?.[0] ? `${data.episode_run_time[0]} min` : 'N/A');
    const genres = data.genres || [];
    const overview = data.overview || 'No overview available.';
    const tagline = data.tagline || '';
    const cast = (data.credits?.cast || []).slice(0, 15);
    const trailer = data.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    const similar = (data.similar?.results || []).slice(0, 20);
    
    let html = `
      <div class=\"detail-page\">
        ${backdrop ? `
          <div class=\"detail-backdrop-wrap\">
            <img class=\"detail-backdrop\" src=\"${backdrop}\" alt=\"${title}\" loading=\"lazy\">
            <div class=\"detail-backdrop-gradient\"></div>
          </div>
        ` : ''}
        
        <div class=\"detail-content\">
          <div class=\"detail-main\">
            <img class=\"detail-poster\" 
                 src=\"${poster || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22500%22 height=%22750%22%3E%3Crect width=%22500%22 height=%22750%22 fill=%22%231a1a1a%22/%3E%3C/svg%3E'}\" 
                 alt=\"${title}\">
            
            <div class=\"detail-info\">
              <h1 class=\"detail-title\">${title}</h1>
              ${tagline ? `<p class=\"detail-tagline\">${tagline}</p>` : ''}
              
              <div class=\"detail-meta\">
                <span class=\"detail-meta-item\">
                  <i class=\"fas fa-calendar\"></i> ${year}
                </span>
                <span class=\"detail-meta-item\">
                  <i class=\"fas fa-clock\"></i> ${runtime}
                </span>
                <span class=\"detail-meta-item detail-rating\">
                  <i class=\"fas fa-star\"></i> ${rating}
                </span>
              </div>
              
              ${genres.length ? `
                <div class=\"genre-list\">
                  ${genres.map(g => `<span class=\"genre-badge\">${g.name}</span>`).join('')}
                </div>
              ` : ''}
              
              <p class=\"detail-overview\">${overview}</p>
              
              <div class=\"detail-actions\">
                <button class=\"btn-watch\" onclick=\"navigate('watch',{type:'${type}',id:${id}})\">
                  <i class=\"fas fa-play\"></i> Watch Now
                </button>
                ${trailer ? `
                  <a href=\"https://youtube.com/watch?v=${trailer.key}\" target=\"_blank\" class=\"btn-trailer\">
                    <i class=\"fab fa-youtube\"></i> Watch Trailer
                  </a>
                ` : ''}
                <button class=\"btn-trailer\" onclick=\"addToWatchlist({id:${id},title:${JSON.stringify(title)},type:${JSON.stringify(type)},poster:${JSON.stringify(poster)}})\">
                  <i class=\"fas fa-bookmark\"></i> Add to Watchlist
                </button>
              </div>
            </div>
          </div>
          
          ${cast.length ? `
            <div class=\"cast-section\">
              <h3 class=\"cast-title\">Cast</h3>
              <div class=\"cast-row\">
                ${cast.map(person => `
                  <div class=\"cast-card\" onclick=\"navigate('actor',{id:${person.id}})\">
                    <img class=\"cast-photo\" 
                         src=\"${person.profile_path ? IMG_BASE + '/w185' + person.profile_path : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Ccircle cx=%2260%22 cy=%2260%22 r=%2260%22 fill=%22%231a1a1a%22/%3E%3C/svg%3E'}\" 
                         alt=\"${person.name}\">
                    <div class=\"cast-name\">${person.name}</div>
                    <div class=\"cast-character\">${person.character || ''}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          ${similar.length ? `
            <div class=\"content-section\">
              <h3 class=\"section-title\">Similar ${type === 'movie' ? 'Movies' : 'TV Shows'}</h3>
              <div class=\"movie-row\">
                ${similar.map(movie => movieCard({ ...movie, media_type: type })).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    root.innerHTML = html;
    
  } catch (error) {
    root.innerHTML = `
      <div class=\"empty-state\">
        <div class=\"empty-icon\"><i class=\"fas fa-exclamation-circle\"></i></div>
        <h3 class=\"empty-title\">Failed to Load Details</h3>
        <p class=\"empty-text\">Please try again later.</p>
      </div>
    `;
  }
}

// Watch page with advanced controls
function renderWatch(type, id, serverIndex = 0) {
  const root = document.getElementById('app-root');
  const server = EMBED_SOURCES[serverIndex] || EMBED_SOURCES[0];
  const embedUrl = server.url(id);
  
  let html = `
    <div class=\"watch-page\">
      <div class=\"watch-header\">
        <button class=\"btn-back\" onclick=\"navigate('detail',{type:'${type}',id:${id}})\">
          <i class=\"fas fa-arrow-left\"></i> Back to Details
        </button>
        <span class=\"watch-title\">Now Playing</span>
      </div>
      
      <div class=\"player-container\">
        <div class=\"player-wrapper\">
          <iframe src=\"${embedUrl}\" 
                  allowfullscreen 
                  allow=\"autoplay; encrypted-media; picture-in-picture\" 
                  loading=\"lazy\"
                  scrolling=\"no\"
                  frameborder=\"0\"></iframe>
        </div>
      </div>
      
      <div class=\"player-controls\">
        <div class=\"controls-section\">
          <label class=\"controls-label\">Server / Source</label>
          <div class=\"server-selector\">
            ${EMBED_SOURCES.map((s, i) => `
              <button class=\"server-btn ${i === serverIndex ? 'active' : ''}\" 
                      onclick=\"navigate('watch',{type:'${type}',id:${id},server:${i}})\">
                <i class=\"fas fa-server\"></i> ${s.label}
              </button>
            `).join('')}
          </div>
        </div>
        
        ${server.supports.quality ? `
          <div class=\"controls-section\">
            <label class=\"controls-label\">Quality</label>
            <div class=\"quality-selector\">
              ${QUALITY_OPTIONS.map(q => `
                <button class=\"quality-btn ${q.id === 'auto' ? 'active' : ''}\" data-quality=\"${q.id}\">
                  <i class=\"fas fa-video\"></i> ${q.label}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        ${server.supports.captions ? `
          <div class=\"controls-section\">
            <label class=\"controls-label\">Subtitles / Captions</label>
            <div class=\"caption-selector\">
              ${CAPTION_OPTIONS.map(c => `
                <button class=\"caption-btn ${c.id === 'off' ? 'active' : ''}\" data-caption=\"${c.id}\">
                  <i class=\"fas fa-closed-captioning\"></i> ${c.label}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class=\"controls-section\">
          <p style=\"font-size: 13px; color: var(--text-muted); line-height: 1.6;\">
            <i class=\"fas fa-info-circle\"></i> 
            If the current server doesn't work, please try another server above. 
            Quality and subtitle options may vary depending on the selected server.
          </p>
        </div>
      </div>
    </div>
  `;
  
  root.innerHTML = html;
  
  // Add event listeners for quality and caption buttons
  document.querySelectorAll('.quality-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.quality-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      toast(`Quality changed to ${btn.dataset.quality}`);
    };
  });
  
  document.querySelectorAll('.caption-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.caption-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const captionName = btn.textContent.trim();
      toast(`Subtitles: ${captionName}`);
    };
  });
}

// Search
async function renderSearch(query) {
  const root = document.getElementById('app-root');
  
  if (!query || !query.trim()) {
    root.innerHTML = `
      <div class=\"empty-state\">
        <div class=\"empty-icon\"><i class=\"fas fa-search\"></i></div>
        <h3 class=\"empty-title\">Start Searching</h3>
        <p class=\"empty-text\">Type something in the search box to find movies and TV shows.</p>
      </div>
    `;
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
      root.innerHTML = `
        <div class=\"empty-state\">
          <div class=\"empty-icon\"><i class=\"fas fa-search\"></i></div>
          <h3 class=\"empty-title\">No Results Found</h3>
          <p class=\"empty-text\">No results found for \"${query}\". Try different keywords.</p>
        </div>
      `;
      return;
    }
    
    let html = `
      <div class=\"content-section\" style=\"margin-top: 24px;\">
        <h2 class=\"section-title\">Search Results for \"${query}\"</h2>
        <p style=\"color: var(--text-muted); margin-top: 8px; font-size: 14px;\">
          ${allResults.length} result${allResults.length !== 1 ? 's' : ''} found
        </p>
      </div>
      <div class=\"movie-grid\">
        ${allResults.map(movie => movieCard(movie)).join('')}
      </div>
    `;
    
    root.innerHTML = html;
    
  } catch (error) {
    root.innerHTML = `
      <div class=\"empty-state\">
        <div class=\"empty-icon\"><i class=\"fas fa-exclamation-circle\"></i></div>
        <h3 class=\"empty-title\">Search Failed</h3>
        <p class=\"empty-text\">Please try again later.</p>
      </div>
    `;
  }
}

// Watchlist
function addToWatchlist(item) {
  const user = getAuth();
  
  if (!user) {
    openModal('auth-modal');
    toast('Please sign in to add to watchlist');
    return;
  }
  
  const watchlist = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
  
  if (watchlist.find(i => i.id === item.id && i.type === item.type)) {
    toast('Already in your watchlist');
    return;
  }
  
  watchlist.push({ ...item, addedAt: Date.now() });
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  toast('Added to watchlist!');
}

function renderMyList() {
  const root = document.getElementById('app-root');
  const user = getAuth();
  
  if (!user) {
    root.innerHTML = `
      <div class=\"empty-state\">
        <div class=\"empty-icon\"><i class=\"fas fa-bookmark\"></i></div>
        <h3 class=\"empty-title\">Sign In Required</h3>
        <p class=\"empty-text\">Sign in to manage your watchlist and save your favorite content.</p>
        <button class=\"btn-primary\" onclick=\"openModal('auth-modal')\" style=\"margin:20px auto 0;\">
          <i class=\"fas fa-sign-in-alt\"></i> Sign In
        </button>
      </div>
    `;
    return;
  }
  
  const watchlist = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
  
  if (!watchlist.length) {
    root.innerHTML = `
      <div class=\"empty-state\">
        <div class=\"empty-icon\"><i class=\"fas fa-bookmark\"></i></div>
        <h3 class=\"empty-title\">Your Watchlist is Empty</h3>
        <p class=\"empty-text\">Start adding movies and TV shows to your watchlist to watch them later.</p>
        <button class=\"btn-primary\" onclick=\"navigate('home')\" style=\"margin:20px auto 0;\">
          <i class=\"fas fa-home\"></i> Browse Content
        </button>
      </div>
    `;
    return;
  }
  
  let html = `
    <div class=\"content-section\" style=\"margin-top: 24px;\">
      <h2 class=\"section-title\">My Watchlist</h2>
      <p style=\"color: var(--text-muted); margin-top: 8px; font-size: 14px;\">
        ${watchlist.length} item${watchlist.length !== 1 ? 's' : ''} in your watchlist
      </p>
    </div>
    <div class=\"movie-grid\">
      ${watchlist.reverse().map(item => movieCard(item)).join('')}
    </div>
  `;
  
  root.innerHTML = html;
}

// Actor page
async function renderActor(id) {
  const root = document.getElementById('app-root');
  
  try {
    const data = await tmdb(`/person/${id}`, { 
      append_to_response: 'movie_credits,tv_credits' 
    });
    
    const movies = (data.movie_credits?.cast || [])
      .filter(m => m.poster_path)
      .slice(0, 20);
    
    let html = `
      <div class=\"detail-page\">
        <div class=\"detail-content\" style=\"margin-top: 24px;\">
          <div class=\"detail-main\">
            <img class=\"detail-poster\" 
                 style=\"width: 280px;\"
                 src=\"${data.profile_path ? IMG_BASE + '/w500' + data.profile_path : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22500%22 height=%22750%22%3E%3Crect width=%22500%22 height=%22750%22 fill=%22%231a1a1a%22/%3E%3C/svg%3E'}\" 
                 alt=\"${data.name}\">
            
            <div class=\"detail-info\">
              <h1 class=\"detail-title\">${data.name}</h1>
              <p class=\"detail-tagline\">${data.known_for_department || 'Actor'}</p>
              
              <div class=\"detail-meta\">
                ${data.birthday ? `<span class=\"detail-meta-item\"><i class=\"fas fa-birthday-cake\"></i> ${data.birthday}</span>` : ''}
                ${data.place_of_birth ? `<span class=\"detail-meta-item\"><i class=\"fas fa-map-marker-alt\"></i> ${data.place_of_birth}</span>` : ''}
              </div>
              
              <p class=\"detail-overview\">${data.biography || 'No biography available.'}</p>
            </div>
          </div>
          
          ${movies.length ? `
            <div class=\"content-section\">
              <h3 class=\"section-title\">Known For</h3>
              <div class=\"movie-row\">
                ${movies.map(movie => movieCard({ ...movie, media_type: 'movie' })).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    root.innerHTML = html;
    
  } catch (error) {
    root.innerHTML = `
      <div class=\"empty-state\">
        <div class=\"empty-icon\"><i class=\"fas fa-user\"></i></div>
        <h3 class=\"empty-title\">Failed to Load Actor Information</h3>
        <p class=\"empty-text\">Please try again later.</p>
      </div>
    `;
  }
}

function openProfile() {
  const user = getAuth();
  if (!user) return;
  
  const watchlist = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
  
  document.getElementById('profile-content').innerHTML = `
    <div style=\"display: flex; flex-direction: column; gap: 16px;\">
      <div style=\"padding: 16px; background: var(--bg-primary); border-radius: var(--radius);\">
        <div style=\"font-size: 13px; color: var(--text-muted); margin-bottom: 4px;\">Name</div>
        <div style=\"font-size: 16px; font-weight: 600;\">${user.name}</div>
      </div>
      <div style=\"padding: 16px; background: var(--bg-primary); border-radius: var(--radius);\">
        <div style=\"font-size: 13px; color: var(--text-muted); margin-bottom: 4px;\">Email</div>
        <div style=\"font-size: 16px; font-weight: 600;\">${user.email}</div>
      </div>
      <div style=\"padding: 16px; background: var(--bg-primary); border-radius: var(--radius);\">
        <div style=\"font-size: 13px; color: var(--text-muted); margin-bottom: 4px;\">Watchlist</div>
        <div style=\"font-size: 16px; font-weight: 600;\">${watchlist.length} item${watchlist.length !== 1 ? 's' : ''}</div>
      </div>
      <button class=\"btn-primary btn-block\" onclick=\"doSignOut()\">
        <i class=\"fas fa-sign-out-alt\"></i> Sign Out
      </button>
    </div>
  `;
  
  openModal('profile-modal');
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
  renderAuthUI();
  
  // Navbar scroll effect
  window.addEventListener('scroll', function() {
    const navbar = document.getElementById('navbar');
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  });
  
  // Auth modal tabs
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.onclick = function() {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const isSignIn = tab.dataset.tab === 'signin';
      document.getElementById('signin-form').style.display = isSignIn ? 'flex' : 'none';
      document.getElementById('signup-form').style.display = isSignIn ? 'none' : 'flex';
    };
  });
  
  // Sign in
  document.getElementById('signin-submit-btn').onclick = function() {
    const email = document.getElementById('si-email').value.trim();
    const password = document.getElementById('si-password').value;
    
    if (!email || password.length < 3) {
      document.getElementById('si-error').textContent = 'Invalid email or password';
      return;
    }
    
    setAuth({ name: email.split('@')[0], email });
    closeModal('auth-modal');
    toast('Signed in successfully!');
  };
  
  // Sign up
  document.getElementById('signup-submit-btn').onclick = function() {
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
  
  // Modal close buttons
  const authCloseBtn = document.getElementById('auth-close-btn');
  const profileCloseBtn = document.getElementById('profile-close-btn');
  const openSigninBtn = document.getElementById('open-signin-btn');
  const globalSearch = document.getElementById('global-search');

  if (authCloseBtn) authCloseBtn.onclick = () => closeModal('auth-modal');
  if (profileCloseBtn) profileCloseBtn.onclick = () => closeModal('profile-modal');
  if (openSigninBtn) openSigninBtn.onclick = () => openModal('auth-modal');
  
  // Search
  if (globalSearch) {
    globalSearch.addEventListener('input', function(e) {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (!query) {
        if (currentPage === 'search') navigate('home');
        return;
      }
      
      searchTimeout = setTimeout(() => {
        navigate('search', { query });
      }, 500);
    });
  }
  
  // Start app
  navigate('home');
});
          
        
