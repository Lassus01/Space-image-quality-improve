import { Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploadZoneProps {
  onImageSelect: (file: File) => void;
  hasImage: boolean;
}

export function ImageUploadZone({ onImageSelect, hasImage }: ImageUploadZoneProps) {
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-blue-500/30 rounded-lg p-12 text-center hover:border-blue-500/50 transition-colors cursor-pointer bg-slate-900/30"
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
        {hasImage ? (
          <ImageIcon className="w-16 h-16 text-blue-400" />
        ) : (
          <Upload className="w-16 h-16 text-blue-400" />
        )}
        <div>
          <p className="text-lg text-slate-200 mb-2">
            {hasImage ? 'Изображение загружено' : 'Перетащите космическое изображение сюда'}
          </p>
          <p className="text-sm text-slate-400">
            или нажмите для выбора файла (JPG, PNG, TIFF)
          </p>
        </div>
      </label>
    </div>
  );
}
