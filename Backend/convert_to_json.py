import pickle
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))

def get_pickle_path():
    paths = [
        os.path.join(SCRIPT_DIR, 'models', 'movies_cleaned.pkl'),
        os.path.join(SCRIPT_DIR, 'movies_cleaned.pkl'),
        os.path.join(PROJECT_ROOT, 'movies_cleaned.pkl')
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    return None

pickle_path = get_pickle_path()
if not pickle_path:
    print("Error: movies_cleaned.pkl not found. Please run preprocess.py first.")
    exit(1)

print(f"Loading DataFrame from {pickle_path}...")
with open(pickle_path, 'rb') as f:
    movies = pickle.load(f)

json_list = []
for idx, row in movies.iterrows():
    json_list.append({
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

target_paths = [
    os.path.join(SCRIPT_DIR, 'data', 'movies_data.json'),
    os.path.join(PROJECT_ROOT, 'front end', 'src', 'movies_data.json')
]

for target in target_paths:
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, 'w', encoding='utf-8') as f:
        json.dump(json_list, f, indent=2)
    print(f"Successfully converted movies dataframe to JSON: {target}")

print("JSON Conversion finished!")
