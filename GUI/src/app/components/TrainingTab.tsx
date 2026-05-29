import { useState, useEffect } from 'react';
import { Button, LinearProgress } from '@mui/material';
import { Database, Play, Pause, RotateCcw, FolderOpen } from 'lucide-react';

interface Dataset {
  id: string;
  name: string;
  images: number;
  size: string;
  type: 'space' | 'satellite' | 'telescope';
}

export function TrainingTab() {
  const [availableDatasets, setAvailableDatasets] = useState<Dataset[]>([]);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [totalEpochs, setTotalEpochs] = useState(100);
  const [learningRate, setLearningRate] = useState(0.0001);
  const [batchSize, setBatchSize] = useState(16);
  const [datasetPath, setDatasetPath] = useState("");
  const [latestLoss, setLatestLoss] = useState(0.0);
  const [blurKernel, setBlurKernel] = useState(1.5);
  const [noiseStd, setNoiseStd] = useState(5.0);
  const [scale, setScale] = useState(2);

  const fetchDatasets = () => {
    fetch('http://localhost:8000/api/datasets')
      .then(res => res.json())
      .then(data => {
        if (data.datasets && data.datasets.length > 0) {
          const mappedDatasets = data.datasets.map((d: any) => ({
            id: d.id,
            name: d.name,
            images: 0,
            size: 'Unknown',
            type: 'space'
          }));
          setAvailableDatasets(mappedDatasets);
          if (mappedDatasets.length > 0) {
              setSelectedDatasets([mappedDatasets[0].id]);
          }
        } else {
            setAvailableDatasets([]);
        }
      })
      .catch(err => console.error("Error fetching datasets:", err));
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTraining) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('http://localhost:8000/api/training_status');
          const data = await res.json();
          setIsTraining(data.is_running);
          setCurrentEpoch(data.current_epoch);
          if (data.total_epochs > 0) {
              setTrainingProgress((data.current_epoch / data.total_epochs) * 100);
          }
          setLatestLoss(data.latest_loss);
        } catch (e) {
          console.error('Error fetching training status', e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isTraining]);

  const prepareDataset = async () => {
    if (!datasetPath) {
      alert("Пожалуйста, укажите абсолютный путь к сырым изображениям.");
      return;
    }
    try {
        const res = await fetch('http://localhost:8000/api/prepare_dataset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input_directories: [datasetPath],
                blur_kernel: blurKernel,
                noise_std: noiseStd,
                scale: scale
            })
        });
        const data = await res.json();
        console.log(data);
        alert(data.message);
        fetchDatasets();
    } catch(e) {
        console.error(e);
        alert('Failed to prepare dataset');
    }
  }

  const toggleDataset = (id: string) => {
    setSelectedDatasets((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const startTraining = async () => {
    try {
        const res = await fetch('http://localhost:8000/api/train', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ epochs: totalEpochs, learning_rate: learningRate, batch_size: batchSize })
        });
        const data = await res.json();
        if (res.ok) {
            setIsTraining(true);
            setIsPaused(false);
            setCurrentEpoch(0);
            setTrainingProgress(0);
        } else {
            alert(data.error);
        }
    } catch(e) {
        console.error(e);
        alert('Failed to start training');
    }
  };

  const pauseTraining = () => {
    setIsPaused(!isPaused);
  };

  const resetTraining = () => {
    setIsTraining(false);
    setIsPaused(false);
    setCurrentEpoch(0);
    setTrainingProgress(0);
  };

  const selectedCount = selectedDatasets.length;
  const totalImages = selectedDatasets.reduce((acc, id) => {
    const ds = availableDatasets.find((d) => d.id === id);
    return acc + (ds?.images || 0);
  }, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-6 h-full">
      {/* Left Panel - Configuration */}
      <div className="space-y-6 overflow-auto pb-6 pr-2">
        {/* Data Preparation */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700 mb-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" />
              Подготовка данных
            </h2>
          </div>

          <div className="mb-4">
            <label className="text-sm text-slate-300 mb-2 block">Абсолютный путь к сырым изображениям</label>
            <input
              type="text"
              value={datasetPath}
              onChange={(e) => setDatasetPath(e.target.value)}
              disabled={isTraining}
              placeholder="/path/to/raw/images"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Размытие (Kernel)</label>
              <input
                type="number"
                value={blurKernel}
                onChange={(e) => setBlurKernel(parseFloat(e.target.value))}
                step="0.1"
                min="0"
                disabled={isTraining}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Шум (Std)</label>
              <input
                type="number"
                value={noiseStd}
                onChange={(e) => setNoiseStd(parseFloat(e.target.value))}
                step="0.5"
                min="0"
                disabled={isTraining}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Масштаб (Scale)</label>
              <select
                value={scale}
                onChange={(e) => setScale(parseInt(e.target.value))}
                disabled={isTraining}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 disabled:opacity-50"
              >
                <option value={2}>2x</option>
                <option value={3}>3x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          </div>

          <Button
            variant="outlined"
            fullWidth
            onClick={prepareDataset}
            disabled={isTraining}
            sx={{
              borderColor: '#10b981',
              color: '#10b981',
              '&:hover': {
                borderColor: '#059669',
                bgcolor: '#10b98110',
              },
              py: 1.5,
              textTransform: 'none',
              fontSize: '1rem',
            }}
          >
            Запустить генерацию
          </Button>
        </div>

        {/* Dataset Selection */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" />
              Наборы данных
            </h2>
            <span className="text-sm text-slate-400">Выбрано: {selectedCount}</span>
          </div>

          {availableDatasets.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Доступные датасеты не найдены.</p>
              <p className="text-sm">Пожалуйста, подготовьте данные.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {availableDatasets.map((dataset) => {
                const isSelected = selectedDatasets.includes(dataset.id);
                return (
                  <button
                    key={dataset.id}
                    onClick={() => !isTraining && toggleDataset(dataset.id)}
                    disabled={isTraining}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    } ${isTraining ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={`font-medium ${isSelected ? 'text-blue-300' : 'text-slate-200'}`}>
                        {dataset.name}
                      </div>
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-600'
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>Изображений: {dataset.images.toLocaleString()}</div>
                      <div>Размер: {dataset.size}</div>
                      <div className="capitalize">Тип: {dataset.type}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="text-sm text-slate-300">
              <div className="flex justify-between mb-1">
                <span>Всего изображений:</span>
                <span className="font-medium text-blue-400">{totalImages.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Наборов данных:</span>
                <span className="font-medium text-blue-400">{selectedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Training Parameters */}
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-medium mb-4">Параметры обучения EDSR</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300 mb-2 block">Learning Rate</label>
              <input
                type="number"
                value={learningRate}
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                disabled={isTraining}
                step="0.00001"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Batch Size</label>
              <select
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
                disabled={isTraining}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 disabled:opacity-50"
              >
                <option value={8}>8</option>
                <option value={16}>16</option>
                <option value={32}>32</option>
                <option value={64}>64</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-2 block">Количество эпох</label>
              <input
                type="number"
                value={totalEpochs}
                onChange={(e) => setTotalEpochs(parseInt(e.target.value))}
                disabled={isTraining}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 disabled:opacity-50"
              />
            </div>

            <div className="pt-2 space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Модель: EDSR (Enhanced Deep Super-Resolution)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Framework: PyTorch 2.0</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Optimizer: Adam</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Training Status */}
      <div className="space-y-6">
        <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
          <h2 className="text-lg font-medium mb-4">Статус обучения</h2>

          {isTraining || trainingProgress > 0 ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-300">Прогресс</span>
                  <span className="text-blue-400">{Math.round(trainingProgress)}%</span>
                </div>
                <LinearProgress
                  variant="determinate"
                  value={trainingProgress}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    bgcolor: '#1e293b',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#3b82f6',
                    },
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">Эпоха</div>
                  <div className="text-xl font-medium text-blue-400">
                    {currentEpoch}/{totalEpochs}
                  </div>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-lg">
                  <div className="text-xs text-slate-400 mb-1">Статус</div>
                  <div className="text-xl font-medium text-green-400">
                    {isPaused ? 'Пауза' : isTraining ? 'Обучение' : 'Завершено'}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Loss:</span>
                  <span className="text-slate-200">{latestLoss.toFixed(4)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400">
              <FolderOpen className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p>Обучение не запущено</p>
              <p className="text-sm mt-1">Выберите датасеты и нажмите "Начать обучение"</p>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className="space-y-3">
          {!isTraining ? (
            <Button
              variant="contained"
              fullWidth
              onClick={startTraining}
              disabled={selectedDatasets.length === 0}
              sx={{
                bgcolor: '#3b82f6',
                '&:hover': { bgcolor: '#2563eb' },
                py: 1.5,
                textTransform: 'none',
                fontSize: '1rem',
              }}
              startIcon={<Play />}
            >
              Начать обучение
            </Button>
          ) : (
            <Button
              variant="contained"
              fullWidth
              onClick={pauseTraining}
              sx={{
                bgcolor: '#f59e0b',
                '&:hover': { bgcolor: '#d97706' },
                py: 1.5,
                textTransform: 'none',
                fontSize: '1rem',
              }}
              startIcon={<Pause />}
            >
              {isPaused ? 'Продолжить' : 'Пауза'}
            </Button>
          )}

          <Button
            variant="outlined"
            fullWidth
            onClick={resetTraining}
            disabled={!isTraining && trainingProgress === 0}
            sx={{
              borderColor: '#ef4444',
              color: '#ef4444',
              '&:hover': {
                borderColor: '#dc2626',
                bgcolor: '#ef444410',
              },
              py: 1.5,
              textTransform: 'none',
              fontSize: '1rem',
            }}
            startIcon={<RotateCcw />}
          >
            Сбросить
          </Button>
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-300 mb-2">О модели EDSR</h3>
          <ul className="text-xs text-slate-300 space-y-1">
            <li>• Enhanced Deep Super-Resolution Network</li>
            <li>• Архитектура: ResNet-based</li>
            <li>• Увеличение до 4x без потери качества</li>
            <li>• Оптимизация для космических снимков</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
