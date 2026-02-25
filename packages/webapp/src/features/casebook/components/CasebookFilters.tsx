/**
 * Filter chips for casebook browsing.
 *
 * Includes a "My Entries" toggle chip at the top, followed by three
 * horizontal-scrollable rows for persona type, scenario type, and industry.
 * "All" chip in each row maps to empty string (no filter).
 */

import { User } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

interface CasebookFiltersProps {
  personaTypes: string[];
  scenarioTypes: string[];
  industries: string[];
  selectedPersonaType: string;
  selectedScenarioType: string;
  selectedIndustry: string;
  onPersonaTypeChange: (v: string) => void;
  onScenarioTypeChange: (v: string) => void;
  onIndustryChange: (v: string) => void;
  showMyOnly: boolean;
  onShowMyOnlyChange: (v: boolean) => void;
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center rounded-button px-3 text-xs font-medium transition-colors',
        active
          ? 'bg-accent text-accent-text'
          : 'bg-surface-secondary text-text-hint hover:text-text',
      )}
    >
      {label}
    </button>
  );
}

function FilterRow({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string;
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-text-hint">{label}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <FilterChip
          label="All"
          active={selected === ''}
          onClick={() => onChange('')}
        />
        {options.map((option) => (
          <FilterChip
            key={option}
            label={option}
            active={selected === option}
            onClick={() => onChange(selected === option ? '' : option)}
          />
        ))}
      </div>
    </div>
  );
}

export function CasebookFilters({
  personaTypes,
  scenarioTypes,
  industries,
  selectedPersonaType,
  selectedScenarioType,
  selectedIndustry,
  onPersonaTypeChange,
  onScenarioTypeChange,
  onIndustryChange,
  showMyOnly,
  onShowMyOnlyChange,
}: CasebookFiltersProps) {
  return (
    <div className="space-y-3">
      {/* My Entries toggle */}
      <button
        type="button"
        onClick={() => onShowMyOnlyChange(!showMyOnly)}
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-button px-3 text-xs font-medium transition-colors',
          showMyOnly
            ? 'bg-accent text-accent-text'
            : 'bg-surface-secondary text-text-hint hover:text-text',
        )}
      >
        <User className="h-3.5 w-3.5" />
        My Entries
      </button>

      {/* Filter rows */}
      <FilterRow
        label="Persona"
        options={personaTypes}
        selected={selectedPersonaType}
        onChange={onPersonaTypeChange}
      />
      <FilterRow
        label="Scenario"
        options={scenarioTypes}
        selected={selectedScenarioType}
        onChange={onScenarioTypeChange}
      />
      <FilterRow
        label="Industry"
        options={industries}
        selected={selectedIndustry}
        onChange={onIndustryChange}
      />
    </div>
  );
}
