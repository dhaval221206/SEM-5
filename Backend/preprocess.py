import numpy as np
import pandas as pd
import ast
import pickle
import collections
import os
import sys
import json

print("==================================================")
print("Starting Movie Recommender System Preprocessing...")
print("==================================================")

# Determine base paths dynamically
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))

def locate_file(filename):
    possible_paths = [
        os.path.join(SCRIPT_DIR, 'data', filename),
        os.path.join(SCRIPT_DIR, filename),
        os.path.join(PROJECT_ROOT, filename),
        os.path.join(PROJECT_ROOT, 'data', filename)
    ]
    for path in possible_paths:
        if os.path.exists(path):
            return path
    return None

movies_path = locate_file('tmdb_5000_movies.csv')
credits_path = locate_file('tmdb_5000_credits.csv')

if not movies_path or not credits_path:
    print(f"Error: Raw CSV datasets not found in {SCRIPT_DIR} or {PROJECT_ROOT}")
    sys.exit(1)

print(f"Loading raw datasets:\n - Movies: {movies_path}\n - Credits: {credits_path}")
movies = pd.read_csv(movies_path)
credits = pd.read_csv(credits_path)

# Merge datasets on title
print("Merging datasets on title...")
movies = movies.merge(credits, on='title')

# Helper converters
def convert_genres_keywords(obj):
    if isinstance(obj, list):
        return [i['name'] for i in obj if isinstance(i, dict) and 'name' in i]
    try:
        return [i['name'] for i in ast.literal_eval(obj)]
    except Exception:
        return []

def convert_cast(obj):
    if isinstance(obj, list):
        return [i['name'] for i in obj[:3] if isinstance(i, dict) and 'name' in i]
    try:
        L = []
        counter = 0
        for i in ast.literal_eval(obj):
            if counter != 3:
                L.append(i['name'])
                counter += 1
            else:
                break
        return L
    except Exception:
        return []

def fetch_director(obj):
    if isinstance(obj, list):
        for i in obj:
            if isinstance(i, dict) and i.get('job') == 'Director' and 'name' in i:
                return [i['name']]
        return []
    try:
        for i in ast.literal_eval(obj):
            if i['job'] == 'Director':
                return [i['name']]
        return []
    except Exception:
        return []

# Extract data for display
print("Cleaning columns for presentation...")
movies['display_genres'] = movies['genres'].apply(convert_genres_keywords)
movies['display_cast'] = movies['cast'].apply(convert_cast)
movies['display_director'] = movies['crew'].apply(fetch_director).apply(lambda x: x[0] if len(x) > 0 else "")

# Clean data for tag vectorization
movies['genres_clean'] = movies['display_genres'].apply(lambda x: [i.replace(" ", "").lower() for i in x])
movies['keywords_clean'] = movies['keywords'].apply(convert_genres_keywords).apply(lambda x: [i.replace(" ", "").lower() for i in x])
movies['cast_clean'] = movies['display_cast'].apply(lambda x: [i.replace(" ", "").lower() for i in x])
movies['director_clean'] = movies['display_director'].apply(lambda x: [x.replace(" ", "").lower()] if x else [])
movies['overview_clean'] = movies['overview'].apply(lambda x: x.split() if isinstance(x, str) else [])

# Merge tags
movies['tags'] = movies['overview_clean'] + movies['genres_clean'] + movies['keywords_clean'] + movies['cast_clean'] + movies['director_clean']
movies['tags_str'] = movies['tags'].apply(lambda x: " ".join(x).lower())

# Stemming
print("Applying Porter Stemmer to movie tags...")
try:
    from nltk.stem.porter import PorterStemmer
    ps = PorterStemmer()
    def stem_text(text):
        return " ".join([ps.stem(word) for word in text.split()])
    movies['tags_str'] = movies['tags_str'].apply(stem_text)
except Exception as e:
    print(f"NLTK stemming warning: {e}. Using raw lowercased tags.")

# Keep clean columns
movies_cleaned = movies[[
    'id', 'title', 'overview', 'display_genres', 'display_cast', 
    'display_director', 'vote_average', 'vote_count', 'popularity', 
    'release_date', 'runtime', 'tags_str'
]].copy()

