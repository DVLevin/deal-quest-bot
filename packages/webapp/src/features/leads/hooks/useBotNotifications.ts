/**
 * Polls for bot-completed async work and shows toast notifications.
 *
 * Checks draft_requests and plan_requests for recently completed items
 * that haven't been seen yet. Shows a toast with a link to navigate
 * to the relevant lead.
 */

import { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { getInsforge } from '@/lib/insforge';
import { useToast } from '@/shared/stores/toastStore';

interface CompletedRequest {
  id: number;
  lead_id: number;
  status: string;
  updated_at: string;
}

export function useBotNotifications(
  telegramId: number | null,
  enabled = true,
) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const seenIds = useRef(new Set<string>());

  // Query for recently completed drafts (last 60 seconds)
  const cutoff = new Date(Date.now() - 60_000).toISOString();

  const { data: completedDrafts } = useQuery({
    queryKey: ['bot-notifications', 'drafts', telegramId],
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('draft_requests')
        .select('id, lead_id, status, updated_at')
        .eq('status', 'completed')
        .eq('telegram_id', telegramId!)
        .gte('updated_at', cutoff)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as CompletedRequest[];
    },
    enabled: enabled && !!telegramId,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const { data: completedPlans } = useQuery({
    queryKey: ['bot-notifications', 'plans', telegramId],
    queryFn: async () => {
      const { data, error } = await getInsforge()
        .database.from('plan_requests')
        .select('id, lead_id, status, updated_at')
        .eq('status', 'completed')
        .eq('telegram_id', telegramId!)
        .gte('updated_at', cutoff)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as CompletedRequest[];
    },
    enabled: enabled && !!telegramId,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  // Show toasts for newly completed items
  useEffect(() => {
    if (completedDrafts) {
      for (const draft of completedDrafts) {
        const key = `draft:${draft.id}`;
        if (seenIds.current.has(key)) continue;
        seenIds.current.add(key);

        toast({
          type: 'info',
          message: 'Draft ready!',
          duration: 6000,
          action: {
            label: 'View',
            onClick: () => navigate(`/leads/${draft.lead_id}`),
          },
        });
      }
    }
  }, [completedDrafts, toast, navigate]);

  useEffect(() => {
    if (completedPlans) {
      for (const plan of completedPlans) {
        const key = `plan:${plan.id}`;
        if (seenIds.current.has(key)) continue;
        seenIds.current.add(key);

        toast({
          type: 'success',
          message: 'Engagement plan ready!',
          duration: 6000,
          action: {
            label: 'View',
            onClick: () => navigate(`/leads/${plan.lead_id}`),
          },
        });
      }
    }
  }, [completedPlans, toast, navigate]);
}
