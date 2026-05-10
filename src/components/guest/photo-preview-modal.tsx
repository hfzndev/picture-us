// src/components/guest/photo-preview-modal.tsx
"use client";

interface PhotoPreviewModalProps {
  src: string;
  onUpload: () => void;
  onRetake: () => void;
  uploading: boolean;
  showCaption: boolean;
  caption: string;
  onCaptionChange: (caption: string) => void;
}

export function PhotoPreviewModal({
  src,
  onUpload,
  onRetake,
  uploading,
  showCaption,
  caption,
  onCaptionChange,
}: PhotoPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex flex-col items-center justify-center gap-4 p-4">
      <img
        src={src}
        alt="Preview"
        className="max-w-full max-h-[60vh] rounded-lg shadow-xl"
      />
      {showCaption && (
        <input
          type="text"
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Add a note to this photo..."
          className="input-base max-w-sm"
          maxLength={200}
          autoFocus
        />
      )}
      <div className="flex gap-3">
        <button onClick={onUpload} disabled={uploading} className="btn-primary">
          {uploading ? "Developing..." : "Save & Upload"}
        </button>
        <button onClick={onRetake} className="btn-secondary">
          Retake
        </button>
      </div>
    </div>
  );
}
