/**
 * Detailed view of an individual rep's performance (QW #7).
 *
 * Shown when an admin taps a member row in the MemberLeaderboard.
 * Fetches recent attempts and lead count for the selected user,
 * and displays stats alongside the data already available from the
 * leaderboard entry.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Trophy, Target, Flame, Briefcase } from 'lucide-react';
import { Card, Badge, Skeleton } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import { getInsforge } from '@/lib/insforge';

interface RepDetailViewProps {
  user: {
    id: number;
    telegram_id: number;
    username: string | null;
    first_name: string | null;
    total_xp: number;
    current_level: number;
  };
  avgScore: number;
  onBack: () => void;
}

interface RepAttempt {
  scenario_id: string;
  score: number;
  mode: string;
  created_at: string | null;
}

function useRepAttempts(telegramId: number) {
  return useQuery({
    queryKey: ['admin', 'repDetail', telegramId, 'attempts'],
    queryFn: async (): Promise<RepAttempt[]> => {
      const { data, error } = await getInsforge()
        .database.from('attempts')
        .select('scenario_id, score, mode, created_at')
        .eq('telegram_id', telegramId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data ?? []) as RepAttempt[];
    },
  });
}

function useRepLeadCount(telegramId: number) {
  return useQuery({
    queryKey: ['admin', 'repDetail', telegramId, 'leadCount'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await getInsforge()
        .database.from('lead_registry')
        .select('id', { count: 'exact', head: true })
        .eq('telegram_id', telegramId);

      if (error) throw error;
      return count ?? 0;
    },
  });
}

function useRepStreak(telegramId: number) {
  return useQuery({
    queryKey: ['admin', 'repDetail', telegramId, 'streak'],
    queryFn: async (): Promise<number> => {
      const { data, error } = await getInsforge()
        .database.from('users')
        .select('streak_days')
        .eq('telegram_id', telegramId)
        .single();

      if (error) throw error;
      return (data as { streak_days: number })?.streak_days ?? 0;
    },
  });
}

function formatRelativeDate(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-error';
}

export function RepDetailView({ user, avgScore, onBack }: RepDetailViewProps) {
  const displayName = user.first_name || user.username || `User ${user.telegram_id}`;
  const { data: attempts, isLoading: attemptsLoading } = useRepAttempts(user.telegram_id);
  const { data: leadCount, isLoading: leadCountLoading } = useRepLeadCount(user.telegram_id);
  const { data: streakDays, isLoading: streakLoading } = useRepStreak(user.telegram_id);

  return (
    <div className="space-y-3">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors active:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to leaderboard
      </button>

      {/* Header card */}
      <Card>
        <div className="space-y-3">
          <p className="text-sm font-bold text-text">{displayName}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-accent" />
              <div>
                <p className="text-xs text-text-hint">XP</p>
                <p className="text-sm font-semibold text-text">
                  {user.total_xp.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" />
              <div>
                <p className="text-xs text-text-hint">Avg Score</p>
                <p className={cn('text-sm font-semibold', scoreColor(avgScore))}>
                  {Math.round(avgScore)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-warning" />
              <div>
                <p className="text-xs text-text-hint">Streak</p>
                {streakLoading ? (
                  <Skeleton height={18} width={32} />
                ) : (
                  <p className="text-sm font-semibold text-text">
                    {streakDays ?? 0} days
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-info" />
              <div>
                <p className="text-xs text-text-hint">Leads</p>
                {leadCountLoading ? (
                  <Skeleton height={18} width={32} />
                ) : (
                  <p className="text-sm font-semibold text-text">{leadCount ?? 0}</p>
                )}
              </div>
            </div>
          </div>

          {/* Level badge */}
          <div className="flex items-center gap-2">
            <Badge variant="brand" size="sm">
              Level {user.current_level}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Recent attempts */}
      <Card>
        <h4 className="mb-3 text-sm font-semibold text-text">Recent Attempts</h4>

        {attemptsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} height={32} />
            ))}
          </div>
        ) : !attempts || attempts.length === 0 ? (
          <p className="text-sm text-text-hint">No attempts yet</p>
        ) : (
          <div className="space-y-2">
            {attempts.map((attempt, idx) => (
              <div
                key={`${attempt.scenario_id}-${idx}`}
                className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 px-3 py-2"
              >
                {/* Scenario (truncated) */}
                <span className="flex-1 truncate text-xs text-text-secondary">
                  {attempt.scenario_id.length > 24
                    ? `${attempt.scenario_id.slice(0, 24)}...`
                    : attempt.scenario_id}
                </span>

                {/* Mode badge */}
                <Badge variant="default" size="sm">
                  {attempt.mode}
                </Badge>

                {/* Score */}
                <span className={cn('text-sm font-semibold', scoreColor(attempt.score))}>
                  {attempt.score}
                </span>

                {/* Relative date */}
                <span className="text-xs text-text-hint">
                  {formatRelativeDate(attempt.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
