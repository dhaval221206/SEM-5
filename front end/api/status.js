export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    status: 'ready',
    service: 'Movie Recommender System API',
    total_movies: 4809,
    models_loaded: true,
    engine: 'ML Vector Similarity Engine (Vercel Serverless)'
  });
}
