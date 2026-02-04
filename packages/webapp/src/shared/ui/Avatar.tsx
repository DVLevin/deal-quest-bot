import { useState } from 'react';
import { cn } from '@/shared/lib/cn';

export interface AvatarProps {
  username?: string | null;
  firstName?: string | null;
  photoUrl?: string | null;
  /** Avatar size variant (default 'md') */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
} as const;

export function Avatar({
  username,
  firstName,
  photoUrl,
  size = 'md',
  className,
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = (firstName?.[0] || username?.[0] || '?').toUpperCase();
  const showImage = photoUrl && !imgFailed;

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold shrink-0 overflow-hidden',
        sizes[size],
        className,
      )}
    >
      {showImage ? (
        <img
          src={photoUrl}
          alt={firstName || username || 'Avatar'}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
