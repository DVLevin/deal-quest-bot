/**
 * Hook to merge static track data with dynamic track_progress from InsForge.
 *
 * Fetches the user's progress for a given track and merges it with the
 * static level/lesson/scenario data from TRACKS. Handles the case where
 * no track_progress rows exist (new users who haven't used /learn in the bot)
 * by defaulting the first level to 'unlocked' and the rest to 'locked'.
 */

import { useQuery } from '@tanstack/react-query';
import { getInsforge } from '@/lib/insforge';
import { useAuthStore } from '@/features/auth/store';
import { queryKeys } from '@/lib/queries';
import { TRACKS, type TrackLevel } from '../data/tracks';
import type { TrackProgressRow, TrackStatus } from '@deal-quest/shared';

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export interface LevelWithProgress extends TrackLevel {
  status: TrackStatus;
  bestScore: number;
  attemptsCount: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTrackProgress(trackId = 'foundations') {
  const telegramId = useAuthStore((s) => s.telegramId);
  const track = TRACKS[trackId];

  return useQuery({
    queryKey: queryKeys.trackProgress.byTrack(telegramId!, trackId),
    queryFn: async (): Promise<LevelWithProgress[]> => {
      const { data, error } = await getInsforge()
        .database.from('track_progress')
        .select('level_id, status, best_score, attempts_count')
        .eq('telegram_id', telegramId!)
        .eq('track_id', trackId)
        .order('level_id', { ascending: true });

      if (error) throw error;

      const rows = (data ?? []) as TrackProgressRow[];

      // Handle empty track_progress (Pitfall 5): new users who haven't
      // used /learn in the bot will have 0 rows. Default first level to
      // 'unlocked', rest to 'locked', all scores to 0.
      if (rows.length === 0) {
        return track.levels.map((level, index) => ({
          ...level,
          status: (index === 0 ? 'unlocked' : 'locked') as TrackStatus,
          bestScore: 0,
          attemptsCount: 0,
        }));
      }

      const progressMap = new Map(
        rows.map((row) => [row.level_id, row]),
      );

      return track.levels.map((level, index) => {
        const progress = progressMap.get(level.id);
        return {
          ...level,
          status: (progress?.status as TrackStatus) ??
            (index === 0 ? 'unlocked' : 'locked'),
          bestScore: progress?.best_score ?? 0,
          attemptsCount: progress?.attempts_count ?? 0,
        };
      });
    },
    enabled: !!telegramId,
  });
}
