# Movie Recommender System - Backend Service

Production-ready Flask REST API backend for the Movie Recommender Application. Serves vector-similarity based movie recommendations using Scikit-Learn Cosine Similarity and a custom Scratch Vectorizer engine.

---

## 📁 Directory Structure

```
Backend/
├── app.py                     # Main Flask REST API server
├── preprocess.py              # ML preprocessing pipeline & model generator
├── convert_to_json.py         # Export DataFrame to JSON for frontend sync
├── requirements.txt           # Production Python dependencies
├── Procfile                   # Process file for Render / Heroku deployment
├── render.yaml                # Render 1-Click Cloud Blueprint specification
├── vercel.json                # Vercel Serverless deployment config
├── Dockerfile                 # Production Docker image configuration
├── docker-compose.yml         # Compose setup for full stack
├── run_backend.bat            # Windows 1-Click launcher
├── run_backend.sh             # Linux / macOS 1-Click launcher
├── models/                    # Pickled ML models
│   ├── movies_cleaned.pkl
│   ├── similarity_matrix.pkl  (Optimized float32)
│   └── custom_vectors.pkl     (Optimized uint16)
└── data/                      # Raw datasets & JSON exports
    ├── tmdb_5000_movies.csv
    ├── tmdb_5000_credits.csv
    └── movies_data.json
```

---

## 🚀 API Endpoints Reference

### 1. Health Check
- **Endpoint**: `GET /api/status`
- **Response**:
```json
{
  "status": "ready",
  "total_movies": 4809,
  "models_loaded": true
}
```

### 2. Get All Movies
- **Endpoint**: `GET /api/movies`
- **Response**: Array of movie summary objects (`id`, `title`, `genres`, `vote_average`, `popularity`, `release_date`, `runtime`).

### 3. Recommend Movies
- **Endpoint**: `GET /api/recommend?movie={title}&method={library|scratch}`
- **Parameters**:
  - `movie` (required): Movie title (e.g. `Avatar` or `Inception`).
  - `method` (optional): `library` (Scikit-Learn cosine matrix) or `scratch` (Custom CountVectorizer & Dot product math). Default is `library`.
- **Response**:
```json
{
  "selected_movie": {
    "id": 19995,
    "title": "Avatar",
    "overview": "In the 22nd century...",
    "genres": ["Action", "Adventure", "Fantasy", "Science Fiction"],
    "cast": ["Sam Worthington", "Zoe Saldana", "Sigourney Weaver"],
    "director": "James Cameron",
    "vote_average": 7.2,
    "popularity": 150.437577,
    "release_date": "2009-12-10",
    "runtime": 162
  },
  "recommendations": [
    { "id": 285, "title": "Pirates of the Caribbean: At World's End", ... },
    { "id": 206647, "title": "Spectre", ... },
    ...
  ],
  "execution_time_ms": 1.45,
  "method": "library",
  "source": "backend_api"
}
```

### 4. Reload Pickles
- **Endpoint**: `POST /api/reload`
- **Response**: Reloads `.pkl` files dynamically without restarting server.

---

## 🛠️ Local Development & Running

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Preprocessing (Build Models)
```bash
python preprocess.py
```

### 3. Launch Backend Server
```bash
python app.py
```
Or use the 1-click script:
- Windows: double-click `run_backend.bat`
- Linux / Mac: `./run_backend.sh`

The API will be live at `http://127.0.0.1:5000`.

---

## 🌐 Live Deployment Instructions

### Option 1: Deploying on Render (Recommended - 100% Free)

1. Push your project repository to GitHub.
2. Log in to [Render.com](https://render.com).
3. Click **New +** -> **Web Service**.
4. Connect your GitHub repository.
5. Set the following details:
   - **Name**: `movie-recommender-backend`
   - **Root Directory**: `Backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt && python preprocess.py`
   - **Start Command**: `gunicorn app:app --timeout 120 --workers 2`
6. Click **Create Web Service**.
7. Render will build and deploy your API live at `https://movie-recommender-backend.onrender.com`.

### Option 2: Deploying Frontend on Vercel & Connecting Backend

1. Deploy `front end` directory on Vercel.
2. In Vercel Project Settings -> **Environment Variables**, add:
   - `VITE_BACKEND_URL` = `https://movie-recommender-backend.onrender.com`
3. Redeploy frontend. The app will automatically talk to your live backend!

### Option 3: Docker Deployment

To build and launch using Docker:
```bash
cd Backend
docker build -t movie-recommender-backend .
docker run -p 5000:5000 movie-recommender-backend
```

Or using Docker Compose for Full Stack:
```bash
docker-compose up --build
```
