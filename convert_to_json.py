import pickle
import json
import os

print("Converting movies_cleaned.pkl to JSON...")

pickle_path = 'movies_cleaned.pkl'
json_dir = os.path.join('front end', 'src')
json_path = os.path.join(json_dir, 'movies_data.json')

if not os.path.exists(pickle_path):
    print(f"Error: {pickle_path} not found!")
    exit(1)

# Ensure directory exists
os.makedirs(json_dir, exist_ok=True)

with open(pickle_path, 'rb') as f:
    df = pickle.load(f)

# Convert DataFrame to list of dicts
movies_list = []
for idx, row in df.iterrows():
    movies_list.append({
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

# Save to JSON
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(movies_list, f, ensure_ascii=False, indent=2)

print(f"Successfully saved {len(movies_list)} movies to {json_path}!")
