/* ============================================================
   CINEVERSE - script.js
   Netflix-style movie SPA powered by TMDB
   ============================================================ */

const TMDB_KEY    = '5e2176b3af584e2047c93f889e185eca';
const TMDB_BASE   = 'https://api.themoviedb.org/3';
const IMG_BASE    = 'https://image.tmdb.org/t/p';
const EMBED_SRCS  = [
  { label:'VidCore',    url:id=>`https://vidcore.xyz/embed/movie/${id}` },
  { label:'2Embed',     url:id=>`https://www.2embed.cc/embed/${id}` },
  { label:'VidSrc',     url:id=>`https://vidsrc.xyz/embed/movie/${id}` },
  { label:'SuperEmbed', url:id=>`https://multiembed.mov/directstream.php?video_id=${id}` },
];
let currentPage    = 'home';
let searchTimeout  = null;

const AUTH_KEY = 'cineverse_user';
function getAuth(){ try{return JSON.parse(localStorage.getItem(AUTH_KEY))}catch(e){return null}}
function setAuth(u){localStorage.setItem(AUTH_KEY,JSON.stringify(u)); renderAuthUI()}
function doSignOut(){localStorage.removeItem(AUTH_KEY); renderAuthUI(); navigate('home'); closeModal('profile-modal')}
function renderAuthUI(){
  const u=getAuth();
  document.getElementById('guest-btns').style.display=u?'none':'flex';
  document.getElementById('user-section').style.display=u?'block':'none';
  if(u){document.getElementById('user-avatar').textContent=u.name[0].toUpperCase();
    document.getElementById('menu-user-name').textContent=u.name;
    document.getElementById('menu-user-email').textContent=u.email}
}
function openModal(id){document.getElementById(id).style.display='flex'}
function closeModal(id){document.getElementById(id).style.display='none'}
function closeUserMenu(){const m=document.getElementById('user-menu');if(m)m.style.display='none'}
function toast(msg){const c=document.getElementById('toast-container');const el=document.createElement('div');el.className='toast';el.textContent=msg;c.appendChild(el);setTimeout(()=>el.remove(),3000);}

function navigate(page,params={}){
  currentPage=page;
  renderPage(page,params);
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.nav===page));
}
function navigateGenre(id,name){navigate('genre',{genreId:id,genreName:name})}

async function tmdb(endpoint,params={}){
  const q=new URLSearchParams({api_key:TMDB_KEY,language:'en-US',...params}).toString();
  const r=await fetch(`${TMDB_BASE}${endpoint}?${q}`);
  if(!r.ok)throw new Error(`TMDB ${r.status}`);
  return r.json();
}

function renderPage(page,params){
  const root=document.getElementById('app-root');
  root.innerHTML='<div class="spinner"></div>';
  const pages={
    home:       renderHome,
    movies:     ()=>renderListing('movie','now_playing','Movies'),
    tvshows:    ()=>renderListing('tv','popular','TV Shows'),
    genre:      ()=>renderGenre(params.genreId,params.genreName),
    detail:     ()=>renderDetail(params.type||'movie',params.id),
    watch:      ()=>renderWatch(params.type,params.id,params.src||0),
    search:     ()=>renderSearch(params.query),
    mylist:     ()=>renderMyList(),
    actor:      ()=>renderActor(params.id),
  };
  (pages[page]||pages.home)();
}

