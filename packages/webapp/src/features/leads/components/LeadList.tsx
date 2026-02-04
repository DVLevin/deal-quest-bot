/**
 * Lead list component with search, status filter, and company grouping.
 *
 * Fetches leads via useLeads() hook and renders them as LeadCard components.
 * Shows loading skeletons, empty state, or filtered/grouped lead cards.
 *
 * All filtering is client-side using useMemo on the leads array.
 */

import { useState, useMemo } from 'react';
import { Users, Building2, ChevronRight, Filter } from 'lucide-react';
import { Badge, Skeleton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { SearchBar } from '@/features/casebook/components/SearchBar';
import { useLeads } from '../hooks/useLeads';
import { LEAD_STATUS_CONFIG } from '../types';
import type { LeadStatus } from '@/types/enums';
import { LeadCard } from './LeadCard';

interface LeadListProps {
  onSelectLead: (leadId: number) => void;
}

export function LeadList({ onSelectLead }: LeadListProps) {
  const { data: leads, isLoading } = useLeads();

  // --- State ---
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('');
  const [groupByCompany, setGroupByCompany] = useState(false);
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(
    new Set(),
  );

  // --- Filtered leads ---
  const filteredLeads = useMemo(() => {
    if (!leads) return [];
    let result = leads;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (lead) =>
          lead.prospect_name?.toLowerCase().includes(q) ||
          lead.prospect_first_name?.toLowerCase().includes(q) ||
          lead.prospect_last_name?.toLowerCase().includes(q) ||
          lead.prospect_company?.toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      result = result.filter((lead) => lead.status === statusFilter);
    }
    return result;
  }, [leads, debouncedSearch, statusFilter]);

  // --- Company grouping ---
  const companyGroups = useMemo(() => {
    if (!groupByCompany) return null;
    const map = new Map<string, typeof filteredLeads>();
    for (const lead of filteredLeads) {
      const company = lead.prospect_company?.trim() || 'No Company';
      const group = map.get(company) ?? [];
      group.push(lead);
      map.set(company, group);
    }
    return Array.from(map.entries())
      .map(([company, companyLeads]) => ({ company, leads: companyLeads }))
      .sort((a, b) => b.leads.length - a.leads.length);
  }, [filteredLeads, groupByCompany]);

  // --- Handlers ---
  function toggleCompany(company: string) {
    setCollapsedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(company)) next.delete(company);
      else next.add(company);
      return next;
    });
  }

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton height={80} />
        <Skeleton height={80} />
        <Skeleton height={80} />
        <Skeleton height={80} />
      </div>
    );
  }

  // --- Empty state (no leads at all) ---
  if (!leads || leads.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card bg-surface-secondary/30 p-8 text-center">
        <Users className="h-8 w-8 text-text-hint" />
        <p className="text-sm font-medium text-text-secondary">No leads yet</p>
        <p className="text-xs text-text-hint">
          Analyze prospects in the bot to build your pipeline.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <SearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder="Search leads..."
      />

      {/* Status filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          className={cn(
            'inline-flex h-8 shrink-0 items-center rounded-button px-3 text-xs font-medium transition-colors',
            statusFilter === ''
              ? 'bg-accent text-accent-text'
              : 'bg-surface-secondary text-text-hint',
          )}
        >
          All
        </button>
        {(
          Object.entries(LEAD_STATUS_CONFIG) as [
            LeadStatus,
            (typeof LEAD_STATUS_CONFIG)[LeadStatus],
          ][]
        ).map(([status, config]) => (
          <button
            key={status}
            type="button"
            onClick={() =>
              setStatusFilter(statusFilter === status ? '' : status)
            }
            className={cn(
              'inline-flex h-8 shrink-0 items-center rounded-button px-3 text-xs font-medium transition-colors',
              statusFilter === status
                ? 'bg-accent text-accent-text'
                : 'bg-surface-secondary text-text-hint',
            )}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/* View mode toggle + count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-hint">
          {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={() => setGroupByCompany(!groupByCompany)}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-button px-3 text-xs font-medium transition-colors',
            groupByCompany
              ? 'bg-accent text-accent-text'
              : 'bg-surface-secondary text-text-hint',
          )}
        >
          <Building2 className="h-3.5 w-3.5" />
          Group by Company
        </button>
      </div>

      {/* No matching leads (filters active but no results) */}
      {filteredLeads.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-card bg-surface-secondary/30 p-6 text-center">
          <Filter className="h-6 w-6 text-text-hint" />
          <p className="text-sm font-medium text-text-secondary">
            No matching leads
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
            }}
            className="text-xs font-medium text-accent"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Flat mode (default) */}
      {!groupByCompany && filteredLeads.length > 0 && (
        <div className="space-y-2">
          {filteredLeads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onSelectLead(lead.id)}
            />
          ))}
        </div>
      )}

      {/* Grouped mode */}
      {groupByCompany && companyGroups && filteredLeads.length > 0 && (
        <div className="space-y-3">
          {companyGroups.map(({ company, leads: groupLeads }) => (
            <div key={company}>
              <button
                type="button"
                onClick={() => toggleCompany(company)}
                className="flex w-full items-center gap-2 py-2 text-left"
              >
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-text-hint transition-transform',
                    !collapsedCompanies.has(company) && 'rotate-90',
                  )}
                />
                <span className="text-sm font-semibold text-text">
                  {company}
                </span>
                <Badge variant="default" size="sm">
                  {groupLeads.length}
                </Badge>
              </button>
              {!collapsedCompanies.has(company) && (
                <div className="space-y-2 pl-6">
                  {groupLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => onSelectLead(lead.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
