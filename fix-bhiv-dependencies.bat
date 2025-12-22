@echo off
echo Installing missing BHIV dependencies...

cd "v1-BHIV_CORE-main"
call .venv\Scripts\activate

echo Installing qdrant-client...
pip install qdrant-client

echo Installing additional dependencies...
pip install fastembed
pip install numpy
pip install scikit-learn

echo Dependencies installed successfully!
pause