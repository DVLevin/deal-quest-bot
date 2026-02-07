/**
 * Dashboard quick-action navigation with promoted hero CTA.
 *
 * Grid of 5 action cards linking to the main feature pages.
 * When a primaryAction is set, that action gets promoted to a
 * full-width accent card with shadow elevation.
 * Remaining actions render in a compact 2-col or 4-col grid.
 */

import { Link } from 'react-router';
import {
  BookOpen,
  Swords,
  LifeBuoy,
  BookMarked,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';

interface QuickAction {
  to: string;
  label: string;
  icon: LucideIcon;
  accent: string;
}

const actions: QuickAction[] = [
  { to: '/support', label: 'Support', icon: LifeBuoy, accent: 'oklch(0.60 0.20 300)' },
  { to: '/leads', label: 'Leads', icon: Users, accent: 'oklch(0.70 0.15 250)' },
  { to: '/learn', label: 'Learn', icon: BookOpen, accent: 'oklch(0.72 0.19 150)' },
  { to: '/train', label: 'Train', icon: Swords, accent: 'oklch(0.80 0.18 85)' },
  { to: '/casebook', label: 'Casebook', icon: BookMarked, accent: 'oklch(0.65 0.15 250)' },
];

interface QuickActionsProps {
  primaryAction?: string;
}

export function QuickActions({ primaryAction }: QuickActionsProps) {
  const promoted = primaryAction
    ? actions.find((a) => a.to === primaryAction)
    : undefined;
  const rest = promoted
    ? actions.filter((a) => a.to !== primaryAction)
    : actions;

  return (
    <div className="space-y-3">
      {/* Promoted full-width CTA */}
      {promoted && (
        <Link to={promoted.to}>
          <Card
            className={cn(
              'flex min-h-[56px] flex-row items-center justify-center gap-3',
              'bg-accent text-accent-text font-bold shadow-raised',
              'transition-all active:scale-[0.98] active:shadow-modal',
            )}
            padding="sm"
          >
            <promoted.icon className="h-6 w-6" />
            <span className="text-sm">{promoted.label}</span>
          </Card>
        </Link>
      )}

      {/* Remaining actions in grid with icon accent dots */}
      <div className={cn(promoted ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-3 gap-3')}>
        {rest.map(({ to, label, icon: Icon, accent }) => (
          <Link key={to} to={to}>
            <Card
              className={cn(
                'flex min-h-[72px] flex-col items-center justify-center gap-1.5',
                'transition-all active:scale-[0.97] active:shadow-card-hover',
              )}
              padding="sm"
            >
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: `color-mix(in oklch, ${accent} 15%, transparent)` }}
              >
                <Icon className="h-5 w-5" style={{ color: accent }} />
              </div>
              <span className="text-xs font-semibold text-text-secondary">
                {label}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
