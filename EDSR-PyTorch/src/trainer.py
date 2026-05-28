import os
import math
from decimal import Decimal
import numpy as np
from skimage.metrics import structural_similarity as ssim_metric

import utility
import torch
import torch.nn.utils as utils
from tqdm import tqdm
import torch_directml


class Trainer():
    def __init__(self, args, loader, my_model, my_loss, ckp):
        self.args = args
        self.scale = args.scale

        self.ckp = ckp
        self.loader_train = loader.loader_train
        self.loader_test = loader.loader_test

        self.model = my_model.to(torch_directml.device())
        self.loss = my_loss.to(torch_directml.device()) if my_loss is not None else None
        self.optimizer = utility.make_optimizer(args, self.model)

        if self.args.load != '':
            self.optimizer.load(ckp.dir, epoch=len(ckp.log))

        self.error_last = 1e8

    def train(self):
        self.loss.step()
        epoch = self.optimizer.get_last_epoch() + 1
        lr = self.optimizer.get_lr()

        self.ckp.write_log(
            '[Epoch {}]\tLearning rate: {:.2e}'.format(epoch, Decimal(lr))
        )
        self.loss.start_log()
        self.model.train()

        timer_data, timer_model = utility.timer(), utility.timer()
        # TEMP
        self.loader_train.dataset.set_scale(0)
        for batch, (lr, hr, _,) in enumerate(self.loader_train):
            lr, hr = self.prepare(lr, hr)

            # Принудительное выравнивание памяти для DirectML
            lr = lr.contiguous()
            hr = hr.contiguous()

            timer_data.hold()
            timer_model.tic()

            self.optimizer.zero_grad()
            sr = self.model(lr, 0)
            loss = self.loss(sr, hr)
            loss.backward()
            if self.args.gclip > 0:
                utils.clip_grad_value_(
                    self.model.parameters(),
                    self.args.gclip
                )
            self.optimizer.step()

            timer_model.hold()

            if (batch + 1) % self.args.print_every == 0:
                self.ckp.write_log('[{}/{}]\t{}\t{:.1f}+{:.1f}s'.format(
                    (batch + 1) * self.args.batch_size,
                    len(self.loader_train.dataset),
                    self.loss.display_loss(batch),
                    timer_model.release(),
                    timer_data.release()))

            timer_data.tic()

        self.loss.end_log(len(self.loader_train))
        self.error_last = self.loss.log[-1, -1]
        self.optimizer.schedule()

    def test(self):
        torch.set_grad_enabled(False)

        epoch = self.optimizer.get_last_epoch()
        self.ckp.write_log('\nEvaluation:')
        self.ckp.add_log(
            torch.zeros(1, len(self.loader_test), len(self.scale))
        )
        self.model.eval()

        timer_test = utility.timer()
        if self.args.save_results: self.ckp.begin_background()
        for idx_data, d in enumerate(self.loader_test):
            for idx_scale, scale in enumerate(self.scale):
                d.dataset.set_scale(idx_scale)

                # Инициализация аккумулятора SSIM для текущего датасета
                ssim_accumulator = 0.0

                for lr, hr, filename in tqdm(d, ncols=80):
                    lr, hr = self.prepare(lr, hr)

                    # Выравниваем память для DirectML
                    lr = lr.contiguous()
                    hr = hr.contiguous()

                    sr = self.model(lr, idx_scale)
                    sr = utility.quantize(sr, self.args.rgb_range)
                    save_list = [sr]

                    # В режиме Demo оригиналов (HR) нет, метрики посчитаем отдельно
                    if d.dataset.name != 'Demo':
                        hr_quant = utility.quantize(hr, self.args.rgb_range)

                        # 1. Расчет PSNR
                        self.ckp.log[-1, idx_data, idx_scale] += utility.calc_psnr(
                            sr, hr, scale, self.args.rgb_range, dataset=d
                        )

                        # 2. Расчет SSIM
                        sr_np = sr.squeeze().cpu().numpy().transpose(1, 2, 0).astype(np.uint8)
                        hr_np = hr_quant.squeeze().cpu().numpy().transpose(1, 2, 0).astype(np.uint8)

                        current_ssim = ssim_metric(hr_np, sr_np, channel_axis=2, data_range=255)
                        ssim_accumulator += current_ssim

                        if self.args.save_gt:
                            save_list.extend([lr, hr])

                    if self.args.save_results:
                        self.ckp.save_results(d, filename[0], save_list, scale)
                self.ckp.log[-1, idx_data, idx_scale] /= len(d)
                avg_ssim = ssim_accumulator / len(d) if d.dataset.name != 'Demo' else 0

                best = self.ckp.log.max(0)
                best_epoch = best[1][idx_data, idx_scale] + 1

                self.ckp.write_log(
                    '[{} x{}]\tPSNR: {:.3f} (Best: {:.3f} @epoch {}) | SSIM: {:.4f}'.format(
                        d.dataset.name,
                        scale,
                        self.ckp.log[-1, idx_data, idx_scale],
                        best[0][idx_data, idx_scale],
                        best_epoch,
                        avg_ssim
                    )
                )

                self.ckp.write_log('Forward: {:.2f}s\n'.format(timer_test.toc()))

                # --- Умное снижение Learning Rate (LR Decay) ---
                epochs_without_improvement = epoch - best_epoch
                if epochs_without_improvement == 3:
                    self.ckp.write_log('[Warning] No PSNR improvement for 3 epochs. Halving Learning Rate...')
                    try:
                        # Обращение к базовому оптимизатору внутри обертки utility.py
                        for param_group in self.optimizer.optimizer.param_groups:
                            param_group['lr'] *= 0.5
                    except AttributeError:
                        # Фолбэк, если обертка не используется
                        for param_group in self.optimizer.param_groups:
                            param_group['lr'] *= 0.5

                self.ckp.write_log('Saving...')

                if self.args.save_results:
                    self.ckp.end_background()

                if not self.args.test_only:
                    self.ckp.save(self, epoch, is_best=(best_epoch == epoch))

                self.ckp.write_log(
                    'Total: {:.2f}s\n'.format(timer_test.toc()), refresh=True
                )

                torch.set_grad_enabled(True)

    def prepare(self, *args):
        if self.args.cpu:
            device = torch.device('cpu')
        else:
            if torch.backends.mps.is_available():
                device = torch.device('mps')
            else:
                # Направляем поток вычислений на видеокарту AMD
                device = torch_directml.device()

        def _prepare(tensor):
            if self.args.precision == 'half': tensor = tensor.half()
            return tensor.to(device)

        return [_prepare(a) for a in args]

    def terminate(self):
        if self.args.test_only:
            self.test()
            return True
        else:
            epoch = self.optimizer.get_last_epoch() + 1
            return epoch >= self.args.epochs