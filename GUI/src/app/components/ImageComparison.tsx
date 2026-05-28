import { useState } from 'react';
import { motion } from 'motion/react';

interface ImageComparisonProps {
  originalImage: string;
  enhancedImage: string | null;
  isProcessing: boolean;
}

export function ImageComparison({ originalImage, enhancedImage, isProcessing }: ImageComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50);

  const handleSliderChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      {isProcessing ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"
            />
            <div>
              <p className="text-lg text-slate-200">Обработка изображения...</p>
              <p className="text-sm text-slate-400 mt-2">Применение нейронной сети</p>
            </div>
          </div>
        </div>
      ) : enhancedImage ? (
        <div
          className="relative w-full h-full cursor-ew-resize"
          onMouseMove={handleSliderChange}
        >
          {/* Enhanced image (right side) */}
          <div className="absolute inset-0">
            <img
              src={enhancedImage}
              alt="Enhanced"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-4 right-4 bg-green-500/90 text-white px-3 py-1 rounded-full text-sm font-medium">
              Улучшенное
            </div>
          </div>

          {/* Original image (left side) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPosition}%` }}
          >
            <img
              src={originalImage}
              alt="Original"
              className="w-full h-full object-contain"
              style={{ width: `${(100 / sliderPosition) * 100}%` }}
            />
            <div className="absolute top-4 left-4 bg-slate-700/90 text-white px-3 py-1 rounded-full text-sm font-medium">
              Оригинал
            </div>
          </div>

          {/* Slider */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 bg-white rounded" />
                <div className="w-0.5 h-4 bg-white rounded" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={originalImage}
            alt="Original"
            className="max-w-full max-h-full object-contain"
          />
          <div className="absolute top-4 left-4 bg-slate-700/90 text-white px-3 py-1 rounded-full text-sm font-medium">
            Оригинал
          </div>
        </div>
      )}
    </div>
  );
}
