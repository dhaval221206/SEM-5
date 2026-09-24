from flask import Flask, request, jsonify
import pickle
import numpy as np
import time
import os
import sys

# Try importing flask_cors, or use manual fallback
try:
    from flask_cors import CORS
    HAS_CORS = True
except ImportError:
    HAS_CORS = False

app = Flask(__name__)

if HAS_CORS:
    CORS(app, resources={r"/api/*": {"origins": "*"}})

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))

# Global model pointers
movies = None
similarity_matrix = None
custom_vectors = None

def find_file(filename):
    possible_paths = [
        os.path.join(SCRIPT_DIR, 'models', filename),
        os.path.join(SCRIPT_DIR, filename),
        os.path.join(PROJECT_ROOT, 'models', filename),
        os.path.join(PROJECT_ROOT, filename)
    ]
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return None

def load_models():
    global movies, similarity_matrix, custom_vectors
    print("Loading precomputed ML models...")
    
    movies_file = find_file('movies_cleaned.pkl')
    similarity_file = find_file('similarity_matrix.pkl')
    vectors_file = find_file('custom_vectors.pkl')
    
    if not movies_file or not similarity_file or not vectors_file:
        print("Warning: Model pickle files not found! Please run 'preprocess.py' first.")
        return False
        
    try:
        start_time = time.time()
        with open(movies_file, 'rb') as f:
            movies = pickle.load(f)
        with open(similarity_file, 'rb') as f:
            similarity_matrix = pickle.load(f)
        with open(vectors_file, 'rb') as f:
            custom_vectors = pickle.load(f)
        elapsed = round(time.time() - start_time, 3)
        print(f"Models loaded successfully in {elapsed}s! Total movies: {len(movies)}")
        return True
    except Exception as e:
        print(f"Error loading models: {e}")
        return False

# Initial load on server startup
load_models()

# Manual CORS fallback headers if flask-cors isn't available
if not HAS_CORS:
    @app.before_request
    def handle_options_preflight():
        if request.method == 'OPTIONS':
            response = app.make_default_options_response()
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
            response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
            return response

    @app.after_request
    def add_cors_headers(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

# Helper for custom cosine similarity from scratch
def cosine_similarity_scratch(vec_a, vec_b):
    vec_a = vec_a.astype(np.float64)
    vec_b = vec_b.astype(np.float64)
    dot_product = np.dot(vec_a, vec_b)
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "service": "Movie Recommender System API",
        "status": "online" if movies is not None else "models_not_loaded",
        "total_movies": len(movies) if movies is not None else 0,
        "endpoints": {
            "status": "/api/status",
            "movies": "/api/movies",
            "recommend": "/api/recommend?movie=Avatar&method=library",
            "reload": "/api/reload"
        }
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    if movies is None:
        return jsonify({"status": "error", "message": "Models not loaded. Run preprocess.py."}), 500
    return jsonify({
        "status": "ready",
        "total_movies": len(movies),
        "models_loaded": True
    })

@app.route('/api/movies', methods=['GET'])
def get_movies_list():
    if movies is None:
        return jsonify({"error": "Models not loaded"}), 500
    
    movies_list = []
    for idx, row in movies.iterrows():
        movies_list.append({
            "id": int(row['id']),
            "title": str(row['title']),
            "genres": list(row['display_genres']),
            "vote_average": float(row['vote_average']),
            "popularity": float(row['popularity']),
            "release_date": str(row['release_date']),
            "runtime": int(row['runtime'])
        })
    return jsonify(movies_list)

@app.route('/api/recommend', methods=['GET'])
def recommend_movies():
    if movies is None:
        return jsonify({"error": "Models not loaded"}), 500
    
    movie_title = request.args.get('movie', '').strip()
    method = request.args.get('method', 'library').lower()  # 'library' or 'scratch'
    
    if not movie_title:
        return jsonify({"error": "Movie title parameter is required (e.g. ?movie=Avatar)"}), 400
    
    # Fuzzy / case-insensitive search
    matching_movies = movies[movies['title'].str.lower() == movie_title.lower()]
    if matching_movies.empty:
        # Try substring match
        matching_movies = movies[movies['title'].str.lower().str.contains(movie_title.lower())]
        if matching_movies.empty:
            return jsonify({"error": f"Movie '{movie_title}' not found in database"}), 404
        
    movie_index = matching_movies.index[0]
    selected_row = movies.iloc[movie_index]
    selected_movie_data = {
        "id": int(selected_row['id']),
        "title": str(selected_row['title']),
        "overview": str(selected_row['overview']),
        "genres": list(selected_row['display_genres']),
        "cast": list(selected_row['display_cast']),
        "director": str(selected_row['display_director']),
        "vote_average": float(selected_row['vote_average']),
        "popularity": float(selected_row['popularity']),
        "release_date": str(selected_row['release_date']),
        "runtime": int(selected_row['runtime'])
    }
    
    start_time = time.time()
    recommended_indices = []
    
    if method == 'scratch':
        query_vector = custom_vectors[movie_index]
        scores = []
        for idx in range(len(custom_vectors)):
            if idx == movie_index:
                continue
            score = cosine_similarity_scratch(query_vector, custom_vectors[idx])
            scores.append((idx, score))
        scores = sorted(scores, key=lambda x: x[1], reverse=True)
        recommended_indices = [s[0] for s in scores[:5]]
    else:
        distances = similarity_matrix[movie_index]
        movies_list = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])
        recommended = [m for m in movies_list if m[0] != movie_index][:5]
        recommended_indices = [m[0] for m in recommended]
        
    end_time = time.time()
    execution_time_ms = (end_time - start_time) * 1000
    
    recommendations = []
    for idx in recommended_indices:
        row = movies.iloc[idx]
        recommendations.append({
            "id": int(row['id']),
            "title": str(row['title']),
            "overview": str(row['overview']),
            "genres": list(row['display_genres']),
            "cast": list(row['display_cast']),
            "director": str(row['display_director']),
            "vote_average": float(row['vote_average']),
            "popularity": float(row['popularity']),
            "release_date": str(row['release_date']),
            "runtime": int(row['runtime'])
        })
        
    return jsonify({
        "selected_movie": selected_movie_data,
        "recommendations": recommendations,
        "execution_time_ms": round(execution_time_ms, 2),
        "method": method,
        "source": "backend_api"
    })

@app.route('/api/reload', methods=['POST'])
def reload_data():
    success = load_models()
    if success:
        return jsonify({"message": "Models reloaded successfully", "total_movies": len(movies)})
    return jsonify({"error": "Failed to load models"}), 500

@app.route('/api/preprocess', methods=['POST'])
def trigger_preprocess():
    try:
        import preprocess
        load_models()
        return jsonify({"message": "Preprocessing completed and models reloaded successfully"})
    except Exception as e:
        return jsonify({"error": f"Preprocessing failed: {str(e)}"}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Movie Recommender Backend API on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=True)
