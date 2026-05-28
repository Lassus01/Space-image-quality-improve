import matplotlib.pyplot as plt
import re
import os

# Укажи точный путь к лог-файлу твоей последней тренировки (на 10 эпох)
LOG_FILE_PATH = r"EDSR-PyTorch/experiment/test/log.txt"


def parse_log(file_path):
    epochs = []
    losses = []
    psnrs = []

    if not os.path.exists(file_path):
        print(f"Файл {file_path} не найден!")
        return epochs, losses, psnrs

    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    current_epoch_loss = None

    for line in lines:
        # Ищем последнюю ошибку L1 в эпохе (обычно строка заканчивается на 4000/4000)
        loss_match = re.search(r'\[\d+/4000\]\s+\[L1:\s+([\d\.]+)\]', line)
        if loss_match:
            current_epoch_loss = float(loss_match.group(1))

        # Ищем строку с PSNR
        psnr_match = re.search(r'PSNR:\s+([\d\.]+)\s+\(Best', line)
        if psnr_match and current_epoch_loss is not None:
            psnr = float(psnr_match.group(1))

            epochs.append(len(epochs) + 1)
            losses.append(current_epoch_loss)
            psnrs.append(psnr)
            current_epoch_loss = None  # Сброс для следующей эпохи

    return epochs, losses, psnrs


def plot_metrics(epochs, losses, psnrs):
    if not epochs:
        print("Данные для графиков не найдены. Проверь структуру лога.")
        return

    # Настройка стиля
    plt.style.use('seaborn-v0_8-darkgrid')

    # Создаем холст с двумя графиками
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), dpi=150)

    # График 1: Функция потерь (L1 Loss)
    ax1.plot(epochs, losses, marker='o', color='#E53E3E', linewidth=2, markersize=8, label='L1 Loss (Train)')
    ax1.set_title('Падение функции потерь (Loss) по эпохам', fontsize=14, fontweight='bold')
    ax1.set_xlabel('Эпоха', fontsize=12)
    ax1.set_ylabel('Значение L1 Loss', fontsize=12)
    ax1.set_xticks(epochs)
    ax1.legend(fontsize=11)

    # График 2: Метрика качества (PSNR)
    ax2.plot(epochs, psnrs, marker='o', color='#319795', linewidth=2, markersize=8, label='PSNR (Validation)')
    ax2.set_title('Рост метрики качества (PSNR) по эпохам', fontsize=14, fontweight='bold')
    ax2.set_xlabel('Эпоха', fontsize=12)
    ax2.set_ylabel('PSNR (дБ)', fontsize=12)
    ax2.set_xticks(epochs)
    ax2.legend(fontsize=11)

    # Сохраняем картинку
    plt.tight_layout()
    plt.savefig('training_metrics.png', bbox_inches='tight')
    print("Успех! Графики сохранены в файл training_metrics.png")
    plt.show()


if __name__ == '__main__':
    ep, ls, ps = parse_log(LOG_FILE_PATH)
    plot_metrics(ep, ls, ps)