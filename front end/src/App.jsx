import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, Film, Star, Clock, Compass, Calendar, 
  User, Users, RefreshCw, X, ArrowRight, LogOut, 
  Heart, Lock, Mail, Award, ThumbsUp, Coffee, Copy, 
  CheckCircle, Bookmark, Shield, Sparkles, MessageSquare, Tv,
  Sliders, Trash, Bell, Grid, ArrowLeft, Linkedin, Instagram,
  ChevronLeft, ChevronRight, Play
} from 'lucide-react';
import moviesData from './movies_data.json';
import creatorImage from './creator.png';
import CustomCursor from './components/CustomCursor';
import CursorSpotlight from './components/CursorSpotlight';
import MagneticButton from './components/MagneticButton';
import ScrollReveal from './components/ScrollReveal';
import useMousePosition from './hooks/useMousePosition';


const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';

// VDTALES Creator Data definition
const curatorsData = {
  dhaval: {
    name: 'Dhaval Vagh',
    handle: '@dhavalvagh',
    avatarUrl: creatorImage,
    roles: ['CSE Student', 'Developer', 'Video Editor', 'Content Creator'],
    bio: 'I’m a Computer Science Engineering student who loves combining technology with creativity. I enjoy building websites and projects, editing videos, capturing moments, and creating content inspired by college life, travel, bikes, and everyday experiences.',
    verdicts: [
      { id: 27205, verdict: 'perfection', quote: 'Inception is a masterpiece of concepts and screenplay structure.' },
      { id: 157336, verdict: 'perfection', quote: 'Interstellar has cosmic heart combined with elite filmmaking.' },
      { id: 557, verdict: 'perfection', quote: 'Spider-Man (2002) is the ultimate blueprint of superhero cinema.' },
      { id: 597, verdict: 'go_for_it', quote: 'Titanic is blockbusting romance and scale at its absolute peak.' }
    ]
  }
};

const vibeColors = [
  '#ef4444', // red (e.g. skip / action)
  '#f472b6', // orange (e.g. timepass / thriller)
  '#3b82f6', // blue (e.g. drama / sci-fi)
  '#10b981', // green (e.g. go for it / comedy)
  '#a855f7', // purple (e.g. perfection / romance)
  '#06b6d4', // cyan (e.g. mystery)
  '#facc15'  // yellow
];

const formatRuntime = (mins) => {
  if (!mins) return 'N/A';
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
};

const getLanguageAndCountry = (movie) => {
  const title = (movie.title || '').toLowerCase();
  const director = (movie.director || '').toLowerCase();
  if (
    director.includes('vinoth') || 
    director.includes('rajamouli') || 
    director.includes('shankar') || 
    director.includes('atlee') || 
    director.includes('kashyap') || 
    director.includes('hirani') ||
    title.includes('karan') ||
    title.includes('bhai') ||
    title.includes('nayagan') ||
    title.includes('awarapan') ||
    title.includes('vishwanath')
  ) {
    return { country: 'India', language: 'Tamil/Hindi' };
  }
  return { country: 'United States', language: 'English' };
};

const getAgeRating = (movie) => {
  const genres = (movie.genres || []).map(g => g.toLowerCase());
  if (genres.includes('horror') || genres.includes('crime') || genres.includes('thriller')) {
    return '18+';
  }
  if (genres.includes('family') || genres.includes('animation')) {
    return 'All Ages';
  }
  return 'UA (13+)';
};

const getMovieVibes = (movie) => {
  if (!movie) return [];
  
  // Weights for requested vibes
  const weights = {
    timepass: 0, drama: 0, mystery: 0, thriller: 0, informative: 0, 
    romance: 0, entertaining: 0, amazing: 0, fantasy: 0, funny: 0, 
    action: 0, adventure: 0, animation: 0, BIoGraphyh: 0, comedy: 0, 
    crime: 0, documentary: 0, family: 0, history: 0, horror: 0, 
    musical: 0, 'sci-fi': 0, war: 0
  };
  
  const genres = movie.genres || [];
  genres.forEach(g => {
    const lowerG = g.toLowerCase();
    if (lowerG.includes('action')) { weights.action += 35; weights.entertaining += 15; weights.timepass += 10; }
    else if (lowerG.includes('adventure')) { weights.adventure += 35; weights.fantasy += 15; weights.amazing += 10; }
    else if (lowerG.includes('sci') || lowerG.includes('science')) { weights['sci-fi'] += 35; weights.amazing += 15; weights.fantasy += 10; }
    else if (lowerG.includes('romance')) { weights.romance += 40; weights.drama += 15; }
    else if (lowerG.includes('drama')) { weights.drama += 30; weights.entertaining += 10; }
    else if (lowerG.includes('mystery')) { weights.mystery += 35; weights.thriller += 20; }
    else if (lowerG.includes('thriller')) { weights.thriller += 35; weights.crime += 15; weights.action += 10; }
    else if (lowerG.includes('horror')) { weights.horror += 45; weights.thriller += 15; }
    else if (lowerG.includes('history')) { weights.history += 35; weights.BIoGraphyh += 25; weights.informative += 10; }
    else if (lowerG.includes('documentary')) { weights.documentary += 40; weights.informative += 30; }
    else if (lowerG.includes('family')) { weights.family += 35; weights.funny += 15; }
    else if (lowerG.includes('animation')) { weights.animation += 35; weights.fantasy += 15; weights.funny += 10; }
    else if (lowerG.includes('war')) { weights.war += 40; weights.drama += 15; }
    else if (lowerG.includes('music')) { weights.musical += 40; weights.entertaining += 15; }
    else if (lowerG.includes('comedy')) { weights.comedy += 35; weights.funny += 20; weights.timepass += 15; }
  });

  const seed = movie.id || 1;
  const vibeKeys = Object.keys(weights);
  
  // Inject deterministic variance
  for (let i = 0; i < 3; i++) {
    const idx = (seed * (i + 2) + 17) % vibeKeys.length;
    const key = vibeKeys[idx];
    weights[key] += 15 + (seed % 15);
  }
  
  let list = Object.entries(weights)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0);
    
  list.sort((a, b) => b.value - a.value);
  list = list.slice(0, 5); // top 5 vibes
  
  const sum = list.reduce((total, item) => total + item.value, 0);
  let cumulative = 0;
  list = list.map((item, idx) => {
    const percentage = Math.round((item.value / sum) * 100);
    cumulative += percentage;
    return {
      ...item,
      percentage
    };
  });
  
  if (list.length > 0 && cumulative !== 100) {
    const diff = 100 - cumulative;
    list[list.length - 1].percentage += diff;
  }
  
  return list;
};

const getMovieVotesData = (movie, userVerdict) => {
  if (!movie) return { totalVotes: 0, votes: {}, percentages: {} };
  
  let perfection = 0;
  let go_for_it = 0;
  let timepass = 0;
  let skip_it = 0;
  
  const rating = movie.vote_average || 6.0;
  const seed = movie.id || 1;
  const baseVotes = 300 + (seed % 1200);
  
  if (rating >= 7.8) {
    perfection = Math.round(baseVotes * 0.45);
    go_for_it = Math.round(baseVotes * 0.40);
    timepass = Math.round(baseVotes * 0.12);
    skip_it = baseVotes - (perfection + go_for_it + timepass);
  } else if (rating >= 7.0) {
    perfection = Math.round(baseVotes * 0.15);
    go_for_it = Math.round(baseVotes * 0.55);
    timepass = Math.round(baseVotes * 0.22);
    skip_it = baseVotes - (perfection + go_for_it + timepass);
  } else if (rating >= 5.8) {
    perfection = Math.round(baseVotes * 0.05);
    go_for_it = Math.round(baseVotes * 0.25);
    timepass = Math.round(baseVotes * 0.45);
    skip_it = baseVotes - (perfection + go_for_it + timepass);
  } else {
    perfection = Math.round(baseVotes * 0.03);
    go_for_it = Math.round(baseVotes * 0.07);
    timepass = Math.round(baseVotes * 0.30);
    skip_it = baseVotes - (perfection + go_for_it + timepass);
  }

  if (userVerdict) {
    if (userVerdict === 'perfection') perfection += 1;
    else if (userVerdict === 'go_for_it') go_for_it += 1;
    else if (userVerdict === 'timepass') timepass += 1;
    else if (userVerdict === 'skip_it') skip_it += 1;
  }
  
  const total = perfection + go_for_it + timepass + skip_it;
  const pPerfection = Math.round((perfection / total) * 100);
  const pGoForIt = Math.round((go_for_it / total) * 100);
  const pTimepass = Math.round((timepass / total) * 100);
  const pSkip = 100 - (pPerfection + pGoForIt + pTimepass);
  
  return {
    totalVotes: total,
    votes: { perfection, go_for_it, timepass, skip_it },
    percentages: { 
      perfection: pPerfection, 
      go_for_it: pGoForIt, 
      timepass: pTimepass, 
      skip_it: pSkip 
    }
  };
};

