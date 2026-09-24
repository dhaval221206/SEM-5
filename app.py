from flask import Flask, request, jsonify
import pickle
import numpy as np
import time
import os

app = Flask(__name__)

# Load models globally
movies = None
similarity_matrix = None
custom_vectors = None

def load_models():
    global movies, similarity_matrix, custom_vectors
    print("Loading precomputed models...")
    try:
        with open('movies_cleaned.pkl', 'rb') as f:
            movies = pickle.load(f)
        with open('similarity_matrix.pkl', 'rb') as f:
            similarity_matrix = pickle.load(f)
        with open('custom_vectors.pkl', 'rb') as f:
            custom_vectors = pickle.load(f)
        print("Models loaded successfully!")
    except FileNotFoundError:
        print("Preprocessed models not found. Please run 'preprocess.py' first.")

load_models()

# Manual CORS implementation
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

# Helper for custom cosine similarity (from scratch)
def cosine_similarity_scratch(vec_a, vec_b):
    dot_product = np.sum(vec_a * vec_b)
    norm_a = np.sqrt(np.sum(vec_a * vec_a))
    norm_b = np.sqrt(np.sum(vec_b * vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))

@app.route('/api/status', methods=['GET'])
def get_status():
    if movies is None:
        return jsonify({"status": "error", "message": "Models not loaded. Run preprocess.py."}), 500
    return jsonify({"status": "ready", "total_movies": len(movies)})

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
    
    movie_title = request.args.get('movie', '')
    method = request.args.get('method', 'library') # 'library' or 'scratch'
    
    if not movie_title:
        return jsonify({"error": "Movie title parameter is required"}), 400
    
    # Find movie index
    matching_movies = movies[movies['title'].str.lower() == movie_title.lower()]
    if matching_movies.empty:
        return jsonify({"error": f"Movie '{movie_title}' not found in database"}), 404
        
    movie_index = matching_movies.index[0]
    selected_movie_data = {
        "id": int(movies.iloc[movie_index]['id']),
        "title": str(movies.iloc[movie_index]['title']),
        "overview": str(movies.iloc[movie_index]['overview']),
        "genres": list(movies.iloc[movie_index]['display_genres']),
        "cast": list(movies.iloc[movie_index]['display_cast']),
        "director": str(movies.iloc[movie_index]['display_director']),
        "vote_average": float(movies.iloc[movie_index]['vote_average']),
        "popularity": float(movies.iloc[movie_index]['popularity']),
        "release_date": str(movies.iloc[movie_index]['release_date']),
        "runtime": int(movies.iloc[movie_index]['runtime'])
    }
    
    start_time = time.time()
    recommended_indices = []
    
    if method == 'scratch':
        query_vector = custom_vectors[movie_index]
        scores = []
        for idx, vec in enumerate(custom_vectors):
            if idx == movie_index:
                continue
            score = cosine_similarity_scratch(query_vector, vec)
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
        "method": method
    })

@app.route('/api/reload', methods=['POST'])
def reload_data():
    load_models()
    return jsonify({"message": "Models reloaded successfully"})

if __name__ == '__main__':
    if movies is None:
        load_models()
    app.run(debug=True, port=5000)
