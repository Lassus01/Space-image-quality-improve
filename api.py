import os
import sys
import threading
import time
import re
import base64
import io
import shutil
import cv2
import numpy as np
from pathlib import Path
from PIL import Image

from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

import torch
import torch.nn as nn

try:
    import torch_directml
    _has_directml = True
except Exception:
    _has_directml = False

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# --- Monkey Patch for torch.nn.Conv2d to fix AMD DirectML fragmentation ---
_original_conv2d_forward = nn.Conv2d.forward

def _patched_conv2d_forward(self, input):
    return _original_conv2d_forward(self, input.contiguous())

nn.Conv2d.forward = _patched_conv2d_forward

# Make sure EDSR imports from the subfolder work
sys.path.append(os.path.abspath("EDSR-PyTorch/src"))

app = FastAPI(title="SpaceEnhance AI EDSR Backend")

# Allow CORS from React Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Backend is running"}

from pydantic import BaseModel
from typing import List

class PrepareDatasetRequest(BaseModel):
    input_directories: List[str]
    blur_kernel: float
    noise_std: float
    scale: int

@app.post("/api/prepare_dataset")
def prepare_dataset(req: PrepareDatasetRequest):
    import advanced_degradation
    target_dir = os.path.join(os.getcwd(), "EDSR-PyTorch", "src", "dataset", "DIV2K")
    count = advanced_degradation.prepare_advanced_dataset(
        req.input_directories,
        target_dir,
        scale=req.scale,
        blur_kernel=req.blur_kernel,
        noise_std=req.noise_std
    )
    return {"message": f"Dataset prepared. {count} images processed.", "count": count}

@app.get("/api/datasets")
def list_datasets():
    dataset_dir = os.path.join(os.getcwd(), "EDSR-PyTorch", "src", "dataset")
    datasets = []
    if os.path.exists(dataset_dir):
        for entry in os.listdir(dataset_dir):
            if os.path.isdir(os.path.join(dataset_dir, entry)):
                datasets.append({"id": entry, "name": entry})
    return {"datasets": datasets}

class TrainRequest(BaseModel):
    epochs: int
    learning_rate: float
    batch_size: int

# Global state for training
training_state = {
    "is_running": False,
    "current_epoch": 0,
    "latest_loss": 0.0,
    "total_epochs": 0
}

def training_thread(epochs, lr, batch_size):
    global training_state
    training_state["is_running"] = True
    training_state["current_epoch"] = 0
    training_state["total_epochs"] = epochs

    try:
        from option import args
        import utility
        import data
        import model
        import loss
        from trainer import Trainer

        args.epochs = epochs
        args.lr = lr
        args.batch_size = batch_size
        args.ext = 'sep' # Important to bypass bin building or caching if we just generated
        # Set DirectML device
        args.cpu = True # Initialize safely to CPU first

        torch.manual_seed(args.seed)
        checkpoint = utility.checkpoint(args)

        if checkpoint.ok:
            loader = data.Data(args)
            _model = model.Model(args, checkpoint)
            # Important: move to DirectML
            if _has_directml:
                device = torch_directml.device()
            else:
                device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

            _model.model.to(device)
            _model.device = device

            _loss = loss.Loss(args, checkpoint) if not args.test_only else None
            t = Trainer(args, loader, _model, _loss, checkpoint)

            for epoch in range(1, epochs + 1):
                if not training_state["is_running"]:
                    break
                t.train()
                t.test()
                training_state["current_epoch"] = epoch
                # Try to extract the last loss from the trainer's loss list if available
                if _loss and hasattr(_loss, 'log'):
                     training_state["latest_loss"] = float(_loss.log[-1, 0])

            checkpoint.done()
    except Exception as e:
        print(f"Training error: {e}")
    finally:
        training_state["is_running"] = False

@app.post("/api/train")
def start_training(req: TrainRequest):
    global training_state
    if training_state["is_running"]:
        return JSONResponse(status_code=400, content={"error": "Training is already running"})

    t = threading.Thread(target=training_thread, args=(req.epochs, req.learning_rate, req.batch_size))
    t.start()
    return {"message": "Training started"}

@app.get("/api/training_status")
def get_training_status():
    return training_state

