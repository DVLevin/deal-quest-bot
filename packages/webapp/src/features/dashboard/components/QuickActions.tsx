/**
 * Dashboard quick-action navigation buttons.
 *
 * Grid of 5 action cards linking to the main feature pages.
 * Each button has a min 44px touch target for accessibility.
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
}

const actions: QuickAction[] = [
  { to: '/support', label: 'Support', icon: LifeBuoy },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/train', label: 'Train', icon: Swords },
  { to: '/casebook', label: 'Casebook', icon: BookMarked },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to}>
          <Card
            className={cn(
              'flex min-h-[72px] flex-col items-center justify-center gap-1.5',
              'transition-shadow active:shadow-card-hover',
            )}
            padding="sm"
          >
            <Icon className="h-6 w-6 text-accent" />
            <span className="text-xs font-medium text-text-secondary">
              {label}
            </span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
