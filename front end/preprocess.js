import fs from 'fs';
import path from 'path';

console.log("Starting JavaScript-based Movie Preprocessor...");

const moviesPath = path.resolve('..', 'tmdb_5000_movies.csv');
const creditsPath = path.resolve('..', 'tmdb_5000_credits.csv');

// Helper: Custom CSV Parser (Handles quotes, newlines, and escaped quotes inside JSON columns)
function parseCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf-8');
  const result = [];
  let row = [];
  let col = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && next === '"') {
        col += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(col.trim());
      col = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      row.push(col.trim());
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        result.push(row);
      }
      row = [];
      col = '';
      if (char === '\r' && next === '\n') i++;
    } else {
      col += char;
    }
  }
  if (col !== '' || row.length > 0) {
    row.push(col.trim());
    result.push(row);
  }
  return result;
}

try {
  // Read and parse Movies CSV
  console.log("Reading and parsing tmdb_5000_movies.csv...");
  const moviesRaw = parseCSV(moviesPath);
  const moviesHeader = moviesRaw[0];
  const moviesRows = moviesRaw.slice(1);
  
  const mColIdx = {
    id: moviesHeader.indexOf('id'),
    title: moviesHeader.indexOf('title'),
    genres: moviesHeader.indexOf('genres'),
    overview: moviesHeader.indexOf('overview'),
    popularity: moviesHeader.indexOf('popularity'),
    release_date: moviesHeader.indexOf('release_date'),
    runtime: moviesHeader.indexOf('runtime'),
    vote_average: moviesHeader.indexOf('vote_average'),
    keywords: moviesHeader.indexOf('keywords')
  };

  // Read and parse Credits CSV
  console.log("Reading and parsing tmdb_5000_credits.csv...");
  const creditsRaw = parseCSV(creditsPath);
  const creditsHeader = creditsRaw[0];
  const creditsRows = creditsRaw.slice(1);
  
  const cColIdx = {
    movie_id: creditsHeader.indexOf('movie_id'),
    cast: creditsHeader.indexOf('cast'),
    crew: creditsHeader.indexOf('crew')
  };

  // Map Credits by Movie ID
  console.log("Mapping credits data...");
  const creditsMap = new Map();
  creditsRows.forEach(row => {
    const id = row[cColIdx.movie_id];
    const castRaw = row[cColIdx.cast];
    const crewRaw = row[cColIdx.crew];
    
    let cast = [];
    let crew = [];
    
    try {
      if (castRaw) {
        // Parse JSON safely
        const parsedCast = JSON.parse(castRaw);
        cast = parsedCast.slice(0, 3).map(c => c.name);
      }
    } catch (e) {}

    try {
      if (crewRaw) {
        const parsedCrew = JSON.parse(crewRaw);
        const directorObj = parsedCrew.find(c => c.job === 'Director');
        if (directorObj) {
          crew = [directorObj.name];
        }
      }
    } catch (e) {}

    creditsMap.set(id, { cast, director: crew[0] || '' });
  });

  // Preprocess Movies
  console.log("Preprocessing movies and building search tags...");
  const preprocessedMovies = [];

  // Simple Stopwords Set
  const stopwords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'cannot', 'could', 
    'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 
    'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 
    'it', 'its', 'itself', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 
    'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 
    'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 
    'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 
    'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 
    'yourself', 'yourselves'
  ]);

  moviesRows.forEach(row => {
    const id = row[mColIdx.id];
    const title = row[mColIdx.title];
    const genresRaw = row[mColIdx.genres];
    const keywordsRaw = row[mColIdx.keywords];
    const overview = row[mColIdx.overview] || '';
    const popularity = parseFloat(row[mColIdx.popularity]) || 0.0;
    const release_date = row[mColIdx.release_date] || 'Unknown';
    const runtime = parseInt(row[mColIdx.runtime]) || 0;
    const vote_average = parseFloat(row[mColIdx.vote_average]) || 0.0;

    let genres = [];
    try {
      if (genresRaw) {
        genres = JSON.parse(genresRaw).map(g => g.name);
      }
    } catch (e) {}

    let keywords = [];
    try {
      if (keywordsRaw) {
        keywords = JSON.parse(keywordsRaw).map(k => k.name);
      }
    } catch (e) {}

    // Get credits
    const credits = creditsMap.get(id) || { cast: [], director: '' };

    // Format display names
    const display_genres = genres;
    const display_cast = credits.cast;
    const display_director = credits.director;

    // Create tags for recommendation
    const cleanGenres = genres.map(g => g.replace(/\s+/g, '').toLowerCase());
    const cleanKeywords = keywords.map(k => k.replace(/\s+/g, '').toLowerCase());
    const cleanCast = credits.cast.map(c => c.replace(/\s+/g, '').toLowerCase());
    const cleanDirector = credits.director ? [credits.director.replace(/\s+/g, '').toLowerCase()] : [];
    
    // Overview words
    const overviewWords = overview
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w && !stopwords.has(w));

    // Combined tags string
    const tags = [
      ...overviewWords,
      ...cleanGenres,
      ...cleanKeywords,
      ...cleanCast,
      ...cleanDirector
    ];
    
    const tags_str = tags.join(' ');

    preprocessedMovies.push({
      id: parseInt(id),
      title: title,
      overview: overview,
      genres: display_genres,
      cast: display_cast,
      director: display_director,
      vote_average: vote_average,
      popularity: popularity,
      release_date: release_date,
      runtime: runtime,
      tags_str: tags_str
    });
  });

  // Write preprocessed movies as JSON asset
  const outDir = path.resolve('src');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, 'movies_data.json');
  fs.writeFileSync(outPath, JSON.stringify(preprocessedMovies, null, 2), 'utf-8');
  console.log(`Success! Preprocessed ${preprocessedMovies.length} movies and saved to ${outPath}`);

} catch (err) {
  console.error("Error during preprocessing:", err);
}
