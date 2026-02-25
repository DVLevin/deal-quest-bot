/**
 * Difficulty filter with tier-card visual design.
 *
 * Renders 4 tappable cards in a 2x2 grid: Rookie (1), Pro (2), Elite (3), Random (null).
 * Selected card shows a colored border with ambient glow.
 * 44px minimum touch targets.
 */

import { cn } from '@/shared/lib/cn';
import { Shield, Flame, Skull, Shuffle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface DifficultyFilterProps {
  /** Currently selected difficulty (null = Random) */
  selected: number | null;
  /** Callback when user selects a difficulty */
  onSelect: (difficulty: number | null) => void;
}

interface TierOption {
  value: number | null;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  bgActive: string;
  borderActive: string;
  textActive: string;
}

const TIERS: TierOption[] = [
  {
    value: 1,
    label: 'Rookie',
    subtitle: 'Warm up',
    icon: Shield,
    color: 'oklch(0.72 0.19 150)',
    bgActive: 'bg-success/10',
    borderActive: 'border-success',
    textActive: 'text-success',
  },
  {
    value: 2,
    label: 'Pro',
    subtitle: 'Real deals',
    icon: Flame,
    color: 'oklch(0.80 0.18 85)',
    bgActive: 'bg-warning/10',
    borderActive: 'border-warning',
    textActive: 'text-warning',
  },
  {
    value: 3,
    label: 'Elite',
    subtitle: 'No mercy',
    icon: Skull,
    color: 'oklch(0.65 0.22 25)',
    bgActive: 'bg-error/10',
    borderActive: 'border-error',
    textActive: 'text-error',
  },
  {
    value: null,
    label: 'Random',
    subtitle: 'Surprise me',
    icon: Shuffle,
    color: 'oklch(0.70 0.15 250)',
    bgActive: 'bg-info/10',
    borderActive: 'border-info',
    textActive: 'text-info',
  },
];

export function DifficultyFilter({ selected, onSelect }: DifficultyFilterProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TIERS.map((tier) => {
        const isActive = selected === tier.value;
        const Icon = tier.icon;
        return (
          <button
            key={tier.label}
            type="button"
            onClick={() => onSelect(tier.value)}
            className={cn(
              'flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 transition-all active:scale-[0.97]',
              isActive
                ? cn(tier.bgActive, tier.borderActive, 'shadow-raised')
                : 'border-surface-secondary bg-surface-secondary/30 hover:bg-surface-secondary/50',
            )}
            style={isActive ? { '--tier-color': tier.color } as React.CSSProperties : undefined}
          >
            <Icon
              className={cn(
                'h-5 w-5 transition-colors',
                isActive ? tier.textActive : 'text-text-hint',
              )}
            />
            <span
              className={cn(
                'text-sm font-bold transition-colors',
                isActive ? tier.textActive : 'text-text',
              )}
            >
              {tier.label}
            </span>
            <span className="text-[11px] text-text-hint">{tier.subtitle}</span>
          </button>
        );
      })}
    </div>
  );
}
