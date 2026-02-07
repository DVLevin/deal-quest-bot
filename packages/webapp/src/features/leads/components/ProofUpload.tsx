/**
 * ProofUpload -- screenshot upload with progress and preview.
 *
 * Three visual states:
 * 1. No screenshot, not uploading -- dashed upload area with camera icon
 * 2. Uploading -- spinner with "Uploading..." text
 * 3. Screenshot exists -- green success bar with thumbnail and replace option
 *
 * Uses <input type="file" accept="image/*"> without capture="camera"
 * (breaks on some Telegram Android WebView versions).
 */

import { useRef } from 'react';
import { Camera, Loader2, CheckCircle } from 'lucide-react';

interface ProofUploadProps {
  onUpload: (file: File) => Promise<void>;
  existingProofUrl?: string;
  isUploading: boolean;
}

export function ProofUpload({
  onUpload,
  existingProofUrl,
  isUploading,
}: ProofUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* State: Uploading */}
      {isUploading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span className="text-sm font-medium text-accent">Uploading...</span>
        </div>
      )}

      {/* State: Proof exists */}
      {!isUploading && existingProofUrl && (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-success" />
          <span className="flex-1 text-sm font-medium text-success">
            Screenshot attached
          </span>
          <img
            src={existingProofUrl}
            alt="Attached screenshot"
            className="h-10 w-10 rounded object-cover"
          />
          <button
            type="button"
            onClick={triggerFileSelect}
            className="text-xs font-medium text-text-hint underline transition-colors active:text-text-secondary"
          >
            Replace
          </button>
        </div>
      )}

      {/* State: No proof, not uploading */}
      {!isUploading && !existingProofUrl && (
        <button
          type="button"
          onClick={triggerFileSelect}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-accent/30 bg-accent/5 py-4 transition-colors active:bg-accent/10"
        >
          <Camera className="h-6 w-6 text-accent/60" />
          <span className="text-sm font-medium text-accent/80">
            Attach Screenshot
          </span>
        </button>
      )}
    </div>
  );
}