@app.get("/api/metrics")
def get_metrics(experiment_name: str = "test"):
    log_file_path = os.path.join(os.getcwd(), "EDSR-PyTorch", "experiment", experiment_name, "log.txt")
    epochs = []
    losses = []
    psnrs = []

    if os.path.exists(log_file_path):
        with open(log_file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        current_epoch_loss = None
        for line in lines:
            loss_match = re.search(r'\[L1:\s+([\d\.]+)\]', line)
            if loss_match:
                current_epoch_loss = float(loss_match.group(1))

            psnr_match = re.search(r'PSNR:\s+([\d\.]+)\s+\(Best', line)
            if psnr_match and current_epoch_loss is not None:
                psnr = float(psnr_match.group(1))
                epochs.append(len(epochs) + 1)
                losses.append(current_epoch_loss)
                psnrs.append(psnr)
                current_epoch_loss = None

    return {"epochs": epochs, "losses": losses, "psnrs": psnrs}

@app.get("/api/generate_plot")
def generate_plot(experiment_name: str = "test"):
    metrics = get_metrics(experiment_name)
    epochs = metrics["epochs"]
    losses = metrics["losses"]
    psnrs = metrics["psnrs"]

    if not epochs:
        # Return empty image or error
        return JSONResponse(status_code=404, content={"error": "No training data found"})

    plt.style.use('seaborn-v0_8-darkgrid')
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), dpi=150)

    # Plot 1: L1 Loss
    ax1.plot(epochs, losses, marker='o', color='#E53E3E', linewidth=2, markersize=8, label='L1 Loss (Train)')
    ax1.set_title('Падение функции потерь (Loss) по эпохам', fontsize=14, fontweight='bold')
    ax1.set_xlabel('Эпоха', fontsize=12)
    ax1.set_ylabel('Значение L1 Loss', fontsize=12)
    ax1.set_xticks(epochs)
    ax1.legend(fontsize=11)

    # Plot 2: PSNR
    ax2.plot(epochs, psnrs, marker='o', color='#319795', linewidth=2, markersize=8, label='PSNR (Validation)')
    ax2.set_title('Рост метрики качества (PSNR) по эпохам', fontsize=14, fontweight='bold')
    ax2.set_xlabel('Эпоха', fontsize=12)
    ax2.set_ylabel('PSNR (дБ)', fontsize=12)
    ax2.set_xticks(epochs)
    ax2.legend(fontsize=11)

    plt.tight_layout()

    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches='tight')
    buf.seek(0)
    plt.close(fig)

    encoded = base64.b64encode(buf.read()).decode('utf-8')
    return {"image_base64": encoded}

@app.get("/api/models")
def list_models():
    models_dir = os.path.join(os.getcwd(), "EDSR-PyTorch", "experiment")
    models = []

    if os.path.exists(models_dir):
        for root, dirs, files in os.walk(models_dir):
            for file in files:
                if file.endswith(".pt"):
                    rel_path = os.path.relpath(os.path.join(root, file), models_dir)
                    models.append({"id": rel_path, "name": file})

    return {"models": models}

@app.post("/api/enhance")
async def enhance_image(model_id: str = Form(...), file: UploadFile = File(...)):
    models_dir = os.path.join(os.getcwd(), "EDSR-PyTorch", "experiment")
    model_path = os.path.join(models_dir, model_id)

    if not os.path.exists(model_path):
        return JSONResponse(status_code=404, content={"error": "Model not found"})

    try:
        # Read the image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Prepare for EDSR
        # BGR to RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # HWC to CHW
        img_tensor = torch.from_numpy(np.transpose(img_rgb, (2, 0, 1))).float()

        # Add batch dim
        img_tensor = img_tensor.unsqueeze(0)

        # Setup model config using options
        from option import args
        import model
        import utility

        args.pre_train = model_path
        args.cpu = True # Initialize safely to CPU first

        # Determine scale from model ID if possible (e.g. EDSR_x4.pt -> 4)
        match = re.search(r'x(\d+)', model_id)
        if match:
             args.scale = [int(match.group(1))]
        else:
             args.scale = [2] # Default to 2

        # Create empty checkpoint for loading
        class DummyCheckpoint:
             def __init__(self):
                 self.ok = True
                 self.log_file = open(os.devnull, 'w')
             def get_path(self, *args, **kwargs):
                 return "."

        ckp = DummyCheckpoint()
        _model = model.Model(args, ckp)

        # Move to DirectML
        if _has_directml:
            device = torch_directml.device()
        else:
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        _model.model.to(device)
        _model.device = device

        img_tensor = img_tensor.to(device)

        _model.eval()
        with torch.no_grad():
            sr_tensor = _model(img_tensor, 0) # 0 is idx_scale

        sr_tensor = sr_tensor.squeeze(0).cpu()

        # CHW to HWC
        sr_img = np.transpose(sr_tensor.numpy(), (1, 2, 0))
        sr_img = np.clip(sr_img, 0, 255).astype(np.uint8)

        # RGB to BGR
        sr_bgr = cv2.cvtColor(sr_img, cv2.COLOR_RGB2BGR)

        # Encode back to image
        _, buffer = cv2.imencode('.png', sr_bgr)
        encoded_img = base64.b64encode(buffer).decode('utf-8')

        return {"image_base64": f"data:image/png;base64,{encoded_img}"}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
