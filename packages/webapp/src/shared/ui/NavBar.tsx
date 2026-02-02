import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  BookOpen,
  Swords,
  Handshake,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/learn', label: 'Learn', icon: BookOpen },
  { to: '/train', label: 'Train', icon: Swords },
  { to: '/support', label: 'Support', icon: Handshake },
  { to: '/leads', label: 'Leads', icon: Users },
];

export function NavBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-surface-secondary bg-surface pb-[var(--spacing-safe-bottom)]"
    >
      <div className="flex items-stretch justify-around">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-1 text-xs transition-colors',
                isActive ? 'text-accent' : 'text-text-hint',
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
