/**
 * Search input with icon and clear button.
 *
 * Controlled component -- debouncing is handled by the parent via
 * useDebouncedValue, not inside this component.
 * 44px minimum height for Telegram touch targets.
 */

import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search casebook...',
}: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-hint" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[44px] w-full rounded-button bg-surface-secondary pl-10 pr-10 text-sm text-text placeholder:text-text-hint focus:outline-none focus:ring-2 focus:ring-accent/50"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-hint transition-colors hover:bg-surface-secondary/80 hover:text-text"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
