import { type ComponentType, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { cn } from '@/shared/lib/cn';

interface CollapsibleSectionProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: () => void;
  badge?: string;
  badgeVariant?: 'default' | 'info' | 'warning' | 'success' | 'error' | 'brand';
  children: ReactNode;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  isOpen,
  onToggle,
  badge,
  badgeVariant = 'error',
  children,
}: CollapsibleSectionProps) {
  return (
    <Card padding="sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 text-left"
      >
        <Icon className="h-4 w-4 text-accent" />
        <span className="flex-1 text-[15px] font-semibold text-text">{title}</span>
        {badge && (
          <Badge variant={badgeVariant} size="sm">
            {badge}
          </Badge>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-text-hint transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'mt-3 max-h-[2000px] opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        {children}
      </div>
    </Card>
  );
}
