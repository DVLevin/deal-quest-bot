/**
 * Hook to fetch assignments for a specific lead with user display names.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { queryKeys } from '@/lib/queries';
import type { UserRow } from '@/types';

export interface AssignmentEntry {
  id: number;
  telegramId: number;
  displayName: string;
  assignedBy: number;
  createdAt: string | null;
}

export function useLeadAssignments(leadId: number) {
  return useQuery({
    queryKey: queryKeys.admin.leadAssignments(leadId),
    queryFn: async (): Promise<AssignmentEntry[]> => {
      const db = getInsforge().database;

      const [assignmentsResult, usersResult] = await Promise.all([
        db
          .from('lead_assignments')
          .select('id, lead_id, telegram_id, assigned_by, created_at')
          .eq('lead_id', leadId),
        db
          .from('users')
          .select('telegram_id, username, first_name')
          .limit(50),
      ]);

      if (assignmentsResult.error) throw assignmentsResult.error;
      if (usersResult.error) throw usersResult.error;

      const assignments = (assignmentsResult.data ?? []) as {
        id: number;
        lead_id: number;
        telegram_id: number;
        assigned_by: number;
        created_at: string | null;
      }[];

      const users = (usersResult.data ?? []) as Pick<UserRow, 'telegram_id' | 'username' | 'first_name'>[];

      const nameMap = new Map<number, string>();
      for (const u of users) {
        nameMap.set(u.telegram_id, u.first_name || u.username || `User ${u.telegram_id}`);
      }

      return assignments.map((a) => ({
        id: a.id,
        telegramId: a.telegram_id,
        displayName: nameMap.get(a.telegram_id) ?? `User ${a.telegram_id}`,
        assignedBy: a.assigned_by,
        createdAt: a.created_at,
      }));
    },
    enabled: leadId > 0,
    staleTime: 60_000,
  });
}
