import os

# Путь к сжатым картинкам (обрати внимание, я поменял UCMerced на DIV2K, как ты переименовал папки)
lr_dir = r"C:\Users\Gigabyte\PycharmProjects\die\EDSR-PyTorch\src\dataset\DIV2K\DIV2K_train_LR_bicubic\X2"

count = 0
for f in os.listdir(lr_dir):
    if f.endswith('.png') and 'x2' not in f:
        old_path = os.path.join(lr_dir, f)
        # Меняем 0001.png на 0001x2.png
        new_name = f.replace('.png', 'x2.png')
        new_path = os.path.join(lr_dir, new_name)
        os.rename(old_path, new_path)
        count += 1

print(f"Готово! Добавлен суффикс x2 к {count} файлам.")