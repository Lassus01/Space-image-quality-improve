import os
import shutil
from PIL import Image
from pathlib import Path

# --- НАСТРОЙКИ ---
# Путь, куда ты распаковал скачанный UC Merced (папка с классами)
SOURCE_DIR = r"C:\Users\Gigabyte\PycharmProjects\die\images"
# Куда сложим готовые данные для EDSR
TARGET_DIR = r"/EDSR-PyTorch/src/dataset/DIV2K"

SCALE = 2  # Во сколько раз будем сжимать картинку (LR будет в 2 раза меньше HR)


def prepare_dataset():
    # Создаем структуру папок, которую любит EDSR
    hr_dir = Path(TARGET_DIR) / "DIV2K_train_HR"
    lr_dir = Path(TARGET_DIR) / "DIV2K_train_LR_bicubic" / f"X{SCALE}"

    hr_dir.mkdir(parents=True, exist_ok=True)
    lr_dir.mkdir(parents=True, exist_ok=True)

    img_count = 0

    print("Начинаем обработку картинок...")
    # Проходимся по всем папкам (классам) в UC Merced
    for category in os.listdir(SOURCE_DIR):
        category_path = Path(SOURCE_DIR) / category
        if not category_path.is_dir():
            continue

        for img_name in os.listdir(category_path):
            if not img_name.endswith('.png'):
                continue

            img_count += 1
            src_img_path = category_path / img_name

            # Новое имя файла (EDSR любит числовые имена, например 0001.png)
            new_name = f"{img_count:04d}.png"

            # 1. Сохраняем HR (идеальную картинку) в формате PNG
            with Image.open(src_img_path) as img:
                hr_path = hr_dir / new_name
                img.save(hr_path, "PNG")

                # 2. Искусственно портим картинку: сжимаем в SCALE раз
                # (Пока используем базовое сжатие, спец. шум для спутников добавим позже!)
                new_size = (img.width // SCALE, img.height // SCALE)
                lr_img = img.resize(new_size, Image.Resampling.BICUBIC)

                lr_path = lr_dir / new_name
                lr_img.save(lr_path, "PNG")

    print(f"Готово! Обработано {img_count} изображений.")


if __name__ == "__main__":
    prepare_dataset()
