import torch
import clip
from PIL import Image
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from pydantic import BaseModel
from typing import List
import io
import uvicorn
import numpy as np

app = FastAPI(title="CLIP Vector Service")

# Load model
device = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_NAME = "ViT-B/32"

try:
    # Ensure model is loaded
    model, preprocess = clip.load(MODEL_NAME, device=device)
    print(f"Model {MODEL_NAME} loaded on {device}")
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
    return {"status": status, "device": device, "model": MODEL_NAME}

@app.post("/encode-image", response_model=VectorResponse)
async def encode_image(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        image_input = preprocess(image).unsqueeze(0).to(device)
        
        with torch.no_grad():
            image_features = model.encode_image(image_input)
            
        # Normalize
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
    uvicorn.run(app, host="0.0.0.0", port=5000)
