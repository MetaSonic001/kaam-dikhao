# FastAPI backend (Render, or any container host). Build context: this directory.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 DATA_DIR=/srv/data
RUN apt-get update && apt-get install -y --no-install-recommends libglib2.0-0 libgomp1 && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY requirements.txt .
RUN pip install -r requirements.txt

# Bake the small plate-detection models into the image (about 7 MB each) so a cold start never downloads them.
RUN python -c "from open_image_models import create_detector; [create_detector(m) for m in ('yolo-v9-t-256-license-plate-end2end','yolo-v9-t-384-license-plate-end2end','yolo-v9-t-512-license-plate-end2end')]"

# Optional (needs about 1 GB RAM): bake the Ask-AI embedding model and run with EMBEDDINGS=true
ARG BAKE_EMBEDDINGS=false
RUN if [ "$BAKE_EMBEDDINGS" = "true" ]; then python -c "from fastembed import TextEmbedding; TextEmbedding('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2', cache_dir='/srv/data/models')"; fi

COPY app ./app
COPY index.py .
EXPOSE 10000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
