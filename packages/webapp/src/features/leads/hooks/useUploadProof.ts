/**
 * Mutation hook for uploading proof-of-action screenshots to InsForge storage.
 *
 * Flow:
 * 1. Client-side resize image to max 1200px dimension (prevents large upload failures)
 * 2. Upload resized JPEG to InsForge storage (prospect-photos bucket, proof/ prefix)
 * 3. Fetch and return the public URL
 *
 * Uses the existing `prospect-photos` bucket with `proof/` key prefix to avoid
 * needing a new storage bucket.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';

const MAX_DIMENSION = 1200;
const JPEG_QUALITY = 0.85;

interface UploadProofVars {
  file: File;
  leadId: number;
  stepId: number;
  telegramId: number;
}

/**
 * Resize an image file to fit within MAX_DIMENSION x MAX_DIMENSION pixels.
 * Returns the original file if already within bounds.
 * Exports for independent testing.
 */
export async function resizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const { width, height } = img;

      // No resize needed if within bounds
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        resolve(file);
        return;
      }

      // Calculate scaled dimensions preserving aspect ratio
      const scale = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
      const newWidth = Math.round(width * scale);
      const newHeight = Math.round(height * scale);

      // Draw to canvas and export as JPEG
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas 2d context'));
        return;
      }

      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob returned null'));
            return;
          }
          const resizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for resizing'));
    };

    img.src = url;
  });
}

export function useUploadProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      leadId,
      stepId,
    }: UploadProofVars): Promise<string> => {
      // 1. Client-side resize to prevent large upload failures
      const resizedFile = await resizeImage(file);

      // 2. Upload to InsForge storage (prospect-photos bucket, proof/ prefix)
      const key = `proof/${leadId}/${stepId}/${Date.now()}.jpg`;
      const { error } = await getInsforge()
        .storage.from('prospect-photos')
        .upload(key, resizedFile);

      if (error) throw error;

      // 3. Get public URL for the uploaded file
      const publicUrl = getInsforge()
        .storage.from('prospect-photos')
        .getPublicUrl(key);

      if (!publicUrl) {
        throw new Error('Failed to get public URL for uploaded proof');
      }

      return publicUrl;
    },
    onSettled: (_data, _err, { leadId, telegramId }) => {
      // Invalidate lead caches so UI picks up the new proof_url
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.detail(leadId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leads.byUser(telegramId),
      });
    },
  });
}
