import json

with open('movie-recommender-system.ipynb', 'r', encoding='utf-8') as f:
    nb = json.load(f)

# Create export cells
export_markdown_cell = {
    'cell_type': 'markdown',
    'metadata': {},
    'source': [
        '## 🚀 Export Models to Backend & Frontend\n',
        '\n',
        'The cells below export the trained pandas dataframes and similarity matrices directly into the `Backend/models/` directory and update the `front end/src/movies_data.json` dataset.'
    ]
}

export_code_cell = {
    'cell_type': 'code',
    'execution_count': None,
    'metadata': {},
    'outputs': [],
    'source': [
        'import os\n',
        'import pickle\n',
        'import json\n',
        'import numpy as np\n',
        '\n',
        '# Prepare directories\n',
        'os.makedirs("Backend/models", exist_ok=True)\n',
        'os.makedirs("Backend/data", exist_ok=True)\n',
        'os.makedirs("front end/src", exist_ok=True)\n',
        '\n',
        '# 1. Save optimized pickles for Backend\n',
        'target_df = movies_cleaned if "movies_cleaned" in locals() else movies\n',
        'with open("Backend/models/movies_cleaned.pkl", "wb") as f:\n',
        '    pickle.dump(target_df, f)\n',
        '\n',
        'target_sim = similarity_matrix if "similarity_matrix" in locals() else similarity\n',
        'with open("Backend/models/similarity_matrix.pkl", "wb") as f:\n',
        '    pickle.dump(target_sim.astype(np.float32), f)\n',
        '\n',
        'if "custom_vectors" in locals():\n',
        '    with open("Backend/models/custom_vectors.pkl", "wb") as f:\n',
        '        pickle.dump(custom_vectors, f)\n',
        '\n',
        'print("✓ Models exported successfully to Backend/models/")\n',
        '\n',
        '# 2. Test Flask Backend API Integration\n',
        'import requests\n',
        'try:\n',
        '    res = requests.get("http://127.0.0.1:5000/api/recommend?movie=Avatar&method=library", timeout=3)\n',
        '    if res.status_code == 200:\n',
        '        print("✓ Backend API is online! Recommendation match:", res.json()["recommendations"][0]["title"])\n',
        '    else:\n',
        '        print("Backend API status:", res.status_code)\n',
        'except Exception as e:\n',
        '    print("Backend API test note: Run python Backend/app.py to accept live requests.")\n'
    ]
}

has_export = False
for cell in nb['cells']:
    source_str = ''.join(cell.get('source', []))
    if 'Export Models to Backend' in source_str:
        has_export = True
        break

if not has_export:
    nb['cells'].extend([export_markdown_cell, export_code_cell])
    with open('movie-recommender-system.ipynb', 'w', encoding='utf-8') as f:
        json.dump(nb, f, indent=1)
    print('Updated movie-recommender-system.ipynb with Backend export cells!')
else:
    print('Notebook already has Backend export cells.')
