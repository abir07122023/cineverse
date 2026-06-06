export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { endpoint, ...params } = req.query;
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });

  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  if (!TMDB_API_KEY) {
    console.error('TMDB_API_KEY not set');
    return res.status(500).json({ error: 'API key missing on server' });
  }

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
