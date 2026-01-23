# CLIP Vector Service

This service provides image and text vectorization using OpenAI's CLIP model.

## Requirements

- Python 3.9+
- CUDA capable GPU (optional, but recommended)

## Installation

```bash
pip install -r requirements.txt
```

## Running the Service

```bash
python clip_vector_service.py
```

The service will start on `http://0.0.0.0:5000`.

## API Endpoints

- `POST /encode-image`: Encode an image file to a 512-dim vector.
- `POST /encode-text`: Encode a text string to a 512-dim vector.
- `POST /similarity`: Calculate cosine similarity between an image and text.
- `POST /batch-encode-images`: Batch encode multiple images.
- `GET /health`: Check service status.
