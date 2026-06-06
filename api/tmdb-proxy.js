export default async function handler(req, res) {
  // Set CORS headers to allow your frontend to access the proxy
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Extract the TMDB endpoint and parameters from the request
  const { endpoint, ...params } = req.query;
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint parameter' });

  // Retrieve the API key from Vercel's environment variables
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY is not set in environment');
    return res.status(500).json({ error: 'Server configuration error: missing API key' });
  }

  // Build the target URL
  let url = `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API_KEY}`;
  for (const [key, value] of Object.entries(params)) {
    url += `&${key}=${encodeURIComponent(value)}`;
  }

  // Create an AbortController to set a timeout on the fetch request
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);
    const data = await response.json();
    // Forward the exact status code and data from TMDB
    res.status(response.status).json(data);
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('Proxy fetch error:', {
      message: err.message,
      name: err.name,
      url: url,
    });
    if (err.name === 'AbortError') {
      res.status(504).json({ error: 'Request to TMDB timed out after 15 seconds' });
    } else {
      res.status(500).json({ error: 'Internal proxy error', details: err.message });
    }
  }
}
