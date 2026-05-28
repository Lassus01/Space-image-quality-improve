import { useState, useCallback } from 'react';
import { ImageUploadZone } from './ImageUploadZone';
import { ImageComparison } from './ImageComparison';
import { Download, Sparkles } from 'lucide-react';
import { Button } from '@mui/material';

export function TestingTab() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageSelect = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setOriginalImage(e.target?.result as string);
      setEnhancedImage(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleEnhance = useCallback(() => {
    if (!originalImage) return;

    setIsProcessing(true);
    setEnhancedImage(null);

    // Simulate neural network processing
    setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const upscaleFactor = 2;
        canvas.width = img.width * upscaleFactor;
        canvas.height = img.height * upscaleFactor;

        ctx.filter = 'contrast(1.3) brightness(1.1) saturate(1.2)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const denoisingStrength = 0.7;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = data[i] * (1 - denoisingStrength * 0.1) + 128 * denoisingStrength * 0.1;
          data[i + 1] = data[i + 1] * (1 - denoisingStrength * 0.1) + 128 * denoisingStrength * 0.1;
          data[i + 2] = data[i + 2] * (1 - denoisingStrength * 0.1) + 128 * denoisingStrength * 0.1;
        }

        ctx.putImageData(imageData, 0, 0);

        setEnhancedImage(canvas.toDataURL());
        setIsProcessing(false);
      };
      img.src = originalImage;
    }, 2500);
  }, [originalImage]);

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
