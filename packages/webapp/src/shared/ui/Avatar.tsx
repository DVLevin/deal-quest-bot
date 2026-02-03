import { cn } from '@/shared/lib/cn';

export interface AvatarProps {
  username?: string | null;
  firstName?: string | null;
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
  size = 'md',
  className,
}: AvatarProps) {
  const initials = (firstName?.[0] || username?.[0] || '?').toUpperCase();

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold shrink-0',
        sizes[size],
        className,
      )}
    >
      {initials}
    </div>
  );
}
