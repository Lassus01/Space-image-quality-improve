import os
import cv2
import numpy as np
from pathlib import Path

def process_image(src_path, hr_path, lr_path, scale):
    """
    Applies advanced degradation: Gaussian blur, additive noise, and bicubic downsampling.
    """
    img = cv2.imread(str(src_path))
    if img is None:
        return False

    # Save HR
    cv2.imwrite(str(hr_path), img)

    # 1. Blur
    blurred = cv2.GaussianBlur(img, (5, 5), 1.5)

    # 2. Downsample (Bicubic)
    h, w = blurred.shape[:2]
    new_size = (w // scale, h // scale)
    lr_img = cv2.resize(blurred, new_size, interpolation=cv2.INTER_CUBIC)

    # 3. Additive noise (Gaussian)
    noise = np.random.normal(0, 5, lr_img.shape).astype(np.float32)
    lr_img = np.clip(lr_img.astype(np.float32) + noise, 0, 255).astype(np.uint8)

    # Save LR
    cv2.imwrite(str(lr_path), lr_img)
    return True

def prepare_advanced_dataset(source_dirs, target_dir, scale=2):
    target_dir = Path(target_dir)
    hr_dir = target_dir / "DIV2K_train_HR"
    lr_dir = target_dir / "DIV2K_train_LR_bicubic" / f"X{scale}"

    hr_dir.mkdir(parents=True, exist_ok=True)
    lr_dir.mkdir(parents=True, exist_ok=True)

    img_count = 0
    for s_dir in source_dirs:
        s_dir = Path(s_dir)
        if not s_dir.is_dir():
            continue

        for ext in ['*.png', '*.jpg', '*.jpeg']:
            for img_path in s_dir.glob(ext):
                img_count += 1
                new_name = f"{img_count:04d}.png"
                hr_path = hr_dir / new_name
                lr_path = lr_dir / new_name
                process_image(img_path, hr_path, lr_path, scale)

    return img_count
