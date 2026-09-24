import numpy as np
import pandas as pd
import ast
import pickle
import collections
import math
import os

print("Starting Movie Recommender System preprocessing...")

# Load datasets
movies_path = 'tmdb_5000_movies.csv'
credits_path = 'tmdb_5000_credits.csv'

if not os.path.exists(movies_path) or not os.path.exists(credits_path):
    raise FileNotFoundError("Raw CSV datasets not found. Ensure they are in the workspace root.")

movies = pd.read_csv(movies_path)
credits = pd.read_csv(credits_path)

# Merge datasets
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

# Extract data for UI display
print("Cleaning data columns for display...")
movies['display_genres'] = movies['genres'].apply(convert_genres_keywords)
movies['display_cast'] = movies['cast'].apply(convert_cast)
movies['display_director'] = movies['crew'].apply(fetch_director).apply(lambda x: x[0] if len(x) > 0 else "")

# Clean data for tag vectorization (lower case, space removal)
movies['genres_clean'] = movies['display_genres'].apply(lambda x: [i.replace(" ", "").lower() for i in x])
movies['keywords_clean'] = movies['keywords'].apply(convert_genres_keywords).apply(lambda x: [i.replace(" ", "").lower() for i in x])
movies['cast_clean'] = movies['display_cast'].apply(lambda x: [i.replace(" ", "").lower() for i in x])
movies['director_clean'] = movies['display_director'].apply(lambda x: [x.replace(" ", "").lower()] if x else [])
movies['overview_clean'] = movies['overview'].apply(lambda x: x.split() if isinstance(x, str) else [])

# Merge tags
movies['tags'] = movies['overview_clean'] + movies['genres_clean'] + movies['keywords_clean'] + movies['cast_clean'] + movies['director_clean']

# Convert tags to lowercase string
movies['tags_str'] = movies['tags'].apply(lambda x: " ".join(x).lower())

# Apply Stemming safely (fallback if nltk stemmer fails or has issues)
print("Stemming words in tags...")
try:
    from nltk.stem.porter import PorterStemmer
    ps = PorterStemmer()
    def stem_text(text):
        return " ".join([ps.stem(word) for word in text.split()])
    movies['tags_str'] = movies['tags_str'].apply(stem_text)
except Exception as e:
    print(f"NLTK stemming failed: {e}. Proceeding with lowercased tags.")

# Keep only necessary columns for the final DataFrame
movies_cleaned = movies[[
    'id', 'title', 'overview', 'display_genres', 'display_cast', 
    'display_director', 'vote_average', 'vote_count', 'popularity', 
    'release_date', 'runtime', 'tags_str'
]].copy()

# Fill NaNs
movies_cleaned['overview'] = movies_cleaned['overview'].fillna('')
movies_cleaned['release_date'] = movies_cleaned['release_date'].fillna('Unknown')
movies_cleaned['runtime'] = movies_cleaned['runtime'].fillna(0).astype(int)

# Create library-based vectorizer & similarity matrix
print("Computing Library-based Cosine Similarity...")
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

cv = CountVectorizer(max_features=5000, stop_words='english')
vectors = cv.fit_transform(movies_cleaned['tags_str']).toarray()
similarity_matrix = cosine_similarity(vectors)

# Create custom vectorizer & vectors
print("Computing Custom Count Vectorizer vectors...")
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
            
        return np.array(vectors)

ccv = CustomCountVectorizer(max_features=5000)
custom_vectors = ccv.fit_transform(movies_cleaned['tags_str'])

# Save pickles
print("Saving pickled data...")
with open('movies_cleaned.pkl', 'wb') as f:
    pickle.dump(movies_cleaned, f)

with open('similarity_matrix.pkl', 'wb') as f:
    pickle.dump(similarity_matrix, f)

with open('custom_vectors.pkl', 'wb') as f:
    pickle.dump(custom_vectors, f)

print("Preprocessing successfully finished!")