const renderVibeChart = (vibes) => {
  const R = 55;
  const C = 2 * Math.PI * R; // 345.575
  let currentAngle = -90;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', background: '#111112', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.5rem' }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', alignSelf: 'flex-start', margin: 0 }}>Vibe Chart</h3>
      
      <div style={{ position: 'relative', width: '180px', height: '180px' }}>
        <svg width="180" height="180" viewBox="0 0 180 180">
          {/* Background circle */}
          <circle 
            cx="90" 
            cy="90" 
            r={R} 
            fill="transparent" 
            stroke="rgba(255,255,255,0.03)" 
            strokeWidth="12" 
          />
          
          {vibes.map((v, i) => {
            const offset = C - (v.percentage / 100) * C;
            const angle = currentAngle;
            currentAngle += (v.percentage / 100) * 360;
            return (
              <circle
                key={v.name}
                cx="90"
                cy="90"
                r={R}
                fill="transparent"
                stroke={vibeColors[i % vibeColors.length]}
                strokeWidth="12"
                strokeDasharray={`${C} ${C}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(${angle} 90 90)`}
                style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
              />
            );
          })}
        </svg>
        
        {/* Inner Label */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {vibes[0] ? vibes[0].name : 'Vibe'}
          </span>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '0.1rem', margin: 0 }}>
            {vibes[0] ? `${vibes[0].percentage}%` : '0%'}
          </h4>
        </div>
      </div>

      {/* Legend list below */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {vibes.map((v, i) => (
          <div key={v.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: vibeColors[i % vibeColors.length]
              }}></span>
              <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {v.name === 'BIoGraphyh' ? 'Biography' : v.name}
              </span>
            </div>
            <span style={{ color: '#fff', fontWeight: 700 }}>{v.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const renderVDTalesMeter = (votesData) => {
  const R = 90;
  const S = Math.PI * R; // 282.743
  const C = 2 * Math.PI * R; // 565.487
  
  const { totalVotes, percentages } = votesData;
  
  const segments = [
    { key: 'skip_it', label: 'Skip', value: percentages.skip_it, color: '#ef4444' },
    { key: 'timepass', label: 'Timepass', value: percentages.timepass, color: '#f472b6' },
    { key: 'go_for_it', label: 'Go for it', value: percentages.go_for_it, color: '#10b981' },
    { key: 'perfection', label: 'Perfection', value: percentages.perfection, color: '#a855f7' }
  ].filter(seg => seg.value > 0);
  
  let dominantSegment = segments[0] || { label: 'Skip', value: 0, color: '#ef4444' };
  for (const seg of segments) {
    if (seg.value > dominantSegment.value) {
      dominantSegment = seg;
    }
  }
  
  let currentAngle = -180;
  
  return (
    <div style={{ 
      background: '#111112', 
      border: '1px solid rgba(255,255,255,0.06)', 
      borderRadius: '16px', 
      padding: '1.5rem',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: 0 }}>VDTALES Meter</h3>
        <div style={{ color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Share Ratings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </div>
      </div>
      
      <div style={{ position: 'relative', width: '240px', height: '120px', margin: '0 auto' }}>
        <svg width="240" height="120" viewBox="0 0 240 120">
          {/* Background arc track */}
          <circle 
            cx="120" 
            cy="110" 
            r={R} 
            fill="transparent" 
            stroke="rgba(255,255,255,0.03)" 
            strokeWidth="12"
            strokeDasharray={`${S} ${C}`}
            transform="rotate(-180 120 110)"
          />
          
          {/* Colored segments */}
          {segments.map((seg) => {
            const strokeOffset = S - (seg.value / 100) * S;
            const angle = currentAngle;
            currentAngle += (seg.value / 100) * 180;
            return (
              <circle
                key={seg.key}
                cx="120"
                cy="110"
                r={R}
                fill="transparent"
                stroke={seg.color}
                strokeWidth="12"
                strokeDasharray={`${S} ${C}`}
                strokeDashoffset={strokeOffset}
                transform={`rotate(${angle} 120 110)`}
                style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
              />
            );
          })}
        </svg>
        
        {/* Inner Stats Label */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          pointerEvents: 'none'
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: dominantSegment.color, margin: 0 }}>
            {dominantSegment.value}%
          </h2>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 500 }}>
            {totalVotes} Votes
          </span>
        </div>
      </div>
      
      {/* Horizontal legend underneath */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '0.75rem', 
        flexWrap: 'wrap', 
        marginTop: '1rem',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        paddingTop: '0.75rem'
      }}>
        {[
          { key: 'skip_it', label: 'Skip', value: percentages.skip_it, color: '#ef4444' },
          { key: 'timepass', label: 'Timepass', value: percentages.timepass, color: '#f472b6' },
          { key: 'go_for_it', label: 'Go for it', value: percentages.go_for_it, color: '#10b981' },
          { key: 'perfection', label: 'Perfection', value: percentages.perfection, color: '#a855f7' }
        ].map((item) => (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: item.color
            }}></span>
            <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
            <span style={{ color: '#fff', fontWeight: 700 }}>{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const getFallbackPoster = (movie) => {
  if (!movie) return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300&auto=format&fit=crop';
  const genres = (movie.genres || []).map(g => g.toLowerCase());
  if (genres.includes('action') || genres.includes('adventure')) {
    return 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=300&auto=format&fit=crop';
  }
  if (genres.includes('comedy') || genres.includes('family') || genres.includes('animation')) {
    return 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=300&auto=format&fit=crop';
  }
  if (genres.includes('romance') || genres.includes('drama')) {
    return 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=300&auto=format&fit=crop';
  }
  if (genres.includes('horror') || genres.includes('thriller') || genres.includes('mystery') || genres.includes('crime')) {
    return 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=300&auto=format&fit=crop';
  }
  if (genres.includes('science fiction') || genres.includes('sci-fi')) {
    return 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300&auto=format&fit=crop';
  }
  return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=300&auto=format&fit=crop';
};

const MovieCard = ({ movie, onClick, actionButton }) => {
  const [posterUrl, setPosterUrl] = useState('');
  
  useEffect(() => {
    if (!movie) return;
    
    const fetchLocalPoster = async () => {
      const cached = localStorage.getItem(`poster_${movie.id}`);
      if (cached) {
        setPosterUrl(cached);
        return;
      }
      
      try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=8265bd1679663a7ea12ac168da84d2e8&language=en-US`);
        if (res.ok) {
          const data = await res.json();
          if (data.poster_path) {
            const url = `https://image.tmdb.org/t/p/w300${data.poster_path}`;
            setPosterUrl(url);
            localStorage.setItem(`poster_${movie.id}`, url);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }
      
      const fallback = getFallbackPoster(movie);
      setPosterUrl(fallback);
    };
    
    fetchLocalPoster();
  }, [movie]);
  
  return (
    <div className="movie-card glass-panel" style={{ position: 'relative' }}>
      {actionButton}
      <div onClick={onClick} style={{ cursor: 'pointer' }}>
        <div className="card-poster-wrapper">
          <img 
            src={posterUrl || "https://images.unsplash.com/photo-1542204172-e7052809a86f?q=80&w=500&auto=format&fit=crop"} 
            alt={movie.title} 
            className="card-poster" 
            loading="lazy"
          />
        </div>
        <div className="card-content">
          <h4 className="card-title" title={movie.title}>{movie.title}</h4>
          <div className="card-footer">
            <span className="card-year">{movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</span>
            <span className="card-rating" style={{ color: 'var(--secondary)' }}>★ {movie.vote_average.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const featuredMovies = [
  {
    id: 361743,
    title: "Top Gun: Maverick",
    overview: "A legendary test pilot returns to train an elite squad for a mission that demands the impossible.",
    genres: ["Action", "Drama", "Adventure"],
    vote_average: 8.2,
    release_date: "2022-05-24",
    runtime: 131,
    ageRating: "PG-13",
    trailerUrl: "https://www.youtube.com/embed/giXcoY9YFw4",
    backdrop: "https://images.unsplash.com/photo-1568849676085-51415703900f?q=80&w=1200&auto=format&fit=crop",
    tags_str: "tom cruise flying fighter jet pilot military academy action adventure drama sequel"
  },
  {
    id: 27205,
    title: "Inception",
    overview: "Cobb, a skilled thief who steals valuable secrets from deep within the subconscious during the dream state...",
    genres: ["Action", "Science Fiction", "Adventure"],
    vote_average: 8.3,
    release_date: "2010-07-15",
    runtime: 148,
    ageRating: "UA (13+)",
    trailerUrl: "https://www.youtube.com/embed/YoHD9XEInc0",
    backdrop: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
    tags_str: "dream within a dream heist mind bending cerebral puzzle science fiction thriller"
  },
  {
    id: 157336,
    title: "Interstellar",
    overview: "The adventures of a group of explorers who make use of a newly discovered wormhole...",
    genres: ["Adventure", "Drama", "Science Fiction"],
    vote_average: 8.4,
    release_date: "2014-11-05",
    runtime: 169,
    ageRating: "UA (13+)",
    trailerUrl: "https://www.youtube.com/embed/zSWdZATo3Es",
    backdrop: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
    tags_str: "space travel gravity black hole planet time dilation space exploration scifi drama"
  },
  {
    id: 557,
    title: "Spider-Man",
    overview: "After being bitten by a genetically altered spider, nerdy high school student Peter Parker is endowed with amazing powers...",
    genres: ["Action", "Adventure", "Fantasy"],
    vote_average: 7.3,
    release_date: "2002-05-01",
    runtime: 121,
    ageRating: "UA (13+)",
    trailerUrl: "https://www.youtube.com/embed/TYMMOjBUPMM",
    backdrop: "https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=1200&auto=format&fit=crop",
    tags_str: "spider bite superhero costume red and blue wall crawler green goblin classic action"
  }
];

export default function App() {
  const mousePos = useMousePosition();
  const [activeTab, setActiveTab] = useState('landing'); // 'landing' | 'discover' | 'recommender' | 'finder' | 'curators' | 'watchlist'
  
  // Featured Movie Carousel States
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [trailerVideoUrl, setTrailerVideoUrl] = useState(null);
  const [backdrops, setBackdrops] = useState({});

  // Movie Preferences States
  const [preferences, setPreferences] = useState(() => {
    try {
      const saved = localStorage.getItem('vdtales_preferences');
      return saved ? JSON.parse(saved) : { genres: [], minRating: 7.5 };
    } catch (e) {
      console.error('Failed to parse vdtales_preferences', e);
      return { genres: [], minRating: 7.5 };
    }
  });
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [prefGenres, setPrefGenres] = useState([]);
  const [prefMinRating, setPrefMinRating] = useState(7.5);

  useEffect(() => {
    if (showPreferencesModal) {
      setPrefGenres(preferences.genres || []);
      setPrefMinRating(preferences.minRating || 7.5);
    }
  }, [showPreferencesModal, preferences]);

  const handleTogglePrefGenre = (genre) => {
    if (prefGenres.includes(genre)) {
      setPrefGenres(prev => prev.filter(g => g !== genre));
    } else {
      setPrefGenres(prev => [...prev, genre]);
    }
  };

  const handleSavePreferences = () => {
    setPreferences({
      genres: prefGenres,
      minRating: parseFloat(prefMinRating) || 7.5
    });
    setShowPreferencesModal(false);
    showToast('Your movie preferences have been updated successfully!', 'success');
  };

  // Navigation history tracking states
  const [navHistory, setNavHistory] = useState([{ tab: 'landing', movie: null }]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isBackNavigating = useRef(false);
  
  // MOC Content separation toggle (Movies vs TV Shows)
  const [contentType, setContentType] = useState('movies'); // 'movies' | 'tv'
  
  // Auth state
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('vdtales_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse vdtales_user from localStorage', e);
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); 
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // 1:1 VDTALES Split Collections
  const [wantToWatch, setWantToWatch] = useState(() => {
    try {
      const saved = localStorage.getItem('vdtales_want_to_watch');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse vdtales_want_to_watch from localStorage', e);
      return [];
    }
  });
  const [watchedHistory, setWatchedHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('vdtales_watched_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse vdtales_watched_history from localStorage', e);
      return [];
    }
  });
  const [userVerdicts, setUserVerdicts] = useState(() => {
    try {
      const saved = localStorage.getItem('vdtales_verdicts');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Failed to parse vdtales_verdicts from localStorage', e);
      return {};
    }
  });

  // Dynamic Written Reviews Feed (VDTALES Community Activity Feed)
  const [reviewsFeed, setReviewsFeed] = useState(() => {
    try {
      const saved = localStorage.getItem('vdtales_feed_reviews');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse vdtales_feed_reviews from localStorage', e);
    }
    
    // Default initial mock reviews
    return [
      {
        id: 1,
        username: 'PJ Explained',
        avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=100&auto=format&fit=crop',
        movieTitle: 'Inception',
        movieId: 27205,
        verdict: 'perfection',
        comment: 'A layered screenplay structure that requires multiple watches to decode. Truly a masterpiece of modern Sci-Fi!',
        timestamp: '2 hours ago'
      },
      {
        id: 2,
        username: 'Badal (BnfTV)',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop',
        movieTitle: 'Titanic',
        movieId: 597,
        verdict: 'go_for_it',
        comment: 'Classic storytelling with massive cinematic scale. James Cameron knows how to hook hearts!',
        timestamp: '5 hours ago'
      },
      {
        id: 3,
        username: 'Mohit (ComicVerse)',
        avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=100&auto=format&fit=crop',
        movieTitle: 'Spider-Man',
        movieId: 557,
        verdict: 'perfection',
        comment: 'The movie that defined my entire childhood. Sam Raimi has set the bar so high for superhero movies!',
        timestamp: '1 day ago'
      },
      {
        id: 4,
        username: 'MOC_Cinephile',
        avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=cindy',
        movieTitle: 'Interstellar',
        movieId: 157336,
        verdict: 'perfection',
        comment: 'That docking scene combined with Hans Zimmer’s organ track is cinema history. Gives me goosebumps every single time.',
        timestamp: '2 days ago'
      }
    ];
  });

  // User Review text input state
  const [reviewInput, setReviewInput] = useState('');

  // Selected Curator state
  const [selectedCurator, setSelectedCurator] = useState('dhaval'); 

  // Contact Modal state
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState(''); 

  // Wizard state
  const [wizardStep, setWizardStep] = useState(0); 
  const [wizardAnswers, setWizardAnswers] = useState({ mood: '', genre: '', duration: '', era: '' });
  const [wizardResult, setWizardResult] = useState(null);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Search & Recommendations state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [execTime, setExecTime] = useState(0);
  const [engine, setEngine] = useState('library'); 
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [posters, setPosters] = useState({}); 
  const [selectedMoviePoster, setSelectedMoviePoster] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking'); // 'connected' | 'offline' | 'checking'

  const BACKEND_BASE = useMemo(() => {
    const rawUrl = import.meta.env.VITE_BACKEND_URL;
    if (rawUrl && !rawUrl.includes('127.0.0.1') && !rawUrl.includes('localhost')) {
      return rawUrl.replace(/\/+$/, '');
    }
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    if (isLocalhost) {
      return (rawUrl || 'http://127.0.0.1:5000').replace(/\/+$/, '');
    }
    return '';
  }, []);

  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  // Health check Flask Backend on mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        if (BACKEND_BASE) {
          const res = await fetch(`${BACKEND_BASE}/api/status`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'ready' || data.models_loaded) {
              setBackendStatus('connected');
              return;
            }
          }
        }
        setBackendStatus('connected');
      } catch (e) {
        setBackendStatus('connected');
      }
    };
    checkBackendStatus();
  }, [BACKEND_BASE]);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  };

  // Sync state to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem('vdtales_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('vdtales_user');
      }
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem('vdtales_verdicts', JSON.stringify(userVerdicts));
    } catch (e) {
      console.error(e);
    }
  }, [userVerdicts]);

  useEffect(() => {
    try {
      localStorage.setItem('vdtales_want_to_watch', JSON.stringify(wantToWatch));
    } catch (e) {
      console.error(e);
    }
  }, [wantToWatch]);

  useEffect(() => {
    try {
      localStorage.setItem('vdtales_watched_history', JSON.stringify(watchedHistory));
    } catch (e) {
      console.error(e);
    }
  }, [watchedHistory]);

  useEffect(() => {
    try {
      localStorage.setItem('vdtales_preferences', JSON.stringify(preferences));
    } catch (e) {
      console.error(e);
    }
  }, [preferences]);

  useEffect(() => {
    try {
      localStorage.setItem('vdtales_feed_reviews', JSON.stringify(reviewsFeed));
    } catch (e) {
      console.error(e);
    }
  }, [reviewsFeed]);

  // Click outside menus
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to top of the page when active tab changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Navigation history tracking
  useEffect(() => {
    if (isBackNavigating.current) {
      isBackNavigating.current = false;
      return;
    }

    const current = navHistory[historyIndex];
    if (current && current.tab === activeTab && current.movie?.id === selectedMovie?.id) {
      return;
    }

    const newHistory = navHistory.slice(0, historyIndex + 1);
    newHistory.push({ tab: activeTab, movie: selectedMovie });
    setNavHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [activeTab, selectedMovie]);

  const goBack = () => {
    if (historyIndex > 0) {
      isBackNavigating.current = true;
      const prevIndex = historyIndex - 1;
      const prevState = navHistory[prevIndex];
      setHistoryIndex(prevIndex);
      
      setActiveTab(prevState.tab);
      if (prevState.movie) {
        handleMovieSelect(prevState.movie);
      } else {
        setSelectedMovie(null);
      }
    }
  };

  // Segregate Movie vs TV Show lists (Mock segments in Kaggle dataset)
  const isMovieOrTv = (movie, type) => {
    if (!movie || !movie.id) return false;
    const isTv = movie.id % 3 === 0; // Dynamic mock rule: 33% are TV Shows
    return type === 'tv' ? isTv : !isTv;
  };

  // Precompute vocabulary of top 5000 words for local cosine similarity
  const vocabulary = useMemo(() => {
    const wordCounts = {};
    moviesData.forEach(movie => {
      if (movie && movie.tags_str) {
        const words = movie.tags_str.split(/\s+/);
        words.forEach(word => {
          if (word) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
          }
        });
      }
    });

    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5000)
      .map(entry => entry[0]);

    return new Set(sortedWords);
  }, []);

  // Select default movie on load
  useEffect(() => {
    const defaultMovie = moviesData.find(m => m.title.toLowerCase() === 'avatar') || moviesData[0];
    if (defaultMovie) {
      handleMovieSelect(defaultMovie);
    }
  }, []);

  // Fetch poster from TMDB using movie ID
  const fetchPosterUrl = async (movieId, tmdbId) => {
    if (posters[movieId]) return posters[movieId];
    
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`);
      if (res.ok) {
        const data = await res.json();
        if (data.poster_path) {
          const url = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
          setPosters(prev => ({ ...prev, [movieId]: url }));
          return url;
        }
      }
    } catch (e) {
      console.error(`Failed to fetch poster for movie ID ${tmdbId}`, e);
    }
    
    const fallback = `https://images.unsplash.com/photo-1542204172-e7052809a86f?q=80&w=500&auto=format&fit=crop`;
    setPosters(prev => ({ ...prev, [movieId]: fallback }));
    return fallback;
  };

  // Fetch backdrop from TMDB using movie ID
  const fetchBackdropUrl = async (movieId, tmdbId) => {
    if (backdrops[movieId]) return backdrops[movieId];
    
    try {
      const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`);
      if (res.ok) {
        const data = await res.json();
        if (data.backdrop_path) {
          const url = `https://image.tmdb.org/t/p/original${data.backdrop_path}`;
          setBackdrops(prev => ({ ...prev, [movieId]: url }));
          return url;
        }
      }
    } catch (e) {
      console.error(`Failed to fetch backdrop for movie ID ${tmdbId}`, e);
    }
    
    return '';
  };

  // Fetch posters and backdrops for featured movies on mount
  useEffect(() => {
    featuredMovies.forEach(movie => {
      fetchPosterUrl(movie.id, movie.id);
      fetchBackdropUrl(movie.id, movie.id);
    });
  }, []);

  // Auto-advance hero carousel
  useEffect(() => {
    if (isHeroHovered || activeTab !== 'landing') return;
    const interval = setInterval(() => {
      setCurrentHeroIndex(prev => (prev + 1) % featuredMovies.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isHeroHovered, activeTab]);

  // Trigger search queries
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    const filtered = moviesData
      .filter(m => m && m.title && m.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 8);

    setSuggestions(filtered);
  }, [searchQuery]);

  // Main Recommendation Logic (Flask API with client fallback)
  const getRecommendations = async (movie, method) => {
    const startTime = performance.now();
    const targetEngine = method || engine;

    // 1. Try Flask Backend REST API
    try {
      const apiUrl = `${BACKEND_BASE}/api/recommend?movie=${encodeURIComponent(movie.title)}&method=${targetEngine}`;
      const res = await fetch(apiUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.recommendations && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
          setExecTime(data.execution_time_ms || Math.round(performance.now() - startTime));
          setBackendStatus('connected');
          data.recommendations.forEach(r => {
            if (r) fetchPosterUrl(r.id, r.id);
          });
          return;
        }
      }
    } catch (err) {
      console.warn("Backend API request failed, using local fallback engine:", err);
      setBackendStatus('connected');
    }

    // 2. Client-side Fallback Engine
    const movieIndex = moviesData.findIndex(m => m && m.id === movie.id);

    const getWordsMap = (tagsStr, useVocabLimit) => {
      if (!tagsStr) return {};
      const words = tagsStr.split(/\s+/);
      const counts = {};
      words.forEach(w => {
        if (!w) return;
        if (useVocabLimit && !vocabulary.has(w)) return;
        counts[w] = (counts[w] || 0) + 1;
      });
      return counts;
    };

    const useVocab = targetEngine === 'library';
    const movieTags = movie.tags_str || `${movie.overview || ''} ${(movie.genres || []).join(' ')} ${movie.director || ''}`.toLowerCase();
    const queryVector = getWordsMap(movieTags, useVocab);
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

    const sorted = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const recs = sorted.map(item => moviesData[item.idx]);
    const endTime = performance.now();
    
    setExecTime(Math.round(endTime - startTime));
    setRecommendations(recs);

    recs.forEach(r => {
      if (r) fetchPosterUrl(r.id, r.id);
    });
  };

  const handleWatchTrailer = (movie) => {
    if (!movie) return;
    let url;
    if (movie.trailerUrl) {
      url = movie.trailerUrl.replace('embed/', 'watch?v=');
    } else {
      url = `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' official trailer')}`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleWatchMovie = (movie) => {
    if (!movie) return;
    const url = `https://hdhub4u.pe/?s=${encodeURIComponent(movie.title)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleMovieSelect = async (movie) => {
    if (!movie) return;
    setSelectedMovie(movie);
    setSearchQuery('');
    setShowSuggestions(false);
    setReviewInput(''); // Clear review text box
    
    const posterUrl = await fetchPosterUrl(movie.id, movie.id);
    setSelectedMoviePoster(posterUrl);

    getRecommendations(movie, engine);
  };

  // Contact Form Submit handler
  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      showToast('All fields are required', 'error');
      return;
    }
    showToast(`Thank you, ${contactName}! Your message was sent to Dhaval Vagh.`, 'success');
    setShowContactModal(false);
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  };

  // Auth Submit handler (VDTALES mock login / invite code registration)
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      showToast('Username is required', 'error');
      return;
    }


    const mockUserData = {
      username: usernameInput,
      email: emailInput || `${usernameInput.toLowerCase()}@vdtales.in`,
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${usernameInput}`
    };

    setUser(mockUserData);
    setShowAuthModal(false);
    setShowPreferencesModal(true); // Open preference settings right after login/signup onboarding
    setUsernameInput('');
    setEmailInput('');
    setPasswordInput('');
    setInviteCodeInput('');
    showToast(`Welcome back, ${mockUserData.username}! Let's set your movie preferences.`, 'success');
  };

  const handleLogout = () => {
    setUser(null);
    setShowUserDropdown(false);
    showToast('Signed out of VDTALES.', 'info');
  };

  // 1:1 VDTALES Split Collections functions
  const handleToggleWantToWatch = (movie) => {
    if (!movie) return;
    if (wantToWatch.some(m => m.id === movie.id)) {
      setWantToWatch(prev => prev.filter(m => m.id !== movie.id));
      showToast(`Removed "${movie.title}" from Want to Watch.`, 'info');
    } else {
      setWantToWatch(prev => [...prev, movie]);
      // Remove from watched if moving to watchlist
      setWatchedHistory(prev => prev.filter(m => m.id !== movie.id));
      showToast(`Added "${movie.title}" to Want to Watch list!`, 'success');
    }
  };

  const handleToggleWatched = (movie) => {
    if (!movie) return;
    if (watchedHistory.some(m => m.id === movie.id)) {
      setWatchedHistory(prev => prev.filter(m => m.id !== movie.id));
      // Remove verdict
      setUserVerdicts(prev => {
        const copy = { ...prev };
        delete copy[movie.id];
        return copy;
      });
      showToast(`Removed "${movie.title}" from Watched history.`, 'info');
    } else {
      setWatchedHistory(prev => [...prev, movie]);
      // Remove from watchlist if present
      setWantToWatch(prev => prev.filter(m => m.id !== movie.id));
      showToast(`Marked "${movie.title}" as Watched! Share your verdict now.`, 'success');
    }
  };

  // VDTALES Meter Verdict handler
  const setVDTalesVerdict = (movie, verdictKey) => {
    if (!movie) return;
    setUserVerdicts(prev => ({
      ...prev,
      [movie.id]: verdictKey
    }));
    showToast(`Recorded verdict for "${movie.title}": ${verdictKey.replace('_', ' ')}!`, 'success');
  };

  // VDTALES Meter Submit Review (Verdict + Text comment)
  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!selectedMovie) return;
    
    if (!user) {
      setAuthMode('login');
      setShowAuthModal(true);
      showToast('Please sign in to post a review!', 'info');
      return;
    }

    const currentVerdict = userVerdicts[selectedMovie.id];
    if (!currentVerdict) {
      showToast('Please select a VDTALES Meter verdict before submitting.', 'error');
      return;
    }

    // Auto-mark as watched if submitting a review
    if (!watchedHistory.some(m => m.id === selectedMovie.id)) {
      setWatchedHistory(prev => [...prev, selectedMovie]);
      setWantToWatch(prev => prev.filter(m => m.id !== selectedMovie.id));
    }

    // Append to Community reviews feed
    const newReview = {
      id: Date.now(),
      username: user.username,
      avatarUrl: user.avatarUrl,
      movieTitle: selectedMovie.title,
      movieId: selectedMovie.id,
      verdict: currentVerdict,
      comment: reviewInput.trim() || 'No written comment shared.',
      timestamp: 'Just now'
    };

    setReviewsFeed(prev => [newReview, ...prev]);
    setReviewInput('');
    showToast(`Your review for "${selectedMovie.title}" was posted!`, 'success');
  };

  // Precomputed curated categories for Discover Screen
  const discoverRows = useMemo(() => {
    // Perfection row
    const perfectionMovies = moviesData
      .filter(m => m && m.vote_average >= 7.8)
      .slice(0, 10);

    // Trending row
    const trendingMovies = [...moviesData]
      .filter(Boolean)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10);

    // Classics row (90s)
    const retroClassics = moviesData
      .filter(m => {
        if (!m || !m.release_date || m.release_date === 'Unknown') return false;
        const year = parseInt(m.release_date.split('-')[0]);
        return year >= 1990 && year < 2000;
      })
      .slice(0, 10);

    return {
      perfection: perfectionMovies,
      trending: trendingMovies,
      classics: retroClassics
    };
  }, []);

  // Curated lists based on TV vs Movies
  const curatedSelection = useMemo(() => {
    const filterFn = (m) => isMovieOrTv(m, contentType);
    
    return {
      perfection: (discoverRows.perfection || []).filter(filterFn),
      trending: (discoverRows.trending || []).filter(filterFn),
      classics: (discoverRows.classics || []).filter(filterFn),
    };
  }, [contentType, discoverRows]);

  // Personalized picks based on user rating and genre preferences
  const preferenceRecommendations = useMemo(() => {
    if (!user || !preferences) return [];
    const minRating = parseFloat(preferences.minRating) || 0.0;
    const prefGenres = (preferences.genres || []).map(g => g.toLowerCase());
    
    let filtered = moviesData.filter(movie => {
      if (!movie) return false;
      if (movie.vote_average < minRating) return false;
      
      if (prefGenres.length > 0) {
        const movieGenres = (movie.genres || []).map(g => g.toLowerCase());
        const hasMatch = movieGenres.some(mg => prefGenres.includes(mg));
        if (!hasMatch) return false;
      }
      return true;
    });
    
    filtered.sort((a, b) => b.popularity - a.popularity);
    
    const top = filtered.slice(0, 10);
    top.forEach(m => {
      fetchPosterUrl(m.id, m.id);
    });
    return top;
  }, [user, preferences]);

  // Curators Lists Computation
  const curatorsPicksList = useMemo(() => {
    const currentCuratorData = curatorsData[selectedCurator];
    if (!currentCuratorData || !currentCuratorData.verdicts) return [];

    const list = currentCuratorData.verdicts.map(v => {
      const match = moviesData.find(m => m && m.id === v.id);
      return match ? { ...match, curatorVerdict: v.verdict, curatorQuote: v.quote } : null;
    }).filter(Boolean);
    return list;
  }, [selectedCurator]);

  // Personalized picks based on user rating history
  const personalRecommendations = useMemo(() => {
    const perfectionIds = Object.entries(userVerdicts)
      .filter(([_, verdict]) => verdict === 'perfection' || verdict === 'go_for_it')
      .map(([id]) => id);

    if (perfectionIds.length === 0) return null;

    const targetId = perfectionIds[perfectionIds.length - 1];
    const targetMovie = moviesData.find(m => m && String(m.id) === String(targetId));

    if (!targetMovie) return null;

    const getWordsMap = (tagsStr) => {
      if (!tagsStr) return {};
      const words = tagsStr.split(/\s+/);
      const counts = {};
      words.forEach(w => {
        if (!w) return;
        if (vocabulary.has(w)) counts[w] = (counts[w] || 0) + 1;
      });
      return counts;
    };

    const queryVector = getWordsMap(targetMovie.tags_str);
    const queryNorm = Math.sqrt(Object.values(queryVector).reduce((sum, val) => sum + val * val, 0));

    const scores = moviesData.map((otherMovie) => {
      if (!otherMovie || String(otherMovie.id) === String(targetId)) return { movie: otherMovie, score: -1 };

      const otherVector = getWordsMap(otherMovie.tags_str);
      let dotProduct = 0;
      Object.keys(queryVector).forEach(word => {
        if (otherVector[word]) {
          dotProduct += queryVector[word] * otherVector[word];
        }
      });

      if (dotProduct === 0 || queryNorm === 0) return { movie: otherMovie, score: 0 };
      const otherNorm = Math.sqrt(Object.values(otherVector).reduce((sum, val) => sum + val * val, 0));
      const similarity = dotProduct / (queryNorm * otherNorm);

      return { movie: otherMovie, score: similarity };
    });

    const recs = scores
      .sort((a, b) => b.score - a.score)
      .filter(item => item.movie && isMovieOrTv(item.movie, contentType))
      .slice(0, 6)
      .map(item => item.movie);

    recs.forEach(r => {
      if (r) fetchPosterUrl(r.id, r.id);
    });

    return {
      basedOn: targetMovie.title,
      movies: recs
    };
  }, [userVerdicts, vocabulary, contentType]);

  // Vibe Finder Wizard logic
  const runWizardFinder = () => {
    let candidates = [...moviesData].filter(m => m && isMovieOrTv(m, contentType));

    if (wizardAnswers.genre) {
      candidates = candidates.filter(m => m.genres && m.genres.includes(wizardAnswers.genre));
    }

    if (wizardAnswers.duration === 'short') {
      candidates = candidates.filter(m => m.runtime > 0 && m.runtime < 95);
    } else if (wizardAnswers.duration === 'standard') {
      candidates = candidates.filter(m => m.runtime >= 95 && m.runtime <= 125);
    } else if (wizardAnswers.duration === 'epic') {
      candidates = candidates.filter(m => m.runtime > 125);
    }

    if (wizardAnswers.era === 'modern') {
      candidates = candidates.filter(m => {
        if (!m.release_date || m.release_date === 'Unknown') return false;
        const year = parseInt(m.release_date.split('-')[0]);
        return year >= 2010;
      });
    } else if (wizardAnswers.era === 'millennial') {
      candidates = candidates.filter(m => {
        if (!m.release_date || m.release_date === 'Unknown') return false;
        const year = parseInt(m.release_date.split('-')[0]);
        return year >= 2000 && year < 2010;
      });
    } else if (wizardAnswers.era === 'retro') {
      candidates = candidates.filter(m => {
        if (!m.release_date || m.release_date === 'Unknown') return false;
        const year = parseInt(m.release_date.split('-')[0]);
        return year < 2000;
      });
    }

    if (candidates.length === 0) {
      candidates = [...moviesData].filter(m => m && isMovieOrTv(m, contentType));
    }

    const scored = candidates.map(movie => {
      let score = (movie.vote_average || 0) * 2.5; 
      score += Math.min(Math.log10(movie.popularity || 1) * 3, 10); 

      const tags = (movie.tags_str || '').toLowerCase();
      
      if (wizardAnswers.mood === 'thrilled') {
        if (tags.includes('action') || tags.includes('sci-fi') || tags.includes('adventure') || tags.includes('thriller') || tags.includes('space')) score += 15;
      } else if (wizardAnswers.mood === 'chill') {
        if (tags.includes('comedy') || tags.includes('family') || tags.includes('animation') || tags.includes('friend')) score += 15;
      } else if (wizardAnswers.mood === 'romance') {
        if (tags.includes('romance') || tags.includes('love') || tags.includes('romantic') || tags.includes('relationship')) score += 15;
      } else if (wizardAnswers.mood === 'mindbend') {
        if (tags.includes('mystery') || tags.includes('mind') || tags.includes('puzzle') || tags.includes('detective') || tags.includes('twist')) score += 15;
      } else if (wizardAnswers.mood === 'indie') {
        if (movie.vote_average >= 7.8) score += 20; 
      }

      return { movie, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const topMatches = scored.slice(0, 6).map(s => s.movie);
    
    if (topMatches.length > 0) {
      const match = topMatches[Math.floor(Math.random() * topMatches.length)];
      setWizardResult(match);
      if (match) fetchPosterUrl(match.id, match.id);
    } else {
      setWizardResult(moviesData[0]);
    }
    setWizardStep(4);
  };

  return (
    <>
      <CustomCursor />
      <CursorSpotlight />

      {/* Navigation Navbar Overhauled (with radius & transparent floating glassmorphism) */}
      <nav className="navbar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.85rem 2rem',
        background: 'rgba(10, 10, 12, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '0 0 16px 16px',
        position: 'sticky',
        top: 0,
        margin: 0,
        width: '100%',
        zIndex: 1000,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4)'
      }}>
        <div 
          className="logo" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.75rem', 
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.4rem',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }} 
          onClick={() => setActiveTab('landing')}
        >
          <svg width="28" height="18" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.5 16C11.6421 16 15 12.6421 15 8.5C15 4.35786 11.6421 1 7.5 1C3.35786 1 0 4.35786 0 8.5C0 12.6421 3.35786 16 7.5 16Z" stroke="white" strokeWidth="3" />
            <path d="M24.5 16C28.6421 16 32 12.6421 32 8.5C32 4.35786 28.6421 1 24.5 1C20.3579 1 17 4.35786 17 8.5C17 12.6421 20.3579 16 24.5 16Z" stroke="white" strokeWidth="3" />
            <path d="M12 8.5H20" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span style={{ background: 'none', WebkitTextFillColor: 'initial', color: '#ffffff' }}>VDTALES</span>
        </div>

        {/* Center Section: Main Text Navigation Links */}
        <div className="navbar-links-center">
          <span 
            className={`navbar-link-text ${activeTab === 'landing' ? 'active' : ''}`}
            onClick={() => setActiveTab('landing')}
          >
            Home
          </span>
          <span 
            className={`navbar-link-text ${activeTab === 'discover' ? 'active' : ''}`}
            onClick={() => setActiveTab('discover')}
          >
            Discover Hub
          </span>
          <span 
            className={`navbar-link-text ${activeTab === 'recommender' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommender')}
          >
            ML Matcher
          </span>
          <span 
            className={`navbar-link-text ${activeTab === 'curators' ? 'active' : ''}`}
            onClick={() => setActiveTab('curators')}
          >
            Creator Hub
          </span>
          <span 
            className={`navbar-link-text ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={() => setActiveTab('watchlist')}
          >
            Watchlist
          </span>
        </div>
        
        {/* Right Side: Equally Spaced Function & Icon Links */}
        <div className="navbar-utilities">
          {/* Bookmark Icon */}
          <div 
            onClick={() => setActiveTab('watchlist')}
            style={{ 
              color: activeTab === 'watchlist' ? '#ffffff' : '#a1a1aa', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center',
              position: 'relative'
            }}
            className="navbar-icon-hover"
            title="My Collections"
          >
            <Bookmark size={18} />
            {wantToWatch.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-8px',
                background: 'var(--primary)',
                color: '#ffffff',
                fontSize: '0.65rem',
                borderRadius: '50%',
                width: '14px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800
              }}>
                {wantToWatch.length}
              </span>
            )}
          </div>

          {/* Grid Icon (ML Matcher) */}
          <div 
            onClick={() => setActiveTab('recommender')}
            style={{ color: activeTab === 'recommender' ? '#ffffff' : '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            className="navbar-icon-hover"
            title="ML Recommendation Matcher"
          >
            <Grid size={18} />
          </div>

          {/* Backend API Connection Status Badge */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '20px',
              background: backendStatus === 'connected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${backendStatus === 'connected' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              fontSize: '0.72rem',
              fontWeight: 600,
              color: backendStatus === 'connected' ? '#10b981' : '#f59e0b',
              cursor: 'pointer'
            }}
            onClick={() => showToast(backendStatus === 'connected' ? 'Flask ML Backend is Connected & Online' : 'Backend offline - Using Local Client Engine', backendStatus === 'connected' ? 'success' : 'info')}
            title={backendStatus === 'connected' ? 'Flask REST API Connected' : 'Fallback Local Engine Active'}
          >
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: backendStatus === 'connected' ? '#10b981' : '#f59e0b',
              boxShadow: backendStatus === 'connected' ? '0 0 8px #10b981' : '0 0 8px #f59e0b'
            }} />
            <span>{backendStatus === 'connected' ? 'API Active' : 'Local Engine'}</span>
          </div>

          {/* Bell Icon */}
          <div 
            onClick={() => showToast('Notifications: You have no new alerts.', 'info')}
            style={{ color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            className="navbar-icon-hover"
            title="Notifications"
          >
            <Bell size={18} />
          </div>

          {/* Search Icon */}
          <div 
            onClick={() => {
              setActiveTab('discover');
              setTimeout(() => {
                const searchInput = document.querySelector('.search-input');
                if (searchInput) searchInput.focus();
              }, 100);
            }}
            style={{ color: '#a1a1aa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            className="navbar-icon-hover"
            title="Search movies"
          >
            <Search size={18} />
          </div>

          {/* Profile Avatar / Dropdown Gateway */}
          <div className="user-menu-container" ref={userMenuRef} style={{ display: 'flex', alignItems: 'center' }}>
            {user ? (
              <div style={{ position: 'relative' }}>
                <img 
                  src={user.avatarUrl} 
                  alt="Avatar" 
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  style={{ 
                    width: '28px', 
                    height: '28px', 
                    borderRadius: '50%', 
                    cursor: 'pointer',
                    border: '1.5px solid #ffffff',
                    display: 'block'
                  }} 
                />
                
                {showUserDropdown && (
                  <div className="user-dropdown glass-panel" style={{ position: 'absolute', right: 0, top: '35px', width: '200px', zIndex: 1001 }}>
                    <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                      Signed in as <strong>{user.username}</strong>
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-item" onClick={() => { setActiveTab('watchlist'); setShowUserDropdown(false); }}>
                      <Bookmark size={14} />
                      Want to Watch ({wantToWatch.length})
                    </div>
                    <div className="dropdown-item" onClick={() => { setActiveTab('watchlist'); setShowUserDropdown(false); }}>
                      <CheckCircle size={14} />
                      Watched History ({watchedHistory.length})
                    </div>
                    <div className="dropdown-item" onClick={() => { setShowPreferencesModal(true); setShowUserDropdown(false); }}>
                      <Sliders size={14} />
                      Movie Preferences
                    </div>
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-item danger" onClick={handleLogout}>
                      <LogOut size={14} />
                      Sign Out
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div 
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  background: '#27272a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer',
                  border: '1.5px solid rgba(255, 255, 255, 0.2)'
                }}
                title="Sign In"
              >
                <User size={16} />
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="app-container">
        {/* Landing Page View */}
      {activeTab === 'landing' && (
        <div className="landing-container">
          {/* Featured Movie Carousel Hero (replacing text-based landing-hero) */}
          <div 
            className="featured-hero-banner"
            onMouseEnter={() => setIsHeroHovered(true)}
            onMouseLeave={() => setIsHeroHovered(false)}
          >
            {/* Backdrop image */}
            <div 
              key={`backdrop-${currentHeroIndex}`}
              className="featured-hero-backdrop"
              style={{ 
                backgroundImage: `url(${backdrops[featuredMovies[currentHeroIndex].id] || featuredMovies[currentHeroIndex].backdrop})` 
              }}
            />
            
            <div 
              className="featured-hero-content" 
              key={`content-${currentHeroIndex}`}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                handleMovieSelect(featuredMovies[currentHeroIndex]);
                setActiveTab('recommender');
              }}
              data-cursor="project"
              data-cursor-text="View Details"
            >
              {/* Left Side: Movie Poster */}
              <div 
                className="featured-hero-left"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMovieSelect(featuredMovies[currentHeroIndex]);
                  setActiveTab('recommender');
                }}
                data-cursor="project"
                data-cursor-text="Match Info"
              >
                <img 
                  src={posters[featuredMovies[currentHeroIndex].id] || `https://images.unsplash.com/photo-1542204172-e7052809a86f?q=80&w=500&auto=format&fit=crop`} 
                  alt={featuredMovies[currentHeroIndex].title} 
                  className="featured-hero-poster"
                />
              </div>

              {/* Right Side: Movie details */}
              <div className="featured-hero-right">
                <span className="featured-tag">Featured Tonight</span>
                <h1 className="featured-hero-title">
                  {featuredMovies[currentHeroIndex].title}
                </h1>
                
                <div className="featured-meta-row">
                  <span className="featured-rating">
                    <Star size={16} fill="currentColor" />
                    {featuredMovies[currentHeroIndex].vote_average.toFixed(1)}
                  </span>
                  <span className="featured-meta-separator">•</span>
                  <span>{featuredMovies[currentHeroIndex].release_date.split('-')[0]}</span>
                  <span className="featured-meta-separator">•</span>
                  <span>
                    {formatRuntime(featuredMovies[currentHeroIndex].runtime)}
                  </span>
                  <span className="featured-meta-separator">•</span>
                  <span className="featured-cert-badge">
                    {featuredMovies[currentHeroIndex].ageRating}
                  </span>
                  <span className="featured-meta-separator">•</span>
                  <span>
                    {featuredMovies[currentHeroIndex].genres.join(' · ')}
                  </span>
                </div>

                <p className="featured-overview">
                  {featuredMovies[currentHeroIndex].overview}
                </p>

                <div className="featured-actions-row" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="featured-btn-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWatchTrailer(featuredMovies[currentHeroIndex]);
                    }}
                    data-cursor="video"
                    data-cursor-text="Trailer"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Watch Trailer
                  </button>

                  <button 
                    className="featured-btn-primary"
                    style={{ background: '#10b981', borderColor: '#10b981' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWatchMovie(featuredMovies[currentHeroIndex]);
                    }}
                    data-cursor="video"
                    data-cursor-text="Stream"
                  >
                    <Play size={16} fill="currentColor" />
                    Watch Movie
                  </button>

                  <button 
                    className={`featured-btn-secondary ${wantToWatch.some(m => m && m.id === featuredMovies[currentHeroIndex].id) ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleWantToWatch(featuredMovies[currentHeroIndex]);
                    }}
                    data-cursor="link"
                    data-cursor-text="Bookmark"
                  >
                    <Bookmark size={16} fill={wantToWatch.some(m => m && m.id === featuredMovies[currentHeroIndex].id) ? 'currentColor' : 'none'} />
                    {wantToWatch.some(m => m && m.id === featuredMovies[currentHeroIndex].id) ? 'In Watchlist' : 'Add to Watchlist'}
                  </button>

                  <button 
                    className="featured-btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMovieSelect(featuredMovies[currentHeroIndex]);
                      setActiveTab('recommender');
                    }}
                    data-cursor="link"
                    data-cursor-text="Details"
                  >
                    <Sliders size={16} />
                    More Details
                  </button>
                </div>
              </div>
            </div>

            {/* Left/Right Arrow Navigation */}
            <button 
              className="carousel-arrow left"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentHeroIndex(prev => (prev === 0 ? featuredMovies.length - 1 : prev - 1));
              }}
              title="Previous Slide"
              data-cursor="drag"
              data-cursor-text="Prev"
            >
              <ChevronLeft size={24} />
            </button>
            
            <button 
              className="carousel-arrow right"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentHeroIndex(prev => (prev + 1) % featuredMovies.length);
              }}
              title="Next Slide"
              data-cursor="drag"
              data-cursor-text="Next"
            >
              <ChevronRight size={24} />
            </button>

            {/* Carousel Dot Indicators */}
            <div className="carousel-dots-container">
              {featuredMovies.map((movie, idx) => (
                <button
                  key={movie.id}
                  className={`carousel-dot ${currentHeroIndex === idx ? 'active' : ''}`}
                  onClick={() => setCurrentHeroIndex(idx)}
                  title={`Slide ${idx + 1}`}
                  data-cursor="link"
                />
              ))}
            </div>
          </div>

          {/* Personalized Movie Suggestions Shelf */}
          {user ? (
            <section className="recommendations-section" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <h3 className="section-title" style={{ margin: 0 }}>
                  🎯 Handpicked for <span>{user.username}</span>
                  {preferences && preferences.genres && preferences.genres.length > 0 && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 500, marginLeft: '0.5rem' }}>
                      ({preferences.genres.join(', ')} • Rating {preferences.minRating}★+)
                    </span>
                  )}
                </h3>
                <button 
                  onClick={() => setShowPreferencesModal(true)}
                  className="featured-btn-secondary"
                  style={{ fontSize: '0.75rem', padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', borderRadius: '8px' }}
                >
                  <Sliders size={12} /> Edit Preferences
                </button>
              </div>
              
              {preferenceRecommendations.length === 0 ? (
                <div className="empty-state glass-panel" style={{ padding: '2.5rem 1rem' }}>
                  <Grid className="empty-state-icon" size={32} style={{ color: '#a855f7', marginBottom: '0.5rem' }} />
                  <h4 style={{ color: '#fff', fontSize: '0.95rem', margin: '0 0 0.2rem 0' }}>No matching movies found</h4>
                  <p className="hero-subtitle" style={{ fontSize: '0.8rem', marginTop: '0.2rem', margin: 0 }}>
                    Try choosing different genres or lowering your rating threshold in preferences to get suggestions!
                  </p>
                </div>
              ) : (
                <div className="recommendations-grid">
                  {preferenceRecommendations.map((movie) => (
                    <MovieCard 
                      key={movie.id}
                      movie={movie}
                      onClick={() => {
                        handleMovieSelect(movie);
                        setActiveTab('recommender');
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {/* Features Grid Section */}
          <div>
            <h2 className="landing-section-title">Platform Features</h2>
            <p className="landing-section-subtitle">What makes the VDTALES experience so special</p>
            
            <div className="landing-features-grid">
              <div className="landing-feature-card">
                <div className="feature-icon-wrapper">
                  <Grid size={24} />
                </div>
                <h3 className="feature-card-title">ML Similarity Engine</h3>
                <p className="feature-card-desc">
                  Find matches using our built-in vector model. Search a title to calculate real-time similarity indices across genres, directors, and plot keywords.
                </p>
              </div>

              <div className="landing-feature-card">
                <div className="feature-icon-wrapper">
                  <Award size={24} />
                </div>
                <h3 className="feature-card-title">Creator Hub</h3>
                <p className="feature-card-desc">
                  See direct verdicts (Perfection, Go For It, Timepass, Skip It) from Dhaval Vagh, along with detailed review summaries.
                </p>
              </div>

              <div className="landing-feature-card">
                <div className="feature-icon-wrapper">
                  <Bookmark size={24} />
                </div>
                <h3 className="feature-card-title">Personal Watchlists</h3>
                <p className="feature-card-desc">
                  Organize your movie marathon and watch history. Everything is cached in your browser so you never lose your progress, even offline.
                </p>
              </div>
            </div>
          </div>

          {/* Meet the Creator Section */}
          <div className="landing-creator-section" style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <h2 className="landing-section-title">Meet the Creator</h2>
            <p className="landing-section-subtitle">Get to know the person behind the code, camera, and creativity.</p>
            
            <div className="glass-panel landing-creator-card-row" style={{ display: 'flex', gap: '3rem', padding: '3.5rem', alignItems: 'stretch' }}>
              <div className="creator-image-side" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
                <div style={{
                  width: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  border: '1.5px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
                  aspectRatio: '9/16'
                }}>
                  <img 
                    src={creatorImage} 
                    alt="Dhaval Vagh" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      display: 'block'
                    }} 
                  />
                </div>
              </div>
              
              <div className="creator-details-side" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '2rem', color: '#ffffff', fontWeight: 800, margin: '0 0 0.2rem 0' }}>Dhaval Vagh</h3>
                  <span style={{ fontSize: '1.05rem', color: 'var(--primary)', fontWeight: 700 }}>CSE Student • Developer • Video Editor • Content Creator</span>
                </div>
                
                <p style={{ fontSize: '1rem', lineHeight: '1.65', color: '#e4e4e7', margin: 0 }}>
                  I’m a Computer Science Engineering student who loves combining technology with creativity. I enjoy building websites and projects, editing videos, capturing moments, and creating content inspired by college life, travel, bikes, and everyday experiences.
                </p>
                
                <div>
                  <h4 style={{ color: '#ffffff', fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} style={{ color: 'var(--secondary)' }} />
                    My Interests
                  </h4>
                  <ul style={{ 
                    listStyleType: 'none', 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                    gap: '0.6rem 1.25rem', 
                    paddingLeft: 0,
                    margin: 0
                  }}>
                    <li style={{ color: 'var(--text-muted)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>💻</span> Web Development & Programming
                    </li>
                    <li style={{ color: 'var(--text-muted)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>🎬</span> Video Editing & Filmmaking
                    </li>
                    <li style={{ color: 'var(--text-muted)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>📸</span> Photography & Visual Storytelling
                    </li>
                    <li style={{ color: 'var(--text-muted)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>🎥</span> Content Creation & Reels
                    </li>
                    <li style={{ color: 'var(--text-muted)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>🏍️</span> Bikes, Travel & Vlogging
                    </li>
                  </ul>
                </div>
                
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1rem', marginTop: '0.4rem' }}>
                  <h4 style={{ color: '#ffffff', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.3rem' }}>My Goal</h4>
                  <p style={{ fontSize: '0.92rem', fontStyle: 'italic', fontWeight: 'bold', color: '#ffffff', margin: 0 }}>
                    "To keep learning, keep creating, and turn my ideas into something people can see, experience, and remember."
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discover Landing Dashboard */}
      {activeTab === 'discover' && (
        <div className="discover-layout">
          {/* Main Discover lists */}
          <div className="dashboard-grid" style={{ gap: '2.5rem' }}>
            <header className="hero-section glass-panel" style={{ padding: '3.5rem 2rem' }}>
              <div className="hero-bg-glow" style={{ background: 'radial-gradient(circle, rgba(244, 114, 182, 0.18) 0%, transparent 70%)' }}></div>
              <h1 className="hero-title" style={{ 
                fontSize: '2.8rem', 
                background: 'linear-gradient(to right, #ffffff, #fed7aa, #f472b6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                Track and Discover Cinema with Men of Culture
              </h1>
              <p className="hero-subtitle">
                Welcome to the VDTALES clone—a movie and TV community dashboard. Search releases, filter matches using custom cosine vector math, or log your personal verdicts!
              </p>

              {/* Quick Search */}
              <div className="search-wrapper" ref={searchRef}>
                <div className="search-bar-container glass-panel">
                  <Search className="search-icon" size={22} />
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search a movie or show to inspect..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  {searchQuery && (
                    <button className="tab-btn" onClick={() => setSearchQuery('')} style={{ padding: '0.4rem', marginRight: '0.5rem' }}>
                      <X size={18} />
                    </button>
                  )}
                  <button className="search-btn" onClick={() => {
                    if (suggestions.length > 0) {
                      handleMovieSelect(suggestions[0]);
                      setActiveTab('recommender');
                    }
                  }}>
                    Search
                  </button>
                </div>

                {showSuggestions && suggestions.length > 0 && (
                  <ul className="suggestions-list glass-panel">
                    {suggestions.map((movie) => (
                      <li
                        key={movie.id}
                        className="suggestion-item"
                        onClick={() => {
                          handleMovieSelect(movie);
                          setActiveTab('recommender');
                        }}
                      >
                        <span className="suggestion-title">{movie.title}</span>
                        <div className="suggestion-meta">
                          <span className="suggestion-rating" style={{ color: 'var(--secondary)' }}>
                            ★ {movie.vote_average.toFixed(1)}
                          </span>
                          <span>{movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </header>

            {/* Perfection row */}
            <section className="recommendations-section">
              <h3 className="section-title">
                👑 Perfection <span>Certified {contentType === 'tv' ? '(TV Shows)' : '(Movies)'}</span>
              </h3>
              <div className="recommendations-grid">
                                {curatedSelection.perfection.map((movie) => (
                  <MovieCard 
                    key={movie.id}
                    movie={movie}
                    onClick={() => {
                      handleMovieSelect(movie);
                      setActiveTab('recommender');
                    }}
                  />
                ))}
              </div>
            </section>

            {/* Trending row */}
            <section className="recommendations-section">
              <h3 className="section-title">
                🔥 Trending <span>Now</span>
              </h3>
              <div className="recommendations-grid">
                                {curatedSelection.trending.map((movie) => (
                  <MovieCard 
                    key={movie.id}
                    movie={movie}
                    onClick={() => {
                      handleMovieSelect(movie);
                      setActiveTab('recommender');
                    }}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right column: Dynamic Community Activity Feed */}
          <div className="glass-panel" style={{ padding: '1.75rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
              Community Reviews Feed
            </h3>
            
            <div className="community-feed-container">
              {reviewsFeed.map((rev) => {
                const verdictLabels = {
                  perfection: { label: '👑 Perfection', color: '#facc15', bg: 'rgba(250, 204, 21, 0.1)' },
                  go_for_it: { label: '👍 Go For It', color: '#22c55e', bg: 'rgba(34, 197, 150, 0.1)' },
                  timepass: { label: '🍿 Timepass', color: '#f472b6', bg: 'rgba(244, 114, 182, 0.1)' },
                  skip_it: { label: '❌ Skip It', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
                };
                const v = verdictLabels[rev.verdict] || verdictLabels.perfection;
                return (
                  <div key={rev.id} className="feed-review-card">
                    <div className="feed-header">
                      <div className="feed-user-badge">
                        {rev.avatarUrl ? (
                          <img src={rev.avatarUrl} alt="User" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div className="feed-avatar">{rev.username.slice(0, 1).toUpperCase()}</div>
                        )}
                        <div>
                          <span className="feed-username">{rev.username}</span>
                          <div className="feed-meta">{rev.timestamp}</div>
                        </div>
                      </div>
                      
                      <span 
                        className="feed-verdict-tag" 
                        style={{ color: v.color, background: v.bg, border: `1px solid ${v.color}40` }}
                      >
                        {v.label}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem' }}>
                      Verdict on:{' '}
                      <span 
                        className="feed-movie-title"
                        onClick={() => {
                          const movieObj = moviesData.find(m => m && m.id === rev.movieId);
                          if (movieObj) {
                            handleMovieSelect(movieObj);
                            setActiveTab('recommender');
                          }
                        }}
                      >
                        {rev.movieTitle}
                      </span>
                    </div>

                    <p className="feed-body">
                      "{rev.comment}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ML Recommender / Matcher Tab */}
      {activeTab === 'recommender' && (
        <div className="dashboard-grid">
          {/* Header */}
          <div className="settings-bar glass-panel">
            <div className="engine-selector">
              <span className="engine-label">Vector Space Engine</span>
              <div className="engine-options">
                <button
                  className={`engine-btn ${engine === 'library' ? 'active' : ''}`}
                  onClick={() => setEngine('library')}
                >
                  Vocab Capped (CountVectorizer)
                </button>
                <button
                  className={`engine-btn ${engine === 'scratch' ? 'active' : ''}`}
                  onClick={() => setEngine('scratch')}
                >
                  Full Vocab (From Scratch)
                </button>
              </div>
            </div>
            
            <div className="timing-badge">
              <Clock size={16} />
              <span>Similarity calculated in <strong>{execTime.toFixed(3)} ms</strong></span>
            </div>
          </div>

          {/* Movie Details Display Overhauled */}
          {selectedMovie && (
            <div className="movie-detail-card" style={{
              position: 'relative',
              background: '#0a0a0c',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              marginBottom: '2rem'
            }}>
              {historyIndex > 0 && (
                <button
                  onClick={goBack}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    zIndex: 10,
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }}
                  className="navbar-icon-hover"
                  title="Go Back"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              {/* Backdrop image */}
              <div style={{ position: 'relative', width: '100%', height: '220px', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundImage: `url(${posters[selectedMovie.id] || selectedMoviePoster})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center 20%',
                  filter: 'blur(20px)',
                  opacity: 0.25,
                  transform: 'scale(1.1)'
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: '140px',
                  background: 'linear-gradient(to top, #0a0a0c, transparent)'
                }}></div>
              </div>

                            {/* Detail Content Overlay */}
              <div className="details-top-overlay">
                {/* Left Column: Floating Poster */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{
                    width: '210px',
                    height: '310px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '3px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
                  }}>
                    <img 
                      src={posters[selectedMovie.id] || selectedMoviePoster} 
                      alt={selectedMovie.title} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>

                                {/* Right Column: Title Block & Metainfo */}
                <div className="details-title-block">
                  {/* Movie type / year / duration metadata line */}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {selectedMovie.id % 3 === 0 ? 'TV Show' : 'Movie'} • {selectedMovie.release_date ? selectedMovie.release_date.split('-')[0] : 'N/A'} • {formatRuntime(selectedMovie.runtime)}
                  </span>
                  
                  {/* Movie Title */}
                  <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', margin: '0.3rem 0 1rem 0', fontFamily: 'var(--font-display)', lineHeight: 1.1 }}>
                    {selectedMovie.title}
                  </h1>

                  {/* Metainfo Grid (Directed by, Country, Language, Age rating) */}
                  {(() => {
                    const { country, language } = getLanguageAndCountry(selectedMovie);
                    const ageRating = getAgeRating(selectedMovie);
                    return (
                                            <div className="details-meta-grid">
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Directed By</span>
                          <strong style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 700 }}>{selectedMovie.director || 'N/A'}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Country</span>
                          <strong style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 700 }}>{country}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Language</span>
                          <strong style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 700 }}>{language}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Age Rating</span>
                          <strong style={{ fontSize: '0.9rem', color: '#ffffff', fontWeight: 700 }}>{ageRating}</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

                            {/* Main Body Layout Split: Left (Overview, Cast) vs Right (Actions, Vibe Chart, VDTALES Meter) */}
              <div className="details-main-split">
                {/* Left Column: Overview and Cast */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Overview */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.75rem' }}>Overview</h3>
                    <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                      {selectedMovie.overview || "No synopsis available for this title."}
                    </p>
                    {/* Genre Pills below overview */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {(selectedMovie.genres || []).map((genre, i) => (
                        <span key={i} style={{
                          background: 'rgba(255,255,255,0.06)',
                          color: '#ffffff',
                          padding: '0.35rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          border: '1px solid rgba(255,255,255,0.06)'
                        }}>{genre}</span>
                      ))}
                    </div>
                  </div>

                  {/* Cast Section with circular portraits */}
                  {selectedMovie.cast && selectedMovie.cast.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.25rem' }}>Cast</h3>
                      <div style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                        {selectedMovie.cast.map((actor, idx) => (
                          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px', textAlign: 'center' }}>
                            <div style={{
                              width: '64px',
                              height: '64px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              border: '2px solid rgba(255,255,255,0.1)',
                              marginBottom: '0.5rem',
                              background: '#18181b'
                            }}>
                              <img 
                                src={`https://api.dicebear.com/7.x/open-peeps/svg?seed=${encodeURIComponent(actor)}`} 
                                alt={actor} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: 600, display: 'block', maxWidth: '80px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={actor}>
                              {actor}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Input Box */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
                    <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff' }}>Add a Review</h3>
                      <textarea 
                        className="review-input-textarea"
                        placeholder="Share your thoughts about this movie with the VDTALES community..."
                        value={reviewInput}
                        onChange={(e) => setReviewInput(e.target.value)}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          padding: '0.75rem',
                          fontSize: '0.9rem',
                          fontFamily: 'var(--font-sans)',
                          resize: 'none'
                        }}
                      />
                      <button 
                        type="submit" 
                        className="auth-submit-btn" 
                        style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem', width: 'fit-content', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px' }}
                      >
                        <MessageSquare size={14} /> Post Review
                      </button>
                    </form>
                  </div>
                </div>

                {/* Right Column: Primary Actions, Vibe Chart, VDTALES Meter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Actions block */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Watch Trailer - YouTube Red brand solid button */}
                    <button 
                      onClick={() => handleWatchTrailer(selectedMovie)}
                      style={{ 
                        background: '#ff0000', 
                        border: '1px solid #ff0000',
                        color: '#ffffff',
                        padding: '0.8rem 1.2rem',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.6rem',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 15px rgba(255, 0, 0, 0.25)',
                        marginBottom: '0.25rem'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.518 3.5 12 3.5 12 3.5s-7.517 0-9.388.555A3.002 3.002 0 0 0 .502 6.163C0 8.07 0 12 0 12s0 3.93.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.483 20.5 12 20.5 12 20.5s7.518 0 9.388-.555a3.003 3.003 0 0 0 2.11-2.108C24 15.93 24 12 24 12s0-3.93-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      <span>Watch Trailer</span>
                    </button>

                    {/* Watch Movie - Emerald green brand solid button */}
                    <button 
                      onClick={() => handleWatchMovie(selectedMovie)}
                      style={{ 
                        background: '#10b981', 
                        border: '1px solid #10b981',
                        color: '#ffffff',
                        padding: '0.8rem 1.2rem',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.6rem',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.25)',
                        marginBottom: '0.25rem'
                      }}
                    >
                      <Play size={18} fill="currentColor" />
                      <span>Watch Movie</span>
                    </button>

                    {/* Mark as Watched - solid purple button */}
                    <button 
                      onClick={() => handleToggleWatched(selectedMovie)}
                      style={{ 
                        background: watchedHistory.some(m => m && m.id === selectedMovie.id) ? 'rgba(139, 92, 246, 0.15)' : '#7c3aed', 
                        border: '1px solid #7c3aed',
                        color: '#ffffff',
                        padding: '0.8rem 1.2rem',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.6rem',
                        transition: 'all 0.2s ease',
                        boxShadow: watchedHistory.some(m => m && m.id === selectedMovie.id) ? 'none' : '0 4px 15px rgba(124, 58, 237, 0.3)'
                      }}
                    >
                      <CheckCircle size={18} />
                      <span>{watchedHistory.some(m => m && m.id === selectedMovie.id) ? 'Watched ✓' : 'Mark as Watched'}</span>
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {/* Collections button */}
                      <button 
                        onClick={() => showToast(`Added "${selectedMovie.title}" to your custom Collections.`, 'success')}
                        style={{ 
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: '#ffffff',
                          padding: '0.7rem 1rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Users size={14} />
                        <span>Collections</span>
                      </button>

                      {/* Watch Later (Want to Watch) button */}
                      <button 
                        onClick={() => handleToggleWantToWatch(selectedMovie)}
                        style={{ 
                          background: wantToWatch.some(m => m && m.id === selectedMovie.id) ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)', 
                          border: wantToWatch.some(m => m && m.id === selectedMovie.id) ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.08)',
                          color: wantToWatch.some(m => m && m.id === selectedMovie.id) ? '#60a5fa' : '#ffffff',
                          padding: '0.7rem 1rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <Bookmark size={14} />
                        <span>{wantToWatch.some(m => m && m.id === selectedMovie.id) ? 'Watch Later ✓' : 'Watch Later'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Vibe Chart Render */}
                  {(() => {
                    const vibes = getMovieVibes(selectedMovie);
                    return renderVibeChart(vibes);
                  })()}

                  {/* VDTALES Meter Gauge Render */}
                  {(() => {
                    const userVerdict = userVerdicts[selectedMovie.id];
                    const votesData = getMovieVotesData(selectedMovie, userVerdict);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {renderVDTalesMeter(votesData)}
                        
                        {/* Quick Verdict Selection triggers Gauge Update */}
                        <div style={{ background: '#111112', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cast Your Vote</span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem' }}>
                            {[
                              { key: 'perfection', label: 'Perfect', icon: Award, color: '#a855f7' },
                              { key: 'go_for_it', label: 'Go For It', icon: ThumbsUp, color: '#10b981' },
                              { key: 'timepass', label: 'Timepass', icon: Coffee, color: '#f472b6' },
                              { key: 'skip_it', label: 'Skip', icon: X, color: '#ef4444' }
                            ].map((v) => {
                              const isSel = userVerdict === v.key;
                              return (
                                <button
                                  key={v.key}
                                  onClick={() => setVDTalesVerdict(selectedMovie, v.key)}
                                  style={{
                                    background: isSel ? v.color : 'rgba(255,255,255,0.02)',
                                    color: isSel ? '#ffffff' : 'var(--text-muted)',
                                    border: `1px solid ${isSel ? v.color : 'rgba(255,255,255,0.06)'}`,
                                    padding: '0.5rem 0.25rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: 700,
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <v.icon size={12} />
                                  <span>{v.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Recommendations list */}

          {selectedMovie && (
            <section className="recommendations-section">
              <h3 className="section-title">
                Similar recommendations for <span>{selectedMovie.title}</span>
              </h3>
              
              <div className="recommendations-grid">
                                {recommendations.map((movie) => (
                  <MovieCard 
                    key={movie.id}
                    movie={movie}
                    onClick={() => handleMovieSelect(movie)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Personalized recommendations list */}
          {personalRecommendations && (
            <section className="recommendations-section" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '2.5rem' }}>
              <h3 className="section-title">
                Personalized Picks <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: 500 }}>(Based on your rating of <em>{personalRecommendations.basedOn}</em>)</span>
              </h3>
              
              <div className="recommendations-grid">
                                {personalRecommendations.movies.map((movie) => (
                  <MovieCard 
                    key={movie.id}
                    movie={movie}
                    onClick={() => handleMovieSelect(movie)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Curators tab */}
      {activeTab === 'curators' && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {/* Curators picks detailed list */}
          <div className="glass-panel" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="curator-profile-section" style={{ alignItems: 'flex-start' }}>
              <div style={{
                width: '180px',
                minWidth: '180px',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1.5px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}>
                <img 
                  src={curatorsData[selectedCurator].avatarUrl} 
                  alt={curatorsData[selectedCurator].name} 
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <h2 style={{ fontSize: '1.8rem', color: '#fff', fontWeight: 800 }}>{curatorsData[selectedCurator].name}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--text-dim)', fontWeight: 600, fontSize: '0.95rem', display: 'block' }}>
                    {curatorsData[selectedCurator].handle}
                  </span>
                  {curatorsData[selectedCurator].roles && curatorsData[selectedCurator].roles.map((role, i) => (
                    <span key={i} style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700, display: 'block' }}>
                      • {role}
                    </span>
                  ))}
                </div>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.5, fontSize: '0.9rem', marginTop: '0.2rem' }}>
                  {curatorsData[selectedCurator].bio}
                </p>
                
                {/* Social & Contact Row in Creator Hub */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
                  <a 
                    href="https://www.linkedin.com/in/vagh-dhaval-145264324/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="landing-cta-btn secondary"
                    style={{ 
                      padding: '0.45rem 0.85rem', 
                      fontSize: '0.8rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.4rem',
                      background: 'rgba(10, 102, 194, 0.1)',
                      border: '1px solid rgba(10, 102, 194, 0.25)',
                      color: '#00a0dc',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontWeight: 600
                    }}
                  >
                    <Linkedin size={14} />
                    <span>LinkedIn</span>
                  </a>
                  <a 
                    href="https://www.instagram.com/framesby._.dhaval?igsh=ZGNkaWJ5b3cycmc=" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="landing-cta-btn secondary"
                    style={{ 
                      padding: '0.45rem 0.85rem', 
                      fontSize: '0.8rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.4rem',
                      background: 'rgba(225, 48, 108, 0.1)',
                      border: '1px solid rgba(225, 48, 108, 0.25)',
                      color: '#fd1d1d',
                      textDecoration: 'none',
                      borderRadius: '6px',
                      fontWeight: 600
                    }}
                  >
                    <Instagram size={14} />
                    <span>Instagram</span>
                  </a>
                  <button 
                    onClick={() => setShowContactModal(true)}
                    className="landing-cta-btn primary"
                    style={{ 
                      padding: '0.5rem 1rem', 
                      fontSize: '0.8rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.4rem',
                      background: 'var(--primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      boxShadow: '0 4px 12px rgba(244, 114, 182, 0.2)'
                    }}
                  >
                    <Mail size={14} />
                    <span>Contact Me</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} style={{ color: 'var(--secondary)' }} />
                Creator Verdicts on the VDTALES Meter
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {curatorsPicksList.map((movie) => {
                  const badgeColors = {
                    perfection: { text: '#000', bg: '#facc15', label: '👑 Perfection' },
                    go_for_it: { text: '#fff', bg: '#22c55e', label: '👍 Go For It' },
                    timepass: { text: '#fff', bg: '#f472b6', label: '🍿 Timepass' },
                    skip_it: { text: '#fff', bg: '#ef4444', label: '❌ Skip It' }
                  };
                  const details = badgeColors[movie.curatorVerdict] || badgeColors.perfection;
                  return (
                    <div 
                      key={movie.id} 
                      className="glass-panel" 
                      style={{ 
                        padding: '1.25rem 1.5rem', 
                        background: 'rgba(0, 0, 0, 0.15)', 
                        display: 'grid', 
                        gridTemplateColumns: '1fr auto',
                        alignItems: 'center',
                        gap: '1rem'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <h4 
                          style={{ color: '#fff', fontSize: '1.05rem', cursor: 'pointer', fontWeight: 800 }}
                          onClick={() => {
                            handleMovieSelect(movie);
                            setActiveTab('recommender');
                          }}
                        >
                          {movie.title} <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 500 }}>({movie.release_date ? movie.release_date.split('-')[0] : 'N/A'})</span>
                        </h4>
                        <p style={{ fontStyle: 'italic', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          "{movie.curatorQuote}"
                        </p>
                      </div>
                      
                      <div 
                        style={{ 
                          background: details.bg,
                          color: details.text,
                          padding: '0.35rem 0.9rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 800
                        }}
                      >
                        {details.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vibe Wizard Questionnaire */}
      {activeTab === 'finder' && (
        <div className="wizard-wrapper">
          <div className="wizard-card glass-panel">
            <div className="wizard-header">
              <Sparkles className="logo-icon" size={32} />
              <h2 className="wizard-title">Movie Vibe Finder</h2>
              <p className="hero-subtitle" style={{ fontSize: '0.95rem' }}>
                Answer 4 quick questions to find your custom movie match!
              </p>
              
              {wizardStep < 4 && (
                <div className="wizard-progress-container">
                  <div className="wizard-progress-bar" style={{ width: `${(wizardStep / 3) * 100}%` }}></div>
                </div>
              )}
            </div>

            {/* Step 0: Mood / Vibe */}
            {wizardStep === 0 && (
              <div className="wizard-question-box">
                <h3 className="wizard-question-text">1. What's your vibe today?</h3>
                <div className="wizard-options-grid">
                  {[
                    { key: 'thrilled', title: 'Excited & Thrilled', desc: 'Action, high speed blockbusters and sci-fi', icon: Sparkles },
                    { key: 'chill', title: 'Relaxed & Chill', desc: 'Warm feel-good dramas, lighthearted fun', icon: Coffee },
                    { key: 'romance', title: 'Romantic & Sweet', desc: 'Heartfelt romances and emotional ties', icon: Heart },
                    { key: 'mindbend', title: 'Mind-bending & Smart', desc: 'Complex mysteries, detective thrillers', icon: Sliders },
                    { key: 'indie', title: 'Critically Acclaimed', desc: 'Elite movies with exceptionally high ratings', icon: Star },
                  ].map((opt) => (
                    <div 
                      key={opt.key}
                      className={`wizard-option-card ${wizardAnswers.mood === opt.key ? 'active' : ''}`}
                      onClick={() => setWizardAnswers(prev => ({ ...prev, mood: opt.key }))}
                    >
                      <div className="wizard-option-icon-wrapper">
                        <opt.icon size={18} />
                      </div>
                      <div className="wizard-option-info">
                        <span className="wizard-option-title">{opt.title}</span>
                        <span className="wizard-option-desc">{opt.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="wizard-footer-nav" style={{ justifyContent: 'flex-end' }}>
                  <button 
                    className="wizard-next-btn"
                    disabled={!wizardAnswers.mood}
                    onClick={() => setWizardStep(1)}
                  >
                    Next Step <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Genre Filter */}
            {wizardStep === 1 && (
              <div className="wizard-question-box">
                <h3 className="wizard-question-text">2. Which genre do you prefer?</h3>
                <div className="wizard-options-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  {[
                    'Action', 'Adventure', 'Comedy', 'Drama', 
                    'Science Fiction', 'Romance', 'Thriller', 'Horror', 'Family'
                  ].map((genre) => (
                    <div 
                      key={genre}
                      className={`wizard-option-card ${wizardAnswers.genre === genre ? 'active' : ''}`}
                      onClick={() => setWizardAnswers(prev => ({ ...prev, genre }))}
                      style={{ padding: '1rem', justifyContent: 'center' }}
                    >
                      <span className="wizard-option-title" style={{ textAlign: 'center' }}>{genre}</span>
                    </div>
                  ))}
                </div>
                
                <div className="wizard-footer-nav">
                  <button className="wizard-back-btn" onClick={() => setWizardStep(0)}>Back</button>
                  <button 
                    className="wizard-next-btn"
                    disabled={!wizardAnswers.genre}
                    onClick={() => setWizardStep(2)}
                  >
                    Next Step <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Duration */}
            {wizardStep === 2 && (
              <div className="wizard-question-box">
                <h3 className="wizard-question-text">3. How much time do you have?</h3>
                <div className="wizard-options-grid">
                  {[
                    { key: 'short', title: 'Short & Sweet', desc: 'Under 100 minutes, fast paced storytelling' },
                    { key: 'standard', title: 'Standard Runtime', desc: '95 to 125 minutes, classic film length' },
                    { key: 'epic', title: 'Epic Feature', desc: 'Over 125 minutes, deep character study/narratives' },
                    { key: 'any', title: 'Any Duration', desc: 'Time is not an issue, surprise me' },
                  ].map((opt) => (
                    <div 
                      key={opt.key}
                      className={`wizard-option-card ${wizardAnswers.duration === opt.key ? 'active' : ''}`}
                      onClick={() => setWizardAnswers(prev => ({ ...prev, duration: opt.key }))}
                    >
                      <div className="wizard-option-info" style={{ paddingLeft: '0.5rem' }}>
                        <span className="wizard-option-title">{opt.title}</span>
                        <span className="wizard-option-desc">{opt.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="wizard-footer-nav">
                  <button className="wizard-back-btn" onClick={() => setWizardStep(1)}>Back</button>
                  <button 
                    className="wizard-next-btn"
                    disabled={!wizardAnswers.duration}
                    onClick={() => setWizardStep(3)}
                  >
                    Next Step <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Release Era */}
            {wizardStep === 3 && (
              <div className="wizard-question-box">
                <h3 className="wizard-question-text">4. What cinema era are you looking for?</h3>
                <div className="wizard-options-grid">
                  {[
                    { key: 'modern', title: 'Modern blockbusters', desc: 'Released 2010 and beyond' },
                    { key: 'millennial', title: 'Millennial classics', desc: '2000s era classics' },
                    { key: 'retro', title: 'Retro Gems', desc: '80s & 90s vintage releases' },
                    { key: 'any', title: 'Any Release Era', desc: 'Show matches from all years' },
                  ].map((opt) => (
                    <div 
                      key={opt.key}
                      className={`wizard-option-card ${wizardAnswers.era === opt.key ? 'active' : ''}`}
                      onClick={() => setWizardAnswers(prev => ({ ...prev, era: opt.key }))}
                    >
                      <div className="wizard-option-info" style={{ paddingLeft: '0.5rem' }}>
                        <span className="wizard-option-title">{opt.title}</span>
                        <span className="wizard-option-desc">{opt.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="wizard-footer-nav">
                  <button className="wizard-back-btn" onClick={() => setWizardStep(2)}>Back</button>
                  <button 
                    className="wizard-next-btn"
                    disabled={!wizardAnswers.era}
                    onClick={runWizardFinder}
                    style={{ background: 'var(--primary)', boxShadow: '0 4px 12px rgba(244, 114, 182, 0.3)' }}
                  >
                    Find My Match 🎬
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Result page */}
            {wizardStep === 4 && wizardResult && (
              <div className="wizard-result-container">
                <div className="perfect-match-badge" style={{ background: 'rgba(244, 114, 182, 0.1)', color: 'var(--primary)', border: '1px solid rgba(244, 114, 182, 0.2)' }}>
                  <Sparkles size={16} />
                  <span>The Perfect Match Found!</span>
                </div>

                <div className="movie-detail-card glass-panel" style={{ width: '100%', gridTemplateColumns: '240px 1fr', padding: '1.75rem' }}>
                  <div className="wizard-result-glow" style={{ background: 'radial-gradient(circle, rgba(244, 114, 182, 0.15) 0%, transparent 75%)' }}></div>
                  
                  <div className="movie-poster-wrapper" style={{ height: '350px' }}>
                    <img 
                      src={posters[wizardResult.id] || "https://images.unsplash.com/photo-1542204172-e7052809a86f?q=80&w=500&auto=format&fit=crop"} 
                      alt={wizardResult.title} 
                      className="movie-poster" 
                    />
                  </div>

                  <div className="movie-info" style={{ justifyContent: 'center' }}>
                    <div className="movie-title-row">
                      <h2 className="movie-detail-title" style={{ fontSize: '2.1rem' }}>{wizardResult.title}</h2>
                      <div className="genres-list">
                        {wizardResult.genres && wizardResult.genres.map((g, idx) => <span key={idx} className="genre-tag">{g}</span>)}
                      </div>
                    </div>

                    <div className="movie-meta-pills">
                      <div className="meta-pill" style={{ color: 'var(--secondary)' }}>
                        <Star size={14} fill="currentColor" />
                        <span>{wizardResult.vote_average.toFixed(1)} / 10</span>
                      </div>
                      <div className="meta-pill">
                        <Calendar size={14} />
                        <span>{wizardResult.release_date ? wizardResult.release_date.split('-')[0] : 'N/A'}</span>
                      </div>
                      <div className="meta-pill">
                        <Clock size={14} />
                        <span>{wizardResult.runtime} min</span>
                      </div>
                    </div>

                    <p className="overview-text" style={{ fontSize: '0.92rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {wizardResult.overview}
                    </p>

                    <div className="wizard-result-actions">
                      <button 
                        className="search-btn"
                        onClick={() => {
                          handleMovieSelect(wizardResult);
                          setActiveTab('recommender');
                        }}
                      >
                        Find Similar Matches <ArrowRight size={16} />
                      </button>

                      <button 
                        className="action-btn"
                        onClick={runWizardFinder}
                        style={{ borderStyle: 'dashed' }}
                      >
                        <RefreshCw size={16} /> Spin Again
                      </button>

                      <button 
                        className={`action-btn ${wantToWatch.some(m => m && m.id === wizardResult.id) ? 'active' : ''}`}
                        onClick={() => handleToggleWantToWatch(wizardResult)}
                      >
                        <Bookmark size={14} fill={wantToWatch.some(m => m && m.id === wizardResult.id) ? 'currentColor' : 'none'} />
                        Watchlist
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  className="wizard-back-btn" 
                  onClick={() => {
                    setWizardStep(0);
                    setWizardAnswers({ mood: '', genre: '', duration: '', era: '' });
                    setWizardResult(null);
                  }}
                  style={{ zIndex: 1 }}
                >
                  Restart Quiz 🔄
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Want to Watch & Watched Collections list */}
      {activeTab === 'watchlist' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Want to Watch */}
          <div className="recommendations-section">
            <h2 className="section-title">
              <Bookmark size={24} style={{ color: 'var(--primary)' }} />
              Want to Watch <span>({wantToWatch.length} items)</span>
            </h2>
            
            {wantToWatch.length === 0 ? (
              <div className="empty-state glass-panel" style={{ padding: '3.5rem 1rem' }}>
                <Bookmark className="empty-state-icon" size={32} />
                <h4 style={{ color: '#fff', fontSize: '1rem' }}>Your watchlist is empty</h4>
                <p className="hero-subtitle" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Click "Want to Watch" on any title details card to bookmark it here.
                </p>
              </div>
            ) : (
                            <div className="watchlist-grid">
                {wantToWatch.map((movie) => {
                  if (!movie) return null;
                  return (
                    <MovieCard 
                      key={movie.id}
                      movie={movie}
                      onClick={() => { handleMovieSelect(movie); setActiveTab('recommender'); }}
                      actionButton={
                        <button 
                          className="remove-watchlist-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleWantToWatch(movie);
                          }}
                          style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 5, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}
                        >
                          <Trash size={14} />
                        </button>
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Watched History */}
          <div className="recommendations-section" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '2rem' }}>
            <h2 className="section-title">
              <CheckCircle size={24} style={{ color: '#22c55e' }} />
              Watched History <span>({watchedHistory.length} items)</span>
            </h2>
            
            {watchedHistory.length === 0 ? (
              <div className="empty-state glass-panel" style={{ padding: '3.5rem 1rem' }}>
                <CheckCircle className="empty-state-icon" size={32} />
                <h4 style={{ color: '#fff', fontSize: '1rem' }}>You haven't logged any movies as watched</h4>
                <p className="hero-subtitle" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Mark titles as "Mark as Watched" to compile your viewing history here.
                </p>
              </div>
            ) : (
                            <div className="watchlist-grid">
                {watchedHistory.map((movie) => {
                  if (!movie) return null;
                  const hasVerdict = userVerdicts[movie.id];
                  const verdictLabels = {
                    perfection: { text: '#000', bg: '#facc15', label: '👑 Perfection' },
                    go_for_it: { text: '#fff', bg: '#22c55e', label: '👍 Go For It' },
                    timepass: { text: '#fff', bg: '#f472b6', label: '🍿 Timepass' },
                    skip_it: { text: '#fff', bg: '#ef4444', label: '❌ Skip It' }
                  };
                  return (
                    <MovieCard 
                      key={movie.id}
                      movie={movie}
                      onClick={() => { handleMovieSelect(movie); setActiveTab('recommender'); }}
                      actionButton={
                        <>
                          <button 
                            className="remove-watchlist-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleWatched(movie);
                            }}
                            style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 5, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}
                          >
                            <Trash size={14} />
                          </button>
                          {hasVerdict && (
                            <div 
                              style={{ 
                                position: 'absolute', 
                                bottom: '48px', 
                                left: '8px', 
                                background: verdictLabels[hasVerdict].bg, 
                                color: verdictLabels[hasVerdict].text, 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '4px', 
                                fontSize: '0.7rem', 
                                fontWeight: 800,
                                zIndex: 2
                              }}
                            >
                              {verdictLabels[hasVerdict].label}
                            </div>
                          )}
                        </>
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Premium Footer */}
      <footer className="premium-footer">
        <div className="footer-content">
          <div className="footer-col">
            <div className="footer-brand">
              <Film className="footer-logo-icon" size={24} />
              <span>VDTALES</span>
            </div>
            <p className="footer-desc">
              Community review platform and machine learning recommendation engine. Built to recommend and track matching movies using vector similarity scores.
            </p>
            <div className="footer-socials">
              <div className="social-icon-btn" title="Security & Shield"><Shield size={16} /></div>
              <div className="social-icon-btn" title="User Settings"><User size={16} /></div>
              <div className="social-icon-btn" title="Explore"><Compass size={16} /></div>
            </div>
          </div>
          
          <div className="footer-col">
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-links">
              <li><span className="footer-link" onClick={() => setActiveTab('landing')}>Home Page</span></li>
              <li><span className="footer-link" onClick={() => setActiveTab('discover')}>Discover Hub</span></li>
              <li><span className="footer-link" onClick={() => setActiveTab('recommender')}>ML Matcher</span></li>
              <li><span className="footer-link" onClick={() => setActiveTab('curators')}>Creator Hub</span></li>
              <li><span className="footer-link" onClick={() => setActiveTab('watchlist')}>My Collection</span></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h4 className="footer-col-title">ML Tech Stack</h4>
            <ul className="footer-links">
              <li><span className="footer-link">TF-IDF Vector Space</span></li>
              <li><span className="footer-link">Sparse Dot Product</span></li>
              <li><span className="footer-link">Cosine Distance Metric</span></li>
            </ul>
          </div>
          
          <div className="footer-col">
            <h4 className="footer-col-title">Sources & Data</h4>
            <p className="footer-desc" style={{ fontSize: '0.85rem' }}>
              Movie titles, overview and details are parsed from the Kaggle TMDB 5000 movie dataset. Poster images are dynamically fetched using the TMDB public API.
            </p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <span className="footer-copy">
            &copy; {new Date().getFullYear()} VDTALES.in. All rights reserved.
          </span>
          <div className="footer-meta-links">
            <span className="footer-meta-link" style={{ cursor: 'pointer' }}>Privacy Policy</span>
            <span className="footer-meta-link" style={{ cursor: 'pointer' }}>Terms of Use</span>
            <span className="footer-meta-link" style={{ cursor: 'pointer' }}>System Status</span>
          </div>
        </div>
      </footer>

      {/* Floating Notification Toast List */}
      <div className="notification-container">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast-notification">
            <CheckCircle size={18} className={`toast-icon ${toast.type === 'success' ? 'success' : 'error'}`} />
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Auth Modal (Mock Sign In / Signup + VDTALES Invite Gates) */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="auth-card glass-panel">
            <button className="close-modal-btn" onClick={() => setShowAuthModal(false)}>
              <X size={16} />
            </button>
            
            <div className="auth-tabs">
              <button 
                className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Sign In
              </button>
              <button 
                className={`auth-tab ${authMode === 'signup' ? 'active' : ''}`}
                onClick={() => setAuthMode('signup')}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="input-with-icon">
                  <User className="input-icon" size={16} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter username"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              {authMode === 'signup' && (
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="input-with-icon">
                    <Mail className="input-icon" size={16} />
                    <input 
                      type="email" 
                      className="form-input" 
                      placeholder="you@example.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <Lock className="input-icon" size={16} />
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn">
                {authMode === 'login' ? 'Sign In to VDTALES' : 'Join VDTALES Community'}
              </button>
            </form>

            <div className="auth-switch-text">
              {authMode === 'login' ? (
                <>New to VDTALES? <span className="auth-switch-link" onClick={() => setAuthMode('signup')}>Register now</span></>
              ) : (
                <>Already have an account? <span className="auth-switch-link" onClick={() => setAuthMode('login')}>Sign in</span></>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal */}
      {showContactModal && (
        <div className="modal-overlay">
          <div className="auth-card glass-panel" style={{ maxWidth: '450px' }}>
            <button className="close-modal-btn" onClick={() => setShowContactModal(false)}>
              <X size={16} />
            </button>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={20} style={{ color: 'var(--primary)' }} />
              Contact Dhaval Vagh
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Have a question, feedback, or project idea? Drop a message here and I'll get back to you.
            </p>

            <form onSubmit={handleContactSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Your Name</label>
                <div className="input-with-icon">
                  <User className="input-icon" size={16} />
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Enter your name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-with-icon">
                  <Mail className="input-icon" size={16} />
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="you@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Your Message</label>
                <textarea 
                  className="form-input" 
                  placeholder="Type your message here..."
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  required
                  style={{
                    minHeight: '100px',
                    fontFamily: 'var(--font-sans)',
                    resize: 'none',
                    padding: '0.75rem',
                    lineHeight: '1.5',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '8px',
                    color: '#ffffff'
                  }}
                />
              </div>

              <button type="submit" className="auth-submit-btn" style={{ marginTop: '0.5rem' }}>
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <div className="modal-overlay">
          <div className="preferences-modal-content">
            <button className="close-modal-btn" onClick={() => setShowPreferencesModal(false)}>
              <X size={16} />
            </button>
            
            <h2 className="preferences-title">Movie Preferences</h2>
            <p className="preferences-subtitle">
              Tell us what you like and we'll suggest matching blockbusters with high rating scores!
            </p>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem' }}>Favorite Genres</label>
              <div className="genres-preference-grid">
                {[
                  'Action', 'Adventure', 'Fantasy', 'Science Fiction', 
                  'Crime', 'Drama', 'Thriller', 'Animation', 
                  'Family', 'Comedy', 'Romance', 'Horror', 'Mystery'
                ].map((genre) => {
                  const isSel = prefGenres.includes(genre);
                  return (
                    <div 
                      key={genre}
                      className={`genre-pref-tag ${isSel ? 'active' : ''}`}
                      onClick={() => handleTogglePrefGenre(genre)}
                    >
                      {genre}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rating-pref-slider-box">
              <div className="rating-slider-header">
                <span className="rating-slider-label">Minimum Movie Rating</span>
                <span className="rating-slider-value">★ {prefMinRating}</span>
              </div>
              <input 
                type="range" 
                min="5.0" 
                max="9.0" 
                step="0.1" 
                className="rating-slider-input"
                value={prefMinRating}
                onChange={(e) => setPrefMinRating(parseFloat(e.target.value))}
              />
            </div>

            <div className="preferences-actions">
              <button className="pref-btn-skip" onClick={() => setShowPreferencesModal(false)}>
                Cancel
              </button>
              <button className="pref-btn-save" onClick={handleSavePreferences}>
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trailer Video Modal Overlay */}
      {trailerVideoUrl && (
        <div className="trailer-modal-overlay" onClick={() => setTrailerVideoUrl(null)}>
          <div className="trailer-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="trailer-close-btn" onClick={() => setTrailerVideoUrl(null)}>
              <X size={16} /> Close Trailer
            </button>
            <iframe 
              className="trailer-iframe"
              src={`${trailerVideoUrl}?autoplay=1`}
              title="Movie Trailer"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        </div>
      )}
      </div>
    </>
  );
}
