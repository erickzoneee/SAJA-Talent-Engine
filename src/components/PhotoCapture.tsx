import { useRef } from 'react';
import { Camera, Upload } from 'lucide-react';

interface PhotoCaptureProps {
  onCapture: (base64: string) => void;
  currentPhoto?: string;
  label?: string;
}

export default function PhotoCapture({
  onCapture,
  currentPhoto,
  label = 'Photo',
}: PhotoCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') {
        onCapture(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <label className="text-sm font-medium text-surface-300">{label}</label>
      )}
      <div className="glass-card p-4 flex flex-col items-center gap-4">
        {currentPhoto ? (
          <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-surface-600/30">
            <img
              src={currentPhoto}
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-32 h-32 rounded-xl border-2 border-dashed border-surface-600/40 flex items-center justify-center">
            <Camera size={32} className="text-surface-500" />
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            className="btn-primary text-sm flex items-center gap-2"
            onClick={() => cameraInputRef.current?.click()}
          >
            <Camera size={16} />
            Take Photo
          </button>
          <button
            type="button"
            className="btn-secondary text-sm flex items-center gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={16} />
            Upload
          </button>
        </div>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    </div>
  );
}
