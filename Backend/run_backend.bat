@echo off
echo ==================================================
echo Starting Movie Recommender Backend Server...
echo ==================================================
cd /d %~dp0
if not exist models\movies_cleaned.pkl (
    echo Preprocessed models not found! Running preprocessing first...
    python preprocess.py
)
python app.py
pause
