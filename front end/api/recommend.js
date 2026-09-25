import moviesData from '../src/movies_data.json';

const buildVocab = () => {
  const wordCounts = {};
  moviesData.forEach(m => {
    if (!m || !m.tags_str) return;
    const words = m.tags_str.split(/\s+/);
    words.forEach(w => {
      if (!w || w.length < 2) return;
      wordCounts[w] = (wordCounts[w] || 0) + 1;
    });
  });
  const sorted = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5000);
  return new Set(sorted.map(entry => entry[0]));
};

let cachedVocab = null;

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const startTime = Date.now();
  const { movie: movieTitle, method = 'library' } = req.query;

  if (!movieTitle) {
    return res.status(400).json({ error: 'Movie title parameter is required' });
  }

  const searchTitle = movieTitle.trim().toLowerCase();
  let movieIndex = moviesData.findIndex(m => m && m.title.toLowerCase() === searchTitle);

  if (movieIndex === -1) {
    movieIndex = moviesData.findIndex(m => m && m.title.toLowerCase().includes(searchTitle));
  }

  if (movieIndex === -1) {
    return res.status(404).json({ error: `Movie '${movieTitle}' not found in database` });
  }

  const selectedMovie = moviesData[movieIndex];
  
  if (!cachedVocab) {
    cachedVocab = buildVocab();
  }

  const getWordsMap = (tagsStr, useVocabLimit) => {
    if (!tagsStr) return {};
    const words = tagsStr.split(/\s+/);
    const counts = {};
    words.forEach(w => {
      if (!w) return;
      if (useVocabLimit && !cachedVocab.has(w)) return;
      counts[w] = (counts[w] || 0) + 1;
    });
    return counts;
  };

  const useVocab = method === 'library';
  const queryTags = selectedMovie.tags_str || `${selectedMovie.overview || ''} ${(selectedMovie.genres || []).join(' ')} ${selectedMovie.director || ''}`.toLowerCase();
  const queryVector = getWordsMap(queryTags, useVocab);
  const queryNorm = Math.sqrt(Object.values(queryVector).reduce((sum, val) => sum + val * val, 0));

  const scores = moviesData.map((otherMovie, idx) => {
    if (!otherMovie || idx === movieIndex) return { idx, score: -1 };

    const otherVector = getWordsMap(otherMovie.tags_str, useVocab);
    let dotProduct = 0;
    Object.keys(queryVector).forEach(word => {
      if (otherVector[word]) {
        dotProduct += queryVector[word] * otherVector[word];
      }
    });

    if (dotProduct === 0 || queryNorm === 0) return { idx, score: 0 };

    const otherNorm = Math.sqrt(Object.values(otherVector).reduce((sum, val) => sum + val * val, 0));
    const similarity = dotProduct / (queryNorm * otherNorm);

    return { idx, score: similarity };
  });

  const sorted = scores.sort((a, b) => b.score - a.score).slice(0, 5);
  const recommendations = sorted.map(item => moviesData[item.idx]);
  const executionTimeMs = Date.now() - startTime;

  return res.status(200).json({
    selected_movie: {
      id: selectedMovie.id,
      title: selectedMovie.title,
      overview: selectedMovie.overview,
      genres: selectedMovie.genres,
      cast: selectedMovie.cast,
      director: selectedMovie.director,
      vote_average: selectedMovie.vote_average,
      popularity: selectedMovie.popularity,
      release_date: selectedMovie.release_date,
      runtime: selectedMovie.runtime
    },
    recommendations: recommendations.map(m => ({
      id: m.id,
      title: m.title,
      overview: m.overview,
      genres: m.genres,
      cast: m.cast,
      director: m.director,
      vote_average: m.vote_average,
      popularity: m.popularity,
      release_date: m.release_date,
      runtime: m.runtime
    })),
    execution_time_ms: Math.max(executionTimeMs, 1),
    method: method,
    source: 'backend_api'
  });
}
