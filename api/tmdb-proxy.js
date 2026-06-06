export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { endpoint, ...params } = req.query;
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint parameter' });

  // Retrieve the API key from Vercel's environment variables
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) return res.status(500).json({ error: 'API key missing on server' });

  // Build the request URL for TMDB
  let url = `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API_KEY}`;
  for (const [key, value] of Object.entries(params)) {
    url += `&${key}=${encodeURIComponent(value)}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Internal proxy error' });
  }
}
