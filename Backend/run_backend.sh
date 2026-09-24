#!/bin/bash
echo "=================================================="
echo "Starting Movie Recommender Backend Server..."
echo "=================================================="
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ ! -f "models/movies_cleaned.pkl" ]; then
    echo "Preprocessed models not found! Running preprocessing first..."
    python3 preprocess.py
fi

python3 app.py
