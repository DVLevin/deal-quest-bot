/**
 * Hooks for fetching and filtering casebook entries.
 *
 * useCasebook: Filtered and searched casebook entries from InsForge.
 *   - Supports keyword search across text fields via PostgREST ilike
 *   - Supports eq filters for persona type, scenario type, and industry
 *   - "My Entries" toggle filters by created_from_user when enabled
 *   - Default: team-wide (all entries), not user-specific
 *
 * useCasebookFilterOptions: Unique filter values extracted from all entries.
 *   - Deduplicates persona_type, scenario_type, industry client-side
 *   - 5-minute staleTime since filter options rarely change
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import type { CasebookRow } from '@/types/tables';

interface UseCasebookOptions {
  keyword?: string;
  personaType?: string;
  scenarioType?: string;
  industry?: string;
  showMyOnly?: boolean;
}

/**
 * Escape PostgREST ilike special characters (% and _).
 */
function escapeIlike(term: string): string {
  return term.replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function useCasebook(options: UseCasebookOptions = {}) {
  const { keyword, personaType, scenarioType, industry, showMyOnly } = options;
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.casebook.list({
      keyword,
      personaType,
      scenarioType,
      industry,
      showMyOnly,
    }),
    queryFn: async (): Promise<CasebookRow[]> => {
      let query = getInsforge().database.from('casebook').select('*');

      // "My Entries" filter: restrict to current user's entries
      if (showMyOnly && telegramId) {
        query = query.eq('created_from_user', telegramId);
      }

      // Keyword search across text fields via PostgREST .or() with ilike
      if (keyword && keyword.trim().length > 0) {
        const escaped = escapeIlike(keyword.trim());
        query = query.or(
          `persona_type.ilike.%${escaped}%,scenario_type.ilike.%${escaped}%,industry.ilike.%${escaped}%,prospect_analysis.ilike.%${escaped}%,draft_response.ilike.%${escaped}%`,
        );
      }

      // Exact filters for dropdown/chip selections
      if (personaType) {
        query = query.eq('persona_type', personaType);
      }
      if (scenarioType) {
        query = query.eq('scenario_type', scenarioType);
      }
      if (industry) {
        query = query.eq('industry', industry);
      }

      // Order by quality score descending, limit to 50
      query = query.order('quality_score', { ascending: false }).limit(50);

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as CasebookRow[];
    },
    enabled: true,
  });
}

export function useCasebookFilterOptions() {
  return useQuery({
    queryKey: queryKeys.casebook.filterOptions,
    queryFn: async (): Promise<{
      personaTypes: string[];
      scenarioTypes: string[];
      industries: string[];
    }> => {
      const { data, error } = await getInsforge()
        .database.from('casebook')
        .select('persona_type, scenario_type, industry');

      if (error) throw error;

      const rows = (data ?? []) as Array<{
        persona_type: string;
        scenario_type: string;
        industry: string | null;
      }>;

      const personaSet = new Set<string>();
      const scenarioSet = new Set<string>();
      const industrySet = new Set<string>();

      for (const row of rows) {
        if (row.persona_type) personaSet.add(row.persona_type);
        if (row.scenario_type) scenarioSet.add(row.scenario_type);
        if (row.industry) industrySet.add(row.industry);
      }

      return {
        personaTypes: Array.from(personaSet).sort(),
        scenarioTypes: Array.from(scenarioSet).sort(),
        industries: Array.from(industrySet).sort(),
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes -- filter options rarely change
  });
}
