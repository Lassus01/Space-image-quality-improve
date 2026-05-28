import os
import re
import cv2
import numpy as np
import matplotlib.pyplot as plt
from skimage.metrics import structural_similarity as ssim_metric

# ================= НАСТРОЙКИ ПУТЕЙ =================
LOG_FILE = r"C:\Users\Gigabyte\PycharmProjects\die\EDSR-PyTorch\experiment\EDSR_30ep_final\log.txt"

# Обновили концовку пути на results-Demo
SR_DIR = r"C:\Users\Gigabyte\PycharmProjects\die\EDSR-PyTorch\experiment\Blind_Test_Results\results-Demo"

LR_DIR = r"C:\Users\Gigabyte\PycharmProjects\die\images\test_LR"

# Я предполагаю, что идеальные оригиналы лежат здесь:
HR_DIR = r"C:\Users\Gigabyte\PycharmProjects\die\images\test_HR"

OUTPUT_DIR = r"C:\Users\Gigabyte\PycharmProjects\die\analytics_output"
# ===================================================

os.makedirs(OUTPUT_DIR, exist_ok=True)


def parse_logs_and_plot():
    print("1. Анализ логов обучения...")
    epochs = []
    l1_losses = []
    psnr_vals = []
    ssim_vals = []

    with open(LOG_FILE, 'r') as f:
        log_data = f.read()

    # Ищем все значения по эпохам с помощью регулярок
    loss_matches = re.findall(r'\[4000/4000\]\t\[L1:\s+([0-9\.]+)\]', log_data)
    eval_matches = re.findall(r'PSNR:\s+([0-9\.]+).*?SSIM:\s+([0-9\.]+)', log_data, re.DOTALL)

    for i in range(min(len(loss_matches), len(eval_matches))):
        epochs.append(i + 1)
        l1_losses.append(float(loss_matches[i]))
        psnr_vals.append(float(eval_matches[i][0]))
        ssim_vals.append(float(eval_matches[i][1]))

    # График 1: Функция потерь (L1 Loss)
    plt.figure(figsize=(10, 5))
    plt.plot(epochs, l1_losses, marker='o', color='red', linewidth=2)
    plt.title('Падение функции потерь L1-Loss на обучающей выборке', fontsize=14)
    plt.xlabel('Эпохи', fontsize=12)
    plt.ylabel('Значение L1 Loss', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.7)
    plt.savefig(os.path.join(OUTPUT_DIR, 'l1_loss_plot.png'), dpi=300, bbox_inches='tight')
    plt.close()

    # График 2: Метрики качества (PSNR и SSIM)
    fig, ax1 = plt.subplots(figsize=(10, 5))
    ax2 = ax1.twinx()

    ax1.plot(epochs, psnr_vals, marker='s', color='blue', linewidth=2, label='PSNR (дБ)')
    ax2.plot(epochs, ssim_vals, marker='^', color='green', linewidth=2, label='SSIM')

    ax1.set_xlabel('Эпохи', fontsize=12)
    ax1.set_ylabel('PSNR (дБ)', color='blue', fontsize=12)
    ax2.set_ylabel('SSIM', color='green', fontsize=12)

    plt.title('Динамика сходимости метрик PSNR и SSIM на валидации', fontsize=14)
    ax1.grid(True, linestyle='--', alpha=0.7)
    fig.tight_layout()
    plt.savefig(os.path.join(OUTPUT_DIR, 'psnr_ssim_plot.png'), dpi=300, bbox_inches='tight')
    plt.close()

    print(f"Графики успешно сохранены в: {OUTPUT_DIR}")


def calculate_test_metrics_and_triads():
    print("2. Расчет итоговых метрик на тестовой выборке...")
    if not os.path.exists(HR_DIR):
        print("ВНИМАНИЕ: Папка HR_DIR не найдена! Проверьте путь.")
        return

    all_hr_files = os.listdir(HR_DIR)

    total_psnr = 0
    total_ssim = 0
    valid_images = 0

    # Обрабатываем все 1350 картинок для получения точной статистики
    for i, file in enumerate(all_hr_files):
        # Отрезаем расширение, получаем чистый номер (например, '10000')
        base_name = file.split('.')[0]

        # Умный поиск: ищем файлы, которые начинаются на этот номер
        sr_matches = [f for f in os.listdir(SR_DIR) if f.startswith(base_name)]
        lr_matches = [f for f in os.listdir(LR_DIR) if f.startswith(base_name)]

        if not sr_matches or not lr_matches:
            continue

        # Читаем найденные изображения
        hr_img = cv2.imread(os.path.join(HR_DIR, file))
        sr_img = cv2.imread(os.path.join(SR_DIR, sr_matches[0]))
        lr_img = cv2.imread(os.path.join(LR_DIR, lr_matches[0]))

        if hr_img is None or sr_img is None or lr_img is None:
            continue
        # --- ВЫРАВНИВАНИЕ РАЗМЕРОВ (КРОП) ---
        # Находим минимальные высоту и ширину между HR и SR
        min_h = min(hr_img.shape[0], sr_img.shape[0])
        min_w = min(hr_img.shape[1], sr_img.shape[1])

        # Обрезаем обе картинки под этот минимальный размер
        hr_img = hr_img[:min_h, :min_w]
        sr_img = sr_img[:min_h, :min_w]

        # --- Математический расчет метрик для каждой картинки ---
        # Считаем MSE (Среднеквадратичная ошибка)
        mse = np.mean((hr_img.astype(np.float32) - sr_img.astype(np.float32)) ** 2)
        if mse == 0:
            psnr = 100.0
        else:
            psnr = 20 * np.log10(255.0 / np.sqrt(mse))

        # Считаем SSIM
        ssim = ssim_metric(hr_img, sr_img, channel_axis=2, data_range=255)

        total_psnr += psnr
        total_ssim += ssim
        valid_images += 1

        # Сохраняем триады только для первых 5 картинок для наглядности в отчете
        if i < 5:
            # Увеличиваем LR до размеров HR обычным бикубиком
            # Увеличиваем LR до новых выровненных размеров HR
            lr_upscaled = cv2.resize(lr_img, (min_w, min_h), interpolation=cv2.INTER_CUBIC)

            # Склеиваем картинки горизонтально
            triad = np.hstack((lr_upscaled, sr_img, hr_img))

            font = cv2.FONT_HERSHEY_SIMPLEX
            cv2.putText(triad, 'LR (Bicubic)', (10, 30), font, 1, (0, 0, 255), 2)
            cv2.putText(triad, 'SR (EDSR)', (hr_img.shape[1] + 10, 30), font, 1, (0, 255, 0), 2)
            cv2.putText(triad, 'HR (Original)', (hr_img.shape[1] * 2 + 10, 30), font, 1, (255, 255, 255), 2)

            cv2.imwrite(os.path.join(OUTPUT_DIR, f'triad_{base_name}.png'), triad)

    if valid_images > 0:
        avg_psnr = total_psnr / valid_images
        avg_ssim = total_ssim / valid_images
        print(f"\n=== ИТОГОВЫЕ МЕТРИКИ (Слепая выборка: {valid_images} изображений) ===")
        print(f"Средний PSNR: {avg_psnr:.3f} дБ")
        print(f"Средний SSIM: {avg_ssim:.4f}")
        print(f"Триады для отчета сохранены в: {OUTPUT_DIR}")
    else:
        print("\nНе удалось сопоставить изображения. Проверьте папки!")


if __name__ == "__main__":
    parse_logs_and_plot()
    calculate_test_metrics_and_triads()