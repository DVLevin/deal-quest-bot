/**
 * Casebook page with nested sub-routes.
 *
 * Two views:
 * - Index (CasebookHome): SearchBar + My Entries toggle + filter chips + results list
 * - Entry detail (:entryId): Full analysis with copy and "Use as Template"
 *
 * Uses the /casebook/* wildcard route from Router.tsx.
 */

import { useState } from 'react';
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router';
import { BookOpen } from 'lucide-react';
import { Skeleton } from '@/shared/ui';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { SearchBar } from '@/features/casebook/components/SearchBar';
import { CasebookFilters } from '@/features/casebook/components/CasebookFilters';
import { CasebookList } from '@/features/casebook/components/CasebookList';
import { CasebookDetail } from '@/features/casebook/components/CasebookDetail';
import {
  useCasebook,
  useCasebookFilterOptions,
} from '@/features/casebook/hooks/useCasebook';
import { useCasebookEntry } from '@/features/casebook/hooks/useCasebookEntry';

// ---------------------------------------------------------------------------
// CasebookHome (index route)
// ---------------------------------------------------------------------------

function CasebookHome() {
  const navigate = useNavigate();

  // Search state with debounce
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  // Filter state
  const [selectedPersonaType, setSelectedPersonaType] = useState('');
  const [selectedScenarioType, setSelectedScenarioType] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [showMyOnly, setShowMyOnly] = useState(false);

  // Data hooks
  const { data: filterOptions } = useCasebookFilterOptions();
  const { data: entries, isLoading, isError, refetch } = useCasebook({
    keyword: debouncedSearch,
    personaType: selectedPersonaType,
    scenarioType: selectedScenarioType,
    industry: selectedIndustry,
    showMyOnly,
  });

  const hasActiveFilters =
    debouncedSearch.length > 0 ||
    selectedPersonaType !== '' ||
    selectedScenarioType !== '' ||
    selectedIndustry !== '' ||
    showMyOnly;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <SearchBar value={searchTerm} onChange={setSearchTerm} />

      {/* Filters including My Entries toggle */}
      <CasebookFilters
        personaTypes={filterOptions?.personaTypes ?? []}
        scenarioTypes={filterOptions?.scenarioTypes ?? []}
        industries={filterOptions?.industries ?? []}
        selectedPersonaType={selectedPersonaType}
        selectedScenarioType={selectedScenarioType}
        selectedIndustry={selectedIndustry}
        onPersonaTypeChange={setSelectedPersonaType}
        onScenarioTypeChange={setSelectedScenarioType}
        onIndustryChange={setSelectedIndustry}
        showMyOnly={showMyOnly}
        onShowMyOnlyChange={setShowMyOnly}
      />

      {/* Results list */}
      <CasebookList
        entries={entries ?? []}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        onEntryClick={(id) => navigate(`/casebook/${id}`)}
        hasActiveFilters={hasActiveFilters}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// CasebookEntryView (:entryId route)
// ---------------------------------------------------------------------------

function CasebookEntryView() {
  const { entryId } = useParams<{ entryId: string }>();
  const numericId = Number(entryId);

  const { data: entry, isLoading } = useCasebookEntry(
    Number.isNaN(numericId) ? 0 : numericId,
  );

  if (Number.isNaN(numericId)) {
    return <Navigate to="/casebook" replace />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton height={28} width="60%" />
        <Skeleton height={120} />
        <Skeleton height={120} />
        <Skeleton height={120} />
        <Skeleton height={120} />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="rounded-card bg-surface-secondary/30 p-6 text-center">
        <p className="text-sm text-text-hint">
          Entry not found. It may have been removed.
        </p>
      </div>
    );
  }

  return <CasebookDetail entry={entry} />;
}

// ---------------------------------------------------------------------------
// Casebook page (root with nested routes)
// ---------------------------------------------------------------------------

export default function Casebook() {
  return (
    <div className="space-y-4 px-4 pt-4 pb-6">
      {/* Page title */}
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-accent" />
        <h1 className="text-xl font-bold text-text">Casebook</h1>
      </div>

      {/* Sub-routes */}
      <Routes>
        <Route index element={<CasebookHome />} />
        <Route path=":entryId" element={<CasebookEntryView />} />
        <Route path="*" element={<Navigate to="/casebook" replace />} />
      </Routes>
    </div>
  );
}