async function renderHome(){
  const root=document.getElementById('app-root');
  const [trending,popular,topRated,nowPlaying]=await Promise.all([
    tmdb('/trending/movie/week',{page:1}),
    tmdb('/movie/popular',{page:1}),
    tmdb('/movie/top_rated',{page:1}),
    tmdb('/movie/now_playing',{page:1}),
  ]);
  const hero=trending.results[0];
  let html=`
    <div class="hero-section">
      <img class="hero-backdrop" src="${IMG_BASE}/w1280${hero.backdrop_path}" alt="" loading="lazy" onerror="this.style.display='none'">
      <div class="hero-overlay">
        <div class="hero-title">${hero.title||hero.name}</div>
        <div class="hero-meta"><span>â ${hero.vote_average?.toFixed(1)}</span><span>${hero.release_date?.slice(0,4)||''}</span></div>
        <div class="hero-desc">${hero.overview||''}</div>
        <button class="hero-btn" onclick="navigate('detail',{type:'movie',id:${hero.id}})">â¶ï¸ Watch Now</button>
      </div>
    </div>`;
  const sections=[
    {title:'ð¥ Trending Now',  data:trending.results},
    {title:'â­ï¸ Top Rated',     data:topRated.results},
    {title:'ðº Popular',      data:popular.results},
    {title:'ð¬ Now Playing',  data:nowPlaying.results},
  ];
  for(const s of sections){
    html+=`<h2 class="section-title">${s.title}</h2><div class="movie-row">`;
    for(const m of s.data)html+=movieCard(m);
    html+=`</div>`;
  }
  root.innerHTML=html;
}

function movieCard(m){
  const t=m.title||m.name||'Untitled';
  const p=m.poster_path?`${IMG_BASE}/w342${m.poster_path}`:'';
  const id=m.id; const type=m.media_type||'movie';
  const yr=(m.release_date||m.first_air_date||'').slice(0,4);
  return `<div class="movie-card" onclick="navigate('detail',{type:'${type}',id:${id}})">
    <img class="movie-poster" src="${p}" alt="${t}" loading="lazy" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22 fill=%22%231a1a24%22><rect width=%22300%22 height=%22450%22/></svg>'">
    <div class="movie-info"><div class="movie-title">${t}</div><div class="movie-sub"><span>${yr}</span></div></div>
  </div>`;
}

async function renderListing(mediaType,list,title){
  const root=document.getElementById('app-root');
  let page=1;
  const p1=await tmdb(`/${mediaType}/${list}`,{page:1});
  let html=`<h2 class="section-title" style="margin-top:16px">${title}</h2><div class="movie-grid" id="listing-grid">`;
  for(const m of p1.results)html+=movieCard(m);
  html+=`</div><button class="load-more-btn" id="load-more-btn">Load More</button>`;
  root.innerHTML=html;
  document.getElementById('load-more-btn').onclick=async()=>{
    page++; const p=await tmdb(`/${mediaType}/${list}`,{page});
    const grid=document.getElementById('listing-grid');
    for(const m of p.results)grid.innerHTML+=movieCard(m);
    if(page>=p.total_pages)document.getElementById('load-more-btn').remove();
  };
}

async function renderGenre(genreId,genreName){
  const root=document.getElementById('app-root');
  let page=1;
  const p1=await tmdb('/discover/movie',{with_genres:genreId,sort_by:'popularity.desc',page:1});
  let html=`<h2 class="section-title" style="margin-top:16px">${genreName}</h2><div class="movie-grid" id="genre-grid">`;
  for(const m of p1.results)html+=movieCard(m);
  html+=`</div><button class="load-more-btn" id="load-more-btn">Load More</button>`;
  root.innerHTML=html;
  document.getElementById('load-more-btn').onclick=async()=>{
    page++; const p=await tmdb('/discover/movie',{with_genres:genreId,sort_by:'popularity.desc',page});
    const grid=document.getElementById('genre-grid');
    for(const m of p.results)grid.innerHTML+=movieCard(m);
    if(page>=p.total_pages)document.getElementById('load-more-btn').remove();
  };
}

