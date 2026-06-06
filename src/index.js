// src/index.js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    // Preserve the full path and query string
    const destination = `https://cineverse-free.vercel.app${url.pathname}${url.search}`;
    // 301 = Permanent Redirect (good for SEO)
    return Response.redirect(destination, 301);
  }
};
