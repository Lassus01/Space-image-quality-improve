import { useState, useCallback, useEffect } from 'react';
import { ImageUploadZone } from './ImageUploadZone';
import { ImageComparison } from './ImageComparison';
import { Download, Sparkles } from 'lucide-react';
import { Button, Select, MenuItem, InputLabel, FormControl } from '@mui/material';

export function TestingTab() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [models, setModels] = useState<{id: string, name: string}[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');

  useEffect(() => {
    fetch('http://localhost:8000/api/models')
        .then(res => res.json())
        .then(data => {
            if (data.models && data.models.length > 0) {
                setModels(data.models);
                setSelectedModel(data.models[0].id);
            }
        })
        .catch(err => console.error(err));
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setOriginalFile(file);
      setEnhancedImage(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleEnhance = useCallback(async () => {
    if (!originalFile || !selectedModel) return;

    setIsProcessing(true);
    setEnhancedImage(null);

    const formData = new FormData();
    formData.append('model_id', selectedModel);
    formData.append('file', originalFile);

    try {
        const res = await fetch('http://localhost:8000/api/enhance', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.image_base64) {
            setEnhancedImage(data.image_base64);
        } else {
            alert(data.error || 'Failed to enhance image');
        }
    } catch(e) {
        console.error(e);
        alert('Error communicating with backend');
    } finally {
        setIsProcessing(false);
    }
  }, [originalFile, selectedModel]);

  const handleDownload = useCallback(() => {
    if (!enhancedImage) return;

    const link = document.createElement('a');
    link.href = enhancedImage;
    link.download = `enhanced-space-image-${Date.now()}.png`;
    link.click();
  }, [enhancedImage]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 h-full">
      {/* Left Panel - Controls */}
      <div className="space-y-6">
        {/* Upload Section */}
        {!originalImage && (
          <div>
            <h2 className="text-lg font-medium mb-4">Загрузка изображения</h2>
            <ImageUploadZone
              onImageSelect={handleImageSelect}
              hasImage={!!originalImage}
            />
          </div>
        )}

        {/* Action Buttons */}
        {originalImage && (
          <div className="space-y-3">
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel id="model-select-label" sx={{ color: '#94a3b8' }}>Выберите модель</InputLabel>
              <Select
                labelId="model-select-label"
                value={selectedModel}
                label="Выберите модель"
                onChange={(e) => setSelectedModel(e.target.value)}
                sx={{
                  color: 'white',
                  '.MuiOutlinedInput-notchedOutline': { borderColor: '#475569' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#64748b' }
                }}
              >
                {models.map((m) => (
                    <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              fullWidth
              onClick={handleEnhance}
              disabled={isProcessing}
              sx={{
                bgcolor: '#3b82f6',
                '&:hover': { bgcolor: '#2563eb' },
                py: 1.5,
                textTransform: 'none',
                fontSize: '1rem',
              }}
              startIcon={<Sparkles />}
            >
              {isProcessing ? 'Обработка EDSR...' : 'Улучшить изображение'}
            </Button>

            {enhancedImage && (
              <Button
                variant="outlined"
                fullWidth
                onClick={handleDownload}
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
                startIcon={<Download />}
              >
                Скачать результат
              </Button>
            )}

            <Button
              variant="text"
              fullWidth
              onClick={() => {
                setOriginalImage(null);
                setEnhancedImage(null);
              }}
              sx={{
                color: '#94a3b8',
                '&:hover': { bgcolor: '#ffffff10' },
                textTransform: 'none',
              }}
            >
              Загрузить другое изображение
            </Button>
          </div>
        )}

        {/* Info Panel */}
        {originalImage && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-300 mb-2">Информация о модели</h3>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• Модель: EDSR (PyTorch)</li>
              <li>• Увеличение: 2x</li>
              <li>• Время обработки: ~2.5 сек</li>
              <li>• PSNR: ~37 dB</li>
              <li>• SSIM: ~0.97</li>
            </ul>
          </div>
        )}
      </div>

      {/* Right Panel - Image Display */}
      <div className="bg-slate-800/30 rounded-lg border border-slate-700 overflow-hidden">
        {originalImage ? (
          <ImageComparison
            originalImage={originalImage}
            enhancedImage={enhancedImage}
            isProcessing={isProcessing}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center space-y-4">
              <Sparkles className="w-24 h-24 mx-auto opacity-20" />
              <div>
                <p className="text-lg">Загрузите космическое изображение</p>
                <p className="text-sm mt-2">для проверки работы нейросети</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
