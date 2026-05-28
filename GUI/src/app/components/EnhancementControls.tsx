import { Slider } from '@mui/material';
import { Sparkles, Zap, Brain } from 'lucide-react';

interface EnhancementControlsProps {
  model: string;
  onModelChange: (model: string) => void;
  denoisingStrength: number;
  onDenoisingChange: (value: number) => void;
  sharpness: number;
  onSharpnessChange: (value: number) => void;
  upscaleFactor: number;
  onUpscaleChange: (value: number) => void;
}

export function EnhancementControls({
  model,
  onModelChange,
  denoisingStrength,
  onDenoisingChange,
  sharpness,
  onSharpnessChange,
  upscaleFactor,
  onUpscaleChange,
}: EnhancementControlsProps) {
  const models = [
    { id: 'deepspace', name: 'DeepSpace-Net', icon: Sparkles, desc: 'Общее улучшение' },
    { id: 'superres', name: 'SuperRes-AI', icon: Zap, desc: 'Увеличение разрешения' },
    { id: 'denoise', name: 'Denoise-Pro', icon: Brain, desc: 'Удаление шума' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Модель нейронной сети</h3>
        <div className="grid grid-cols-1 gap-3">
          {models.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onModelChange(m.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  model === m.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${model === m.id ? 'text-blue-400' : 'text-slate-400'}`} />
                  <div className="flex-1">
                    <div className={`font-medium ${model === m.id ? 'text-blue-300' : 'text-slate-200'}`}>
                      {m.name}
                    </div>
                    <div className="text-xs text-slate-400">{m.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-slate-300">Шумоподавление</label>
            <span className="text-sm text-blue-400">{denoisingStrength}%</span>
          </div>
          <Slider
            value={denoisingStrength}
            onChange={(_, value) => onDenoisingChange(value as number)}
            min={0}
            max={100}
            sx={{
              color: '#60a5fa',
              '& .MuiSlider-thumb': {
                width: 16,
                height: 16,
              },
            }}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-slate-300">Резкость</label>
            <span className="text-sm text-blue-400">{sharpness}%</span>
          </div>
          <Slider
            value={sharpness}
            onChange={(_, value) => onSharpnessChange(value as number)}
            min={0}
            max={100}
            sx={{
              color: '#60a5fa',
              '& .MuiSlider-thumb': {
                width: 16,
                height: 16,
              },
            }}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm text-slate-300">Увеличение</label>
            <span className="text-sm text-blue-400">{upscaleFactor}x</span>
          </div>
          <Slider
            value={upscaleFactor}
            onChange={(_, value) => onUpscaleChange(value as number)}
            min={1}
            max={4}
            step={1}
            marks
            sx={{
              color: '#60a5fa',
              '& .MuiSlider-thumb': {
                width: 16,
                height: 16,
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