async function renderDetail(type,id){
  const root=document.getElementById('app-root');
  try{
    const d=await tmdb(`/${type}/${id}`,{append_to_response:'credits,videos'});
    const cast=(d.credits?.cast||[]).slice(0,12);
    const trailer=d.videos?.results?.find(v=>v.type==='Trailer'&&v.site==='YouTube');
    const bg=d.backdrop_path?`${IMG_BASE}/w1280${d.backdrop_path}`:'';
    const poster=d.poster_path?`${IMG_BASE}/w500${d.poster_path}`:'';
    const title=d.title||d.name||'';
    const yr=(d.release_date||d.first_air_date||'').slice(0,4);
    const genres=d.genres||[];
    const runtime=d.runtime?`${d.runtime} min`:(d.episode_run_time?.[0]?`${d.episode_run_time[0]} min`:'â');
    const rating=d.vote_average?.toFixed(1)||'N/A';
    const overview=d.overview||'No overview available.';
    const tagline=d.tagline||'';

    let html=`
      <div style="position:relative">
        ${bg?`<img class="detail-backdrop" src="${bg}" alt="" onerror="this.style.display='none'">`:''}
        <div class="detail-section">
          <div class="detail-top">
          <img class="detail-poster" src="${poster}" alt="${title}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22 fill=%22%231a1a24%22><rect width=%22300%22 height=%22450%22/></svg>'">
            <div class="detail-info">
              <h1 class="detail-title">${title}</h1>
              ${tagline?`<p class="detail-tagline">${tagline}</p>`:''}
              <div class="detail-meta"><span>${yr}</span><span>${runtime}</span><span>â ${rating}</span></div>
              <div class="detail-meta">${genres.map(g=>`<span class="genre-pill">${g.name}</span>`).join('')}</div>
              ${trailer?`<a href="https://youtube.com/watch?v=${trailer.key}" target="_blank" class="btn-secondary" style="margin:8px 0;width:fit-content">â¶ï¸ Watch Trailer</a>`:''}
              <div class="watch-section">
                <button class="watch-btn" onclick="navigate('watch',{type:'${type}',id:${id}})">â¶ï¸ Watch Now</button>
                ${EMBED_SRCS.map((s,i)=>`<button class="server-btn" onclick="navigate('watch',{type:'${type}',id:${id},src:${i}})">${s.label}</button>`).join('')}
              </div>
              <p class="detail-overview" style="margin-top:16px">${overview}</p>
            </div>
          </div>
          ${cast.length?`<h3 style="margin-top:24px;font-size:1.1rem;font-weight:700">Cast</h3>
          <div class="cast-row">${cast.map(c=>`
            <div class="cast-card" onclick="navigate('actor',{id:${c.id}})">
              <img class="cast-img" src="${c.profile_path?IMG_BASE+'/w185'+c.profile_path:''}" alt="${c.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2290%22 height=%2290%22 fill=%22%231a1a24%22><rect width=%2290%22 height=%2290%22/></svg>'">
              <div class="cast-name">${c.name}</div>
              <div class="cast-role">${c.character||''}</div>
            </div>`).join('')}</div>`:''}
        </div>
      </div>`;
    root.innerHTML=html;
  }catch(e){root.innerHTML=`<div style="padding:40px;text-align:center;color:var(--text-muted)">â ï¸ Failed to load details.</div>`}
}

function renderWatch(type,id,srcIdx=0){
  const root=document.getElementById('app-root');
  const src=EMBED_SRCS[srcIdx]||EMBED_SRCS[0];
  const embedUrl=src.url(id);
  let html=`
    <div class="watch-page">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
        <button class="btn-secondary" onclick="navigate('detail',{type:'${type}',id:${id}})">â Back</button>
        <span style="font-weight:600;font-size:1rem">${src.label}</span>
      </div>
      <div class="watch-player-wrap">
        <iframe src="${embedUrl}" allowfullscreen allow="autoplay;encrypted-media" loading="lazy"></iframe>
      </div>
      <div class="server-selector">
        ${EMBED_SRCS.map((s,i)=>`<button class="server-btn ${i===srcIdx?'active':''}" onclick="navigate('watch',{type:'${type}',id:${id},src:${i}})">${s.label}</button>`).join('')}
      </div>
    </div>`;
  root.innerHTML=html;
}

async function renderSearch(query){
  const root=document.getElementById('app-root');
  if(!query||!query.trim()){root.innerHTML=`<div style="padding:40px;text-align:center;color:var(--text-muted)">Type something to search.</div>`;return}
  root.innerHTML=`<div style="padding:40px;text-align:center"><div class="spinner"></div></div>`;
  try{
    const [movies,tv]=await Promise.all([
      tmdb('/search/movie',{query,page:1}),
      tmdb('/search/tv',{query,page:1}),
    ]);
    const all=[...movies.results.map(m=>({...m,media_type:'movie'})),
               ...tv.results.map(t=>({...t,media_type:'tv'}))];
    if(!all.length){root.innerHTML=`<div style="padding:40px;text-align:center;color:var(--text-muted)">No results for "${query}"</div>`;return}
    let html=`<h2 class="section-title" style="margin-top:16px">Search: "${query}" <span style="font-weight:400;color:var(--text-muted);font-size:.85rem">${all.length} results</span></h2><div class="movie-grid">`;
    for(const m of all)html+=movieCard(m);
     html+=`</div>`;
    root.innerHTML=html;
  }catch(e){root.innerHTML=`<div style="padding:40px;text-align:center;color:var(--text-muted)">Search failed.</div>`}
}

