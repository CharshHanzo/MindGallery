import os
import torch
import sys

# Set Model Cache Directory to Project Local Directory BEFORE importing cn_clip
model_cache_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'models_cache'))
os.environ['HF_HOME'] = os.path.join(model_cache_dir, 'huggingface')
os.environ['TRANSFORMERS_CACHE'] = os.path.join(model_cache_dir, 'huggingface')
os.environ['HF_DATASETS_CACHE'] = os.path.join(model_cache_dir, 'huggingface')
os.environ['PYTORCH_TRANSFORMERS_CACHE'] = os.path.join(model_cache_dir, 'huggingface')
os.environ['TORCH_HOME'] = os.path.join(model_cache_dir, 'torch')

# Disable HuggingFace Symlink Warning on Windows
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

# Create cache directories if they don't exist
try:
    os.makedirs(model_cache_dir, exist_ok=True)
    print(f"Created models_cache directory: {model_cache_dir}")
except Exception as e:
    print(f"Error creating models_cache directory: {e}")

try:
    os.makedirs(os.environ['HF_HOME'], exist_ok=True)
    print(f"Created HF_HOME directory: {os.environ['HF_HOME']}")
except Exception as e:
    print(f"Error creating HF_HOME directory: {e}")

try:
    os.makedirs(os.environ['TORCH_HOME'], exist_ok=True)
    print(f"Created TORCH_HOME directory: {os.environ['TORCH_HOME']}")
except Exception as e:
    print(f"Error creating TORCH_HOME directory: {e}")

print(f"Model cache directory set to: {os.environ['HF_HOME']}")
print(f"Torch cache directory set to: {os.environ['TORCH_HOME']}")
print(f"Current working directory: {os.getcwd()}")
print(f"Script directory: {os.path.dirname(__file__)}")
print(f"Models cache directory: {model_cache_dir}")
print(f"Directory exists: {os.path.exists(model_cache_dir)}")
print(f"HF_HOME exists: {os.path.exists(os.environ['HF_HOME'])}")

# Import Chinese-CLIP
try:
    import cn_clip.clip as clip
    from cn_clip.clip import load_from_name
    print("Chinese-CLIP imported successfully")
except Exception as e:
    print(f"Error importing Chinese-CLIP: {e}")
    sys.exit(1)

from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from typing import List, Any
import io
import uvicorn
import numpy as np

app = FastAPI(title="Chinese CLIP Vector Service")

# Load model
device = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_NAME = "ViT-B-16"

try:
    # Ensure model is loaded
    model, preprocess = load_from_name(MODEL_NAME, device=device)
    model.eval()
    print(f"Chinese-CLIP model {MODEL_NAME} loaded on {device}")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    preprocess = None

class TextRequest(BaseModel):
    text: str

class VectorResponse(BaseModel):
    vector: List[float]
    dimension: int
    model: str

@app.get("/health")
async def health_check():
    status = "ok" if model is not None else "error"
    return {
        "status": status, 
        "device": device, 
        "model": MODEL_NAME
    }

@app.post("/encode-image", response_model=VectorResponse)
async def encode_image(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        
        # CLIP Encoding
        image_input = preprocess(image).unsqueeze(0).to(device)
        with torch.no_grad():
            image_features = model.encode_image(image_input)
        image_features /= image_features.norm(dim=-1, keepdim=True)
        vector = image_features.cpu().numpy().tolist()[0]
        
        return {
            "vector": vector,
            "dimension": len(vector),
            "model": MODEL_NAME
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/encode-text", response_model=VectorResponse)
async def encode_text(request: TextRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    try:
        text_input = clip.tokenize([request.text]).to(device)
        
        with torch.no_grad():
            text_features = model.encode_text(text_input)
            
        text_features /= text_features.norm(dim=-1, keepdim=True)
        vector = text_features.cpu().numpy().tolist()[0]
        
        return {
            "vector": vector,
            "dimension": len(vector),
            "model": MODEL_NAME
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/similarity")
async def calculate_similarity(file: UploadFile = File(...), text: str = Form(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Process Image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        image_input = preprocess(image).unsqueeze(0).to(device)
        
        # Process Text
        text_input = clip.tokenize([text]).to(device)
        
        with torch.no_grad():
            image_features = model.encode_image(image_input)
            text_features = model.encode_text(text_input)
            
        # Normalize
        image_features /= image_features.norm(dim=-1, keepdim=True)
        text_features /= text_features.norm(dim=-1, keepdim=True)
        
        # Calculate similarity (cosine similarity)
        similarity = (image_features @ text_features.T).item()
        
        return {"similarity": similarity}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch-encode-images")
async def batch_encode_images(files: List[UploadFile] = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    results = []
    try:
        images = []
        for file in files:
            content = await file.read()
            img = Image.open(io.BytesIO(content)).convert("RGB")
            images.append(preprocess(img))
        
        if not images:
             return []

        image_input = torch.stack(images).to(device)
        
        with torch.no_grad():
            image_features = model.encode_image(image_input)
            
        image_features /= image_features.norm(dim=-1, keepdim=True)
        vectors = image_features.cpu().numpy().tolist()
        
        for v in vectors:
            results.append({
                "vector": v,
                "dimension": len(v),
                "model": MODEL_NAME
            })
            
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5001) 