movies_cleaned['overview'] = movies_cleaned['overview'].fillna('')
movies_cleaned['release_date'] = movies_cleaned['release_date'].fillna('Unknown')
movies_cleaned['runtime'] = movies_cleaned['runtime'].fillna(0).astype(int)

# Library-based Cosine Similarity (Scikit-Learn)
print("Computing Library Cosine Similarity matrix...")
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

cv = CountVectorizer(max_features=5000, stop_words='english')
vectors = cv.fit_transform(movies_cleaned['tags_str']).toarray()
# Optimize memory footprint by converting float64 matrix to float32
similarity_matrix = cosine_similarity(vectors).astype(np.float32)

# Custom Scratch Count Vectorizer
print("Computing Custom Scratch Vectorizer matrix...")
class CustomCountVectorizer:
    def __init__(self, max_features=5000, stop_words='english'):
        self.max_features = max_features
        self.stop_words = stop_words
        self.vocabulary_ = {}
        
    def fit_transform(self, raw_documents):
        word_counts = collections.Counter()
        stopwords = {
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
        }
        
        for doc in raw_documents:
            tokens = doc.lower().split()
            filtered_tokens = [t for t in tokens if t.isalnum() and (self.stop_words != 'english' or t not in stopwords)]
            word_counts.update(filtered_tokens)
            
        top_words = [word for word, count in word_counts.most_common(self.max_features)]
        self.vocabulary_ = {word: idx for idx, word in enumerate(top_words)}
        
        vectors = []
        for doc in raw_documents:
            tokens = doc.lower().split()
            doc_vec = [0] * len(self.vocabulary_)
            for t in tokens:
                if t in self.vocabulary_:
                    doc_vec[self.vocabulary_[t]] += 1
            vectors.append(doc_vec)
            
        return np.array(vectors, dtype=np.uint16)

ccv = CustomCountVectorizer(max_features=5000)
custom_vectors = ccv.fit_transform(movies_cleaned['tags_str'])

# Prepare output directories
backend_models_dir = os.path.join(SCRIPT_DIR, 'models')
backend_data_dir = os.path.join(SCRIPT_DIR, 'data')
os.makedirs(backend_models_dir, exist_ok=True)
os.makedirs(backend_data_dir, exist_ok=True)

# Save Pickles in Backend/models/ as well as Root
save_locations = [
    backend_models_dir,
    PROJECT_ROOT
]

for loc in set(save_locations):
    print(f"Saving pickled models to: {loc}")
    with open(os.path.join(loc, 'movies_cleaned.pkl'), 'wb') as f:
        pickle.dump(movies_cleaned, f)
    with open(os.path.join(loc, 'similarity_matrix.pkl'), 'wb') as f:
        pickle.dump(similarity_matrix, f)
    with open(os.path.join(loc, 'custom_vectors.pkl'), 'wb') as f:
        pickle.dump(custom_vectors, f)

# Export JSON for Frontend sync
json_records = []
for idx, row in movies_cleaned.iterrows():
    json_records.append({
        "id": int(row['id']),
        "title": str(row['title']),
        "overview": str(row['overview']),
        "genres": list(row['display_genres']),
        "cast": list(row['display_cast']),
        "director": str(row['display_director']),
        "vote_average": float(row['vote_average']),
        "popularity": float(row['popularity']),
        "release_date": str(row['release_date']),
        "runtime": int(row['runtime']),
        "tags_str": str(row['tags_str'])
    })

frontend_src_json = os.path.join(PROJECT_ROOT, 'front end', 'src', 'movies_data.json')
backend_data_json = os.path.join(backend_data_dir, 'movies_data.json')

with open(backend_data_json, 'w', encoding='utf-8') as f:
    json.dump(json_records, f, indent=2)

if os.path.exists(os.path.dirname(frontend_src_json)):
    with open(frontend_src_json, 'w', encoding='utf-8') as f:
        json.dump(json_records, f)
    print(f"Exported JSON dataset to frontend: {frontend_src_json}")

print("==================================================")
print("Preprocessing completed successfully!")
print(f"Total Movies Processed: {len(movies_cleaned)}")
print("==================================================")
