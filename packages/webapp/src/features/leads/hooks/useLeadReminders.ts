/**
 * Batched reminder query for all user leads.
 *
 * Fetches all pending/sent scheduled_reminders in a single query,
 * then groups them by lead_id -> step_id -> due_at for O(1) lookup.
 * Avoids N+1 queries when rendering LeadCard progress in the list.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';

interface ReminderDueInfo {
  lead_id: number;
  step_id: number;
  due_at: string;
  status: string;
}

/**
 * Returns a Map of lead_id -> Map of step_id -> due_at ISO string.
 * Only includes pending/sent reminders (not completed/skipped/cancelled).
 */
export function useLeadReminders() {
  const telegramId = useAuthStore((s) => s.telegramId);

  return useQuery({
    queryKey: queryKeys.leads.reminders(telegramId!),
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('scheduled_reminders')
        .select('lead_id, step_id, due_at, status')
        .eq('telegram_id', telegramId!)
        .in('status', ['pending', 'sent'])
        .order('due_at', { ascending: true });

      if (error) throw error;

      // Group by lead_id: Map<lead_id, Map<step_id, due_at>>
      const byLead = new Map<number, Map<number, string>>();
      for (const r of (data ?? []) as ReminderDueInfo[]) {
        if (!byLead.has(r.lead_id)) {
          byLead.set(r.lead_id, new Map());
        }
        byLead.get(r.lead_id)!.set(r.step_id, r.due_at);
      }
      return byLead;
    },
    enabled: !!telegramId,
    staleTime: 60_000, // 1 minute -- reminders don't change frequently
  });
}
