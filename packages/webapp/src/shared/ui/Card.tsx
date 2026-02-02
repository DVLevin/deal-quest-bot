import { type HTMLAttributes, type ElementType } from 'react';
import { cn } from '@/shared/lib/cn';

const paddingVariants = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
} as const;

export interface CardProps extends HTMLAttributes<HTMLElement> {
  padding?: keyof typeof paddingVariants;
  as?: ElementType;
}

export function Card({
  className,
  padding = 'md',
  as: Component = 'div',
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        'bg-surface rounded-card shadow-card',
        paddingVariants[padding],
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