function renderMyList(){
  const root=document.getElementById('app-root');
  const u=getAuth();
  if(!u){root.innerHTML=`<div style="padding:60px 20px;text-align:center"><p style="font-size:1.2rem;margin-bottom:12px">Sign in to manage your list</p><button class="btn-primary" style="margin:0 auto" onclick="openModal('auth-modal')">Sign In</button></div>`;return}
  const list=JSON.parse(localStorage.getItem('cineverse_mylist')||'{}');
  const cats=['watching','completed','plan_to_watch','on_hold','dropped'];
  const catLabels={watching:'Watching',completed:'Completed',plan_to_watch:'Plan to Watch',on_hold:'On Hold',dropped:'Dropped'};
  let activeCat='watching';
  let html=`<h2 class="section-title" style="margin-top:16px">My List</h2><div class="list-categories">`;
  for(const c of cats)html+=`<button class="list-cat-btn ${c===activeCat?'active':''}" data-cat="${c}">${catLabels[c]}</button>`;
  html+=`</div><div class="list-grid" id="mylist-grid">`;
  const items=list[activeCat]||[];
  if(!items.length)html+=`<p style="color:var(--text-muted);grid-column:1/-1;padding:20px">Nothing here yet.</p>`;
  root.innerHTML=html;
  const grid=document.getElementById('mylist-grid');
  for(const item of items){
    grid.innerHTML+=`<div class="movie-card" onclick="navigate('detail',{type:'${item.type}',id:${item.id}})">
      <img class="movie-poster" src="${item.poster}" alt="" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22 fill=%22%231a1a24%22><rect width=%22300%22 height=%22450%22/></svg>'">
      <div class="movie-info"><div class="movie-title">${item.title}</div></div>
    </div>`;
  }
  document.querySelectorAll('.list-cat-btn').forEach(b=>{
    b.onclick=()=>{
      document.querySelectorAll('.list-cat-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      activeCat=b.dataset.cat;
      const items2=list[activeCat]||[];
      const g=document.getElementById('mylist-grid');
      g.innerHTML='';
      if(!items2.length){g.innerHTML=`<p style="color:var(--text-muted);grid-column:1/-1;padding:20px">Nothing here yet.</p>`;return}
      for(const item of items2){
        g.innerHTML+=`<div class="movie-card" onclick="navigate('detail',{type:'${item.type}',id:${item.id}})">
          <img class="movie-poster" src="${item.poster}" alt="" onerror="...">
          <div class="movie-info"><div class="movie-title">${item.title}</div></div>
        </div>`;
      }
    };
  });
}

async function renderActor(id){
  const root=document.getElementById('app-root');
  root.innerHTML='<div class="spinner"></div>';
  try{
    const d=await tmdb(`/person/${id}`,{append_to_response:'movie_credits'});
    const known=d.movie_credits?.cast?.slice(0,20)||[];
    const html=`
      <div class="actor-header">
        <img class="actor-photo" src="${d.profile_path?IMG_BASE+'/w342'+d.profile_path:''}" alt="${d.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22450%22 fill=%22%231a1a24%22><rect width=%22300%22 height=%22450%22/></svg>'">
        <div class="actor-bio">
          <h1 class="actor-name">${d.name}</h1>
          <div class="actor-department">${d.known_for_department||''}</div>
          <p style="margin-top:10px;color:var(--text-secondary);font-size:.88rem;line-height:1.7">${d.biography||'No biography available.'}</p>
        </div>
      </div>
      ${known.length?`<h3 style="padding:0 24px;font-size:1.1rem;font-weight:700">Filmography</h3>
      <div class="movie-row" style="margin-top:8px">${known.map(m=>movieCard({...m,media_type:'movie'})).join('')}</div>`:''}`;
    root.innerHTML=html;
  }catch(e){root.innerHTML=`<div style="padding:40px;text-align:center;color:var(--text-muted)">Failed to load actor.</div>`}
}

document.addEventListener('DOMContentLoaded',function(){
  renderAuthUI();
   window.addEventListener('scroll',function(){
    document.getElementById('navbar').classList.toggle('scrolled',window.scrollY>40);
  });
  var gb=document.getElementById('genresBtn');
  var gd=document.getElementById('genresDropdown');
  if(gb) gb.addEventListener('click',function(e){e.stopPropagation();gd.classList.toggle('show')});
  document.addEventListener('click',function(){if(gd)gd.classList.remove('show')});
  document.getElementById('open-signin-btn')?.addEventListener('click',function(){openModal('auth-modal')});
  document.getElementById('open-signup-btn')?.addEventListener('click',function(){
    openModal('auth-modal');
    document.getElementById('signin-form').style.display='none';
    document.getElementById('signup-form').style.display='block';
    document.querySelectorAll('.auth-tab-btn').forEach(function(b){b.classList.toggle('active',b.id==='tab-signup-btn')});
  });
  document.getElementById('auth-close-btn')?.addEventListener('click',function(){closeModal('auth-modal')});
  document.getElementById('profile-close-btn')?.addEventListener('click',function(){closeModal('profile-modal')});
  document.querySelectorAll('.auth-tab-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      document.querySelectorAll('.auth-tab-btn').forEach(function(b){b.classList.remove('active')});
      btn.classList.add('active');
      var isSignin=btn.id==='tab-signin-btn';
      document.getElementById('signin-form').style.display=isSignin?'block':'none';
      document.getElementById('signup-form').style.display=isSignin?'none':'block';
    });
  });
  document.getElementById('signin-submit-btn')?.addEventListener('click',function(){
    var email=document.getElementById('si-email').value.trim();
    var pass=document.getElementById('si-password').value;
    if(!email||pass.length<3){document.getElementById('si-error').textContent='Invalid credentials.'; return}
    setAuth({name:email.split('@')[0],email});
    closeModal('auth-modal'); toast('Signed in!');
  });
  document.getElementById('signup-submit-btn')?.addEventListener('click',function(){
    var name=document.getElementById('su-name').value.trim();
    var email=document.getElementById('su-email').value.trim();
    var pass=document.getElementById('su-password').value;
    var confirm=document.getElementById('su-confirm').value;
    if(!name||!email||pass.length<6||pass!==confirm){
      document.getElementById('su-error').textContent='Please fill all fields correctly. Password min 6, must match.';
      return;
    }
    setAuth({name,email});
    closeModal('auth-modal'); toast('Account created!');
  });
  document.getElementById('user-avatar-btn')?.addEventListener('click',function(e){
    e.stopPropagation();
    var m=document.getElementById('user-menu');
    if(m) m.style.display=m.style.display==='block'?'none':'block';
  });
  document.addEventListener('click',function(){var m=document.getElementById('user-menu');if(m)m.style.display='none'});
  document.getElementById('global-search')?.addEventListener('input',function(e){
    clearTimeout(searchTimeout);
    var q=e.target.value.trim();
    if(!q){if(currentPage==='search')navigate('home');return}
    searchTimeout=setTimeout(function(){navigate('search',{query:q})},400);
  });
  navigate('home');
});

function openProfile(){
  closeUserMenu();
  var u=getAuth(); if(!u)return;
  document.getElementById('profile-content').innerHTML=`
    <div class="space-y-3">
      <div><label class="stat-label">Name</label><div class="stat-value">${u.name}</div></div>
      <div><label class="stat-label">Email</label><div class="stat-value">${u.email}</div></div>
      <button class="btn-primary" onclick="doSignOut()" style="margin-top:8px">Sign Out</button>
    </div>`;
  openModal('profile-modal');
}
          
        
