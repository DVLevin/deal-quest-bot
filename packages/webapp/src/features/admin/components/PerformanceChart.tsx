/**
 * SVG bar chart showing weekly score trends (ADMIN-02).
 *
 * Groups recent attempts by week, computes average score per week,
 * and renders a hand-coded SVG bar chart. No charting library used.
 *
 * Displays the last 6 weeks of data with rounded bars and week labels.
 */

import { Card, Skeleton } from '@/shared/ui';
import { useTeamStats } from '@/features/admin/hooks/useTeamStats';

interface WeekBucket {
  label: string;
  avgScore: number;
}

function getWeekLabel(date: Date): string {
  const month = date.toLocaleString('en-US', { month: 'short' });
  return `${month} ${date.getDate()}`;
}

function getWeekStart(date: Date): number {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function bucketByWeek(
  attempts: { score: number; created_at: string | null }[],
): WeekBucket[] {
  const now = new Date();
  const sixWeeksAgo = new Date(now);
  sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);

  // Create week buckets for the last 6 weeks
  const weekMap = new Map<number, number[]>();
  const weekStarts: number[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const start = getWeekStart(d);
    if (!weekMap.has(start)) {
      weekMap.set(start, []);
      weekStarts.push(start);
    }
  }

  // Assign attempts to week buckets
  for (const a of attempts) {
    if (!a.created_at) continue;
    const attemptDate = new Date(a.created_at);
    if (attemptDate < sixWeeksAgo) continue;

    const weekStart = getWeekStart(attemptDate);
    const bucket = weekMap.get(weekStart);
    if (bucket) {
      bucket.push(a.score);
    }
  }

  // Deduplicate and sort week starts
  const uniqueStarts = [...new Set(weekStarts)].sort((a, b) => a - b);

  return uniqueStarts.map((start) => {
    const scores = weekMap.get(start) ?? [];
    const avgScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;
    return {
      label: getWeekLabel(new Date(start)),
      avgScore,
    };
  });
}

export function PerformanceChart() {
  const { data, isLoading } = useTeamStats();

  if (isLoading) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Weekly Performance</h3>
        <Skeleton height={128} />
      </Card>
    );
  }

  const attempts = data?.recentAttempts ?? [];
  const weeks = bucketByWeek(attempts);
  const hasData = weeks.some((w) => w.avgScore > 0);

  if (!hasData) {
    return (
      <Card>
        <h3 className="mb-3 text-sm font-semibold text-text">Weekly Performance</h3>
        <div className="flex h-32 items-center justify-center">
          <p className="text-sm text-text-hint">No performance data yet</p>
        </div>
      </Card>
    );
  }

  const maxScore = 100;
  const barCount = weeks.length;
  const barWidth = 100 / barCount;
  const barPadding = barWidth * 0.2;
  const actualBarWidth = barWidth - barPadding * 2;
  const chartHeight = 45;
  const labelY = 58;

  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-text">Weekly Performance</h3>
      <svg viewBox="0 0 100 64" className="h-32 w-full" role="img" aria-label="Weekly performance bar chart">
        {/* Baseline */}
        <line x1="0" y1={chartHeight} x2="100" y2={chartHeight} stroke="var(--color-border)" strokeWidth="0.3" />

        {weeks.map((week, i) => {
          const barHeight = (week.avgScore / maxScore) * chartHeight;
          const x = i * barWidth + barPadding;
          const y = chartHeight - barHeight;

          return (
            <g key={week.label}>
              {/* Bar */}
              {barHeight > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={actualBarWidth}
                  height={barHeight}
                  rx={1.5}
                  fill="var(--color-accent)"
                  opacity={0.85}
                />
              )}

              {/* Score label above bar */}
              {week.avgScore > 0 && (
                <text
                  x={x + actualBarWidth / 2}
                  y={y - 2}
                  textAnchor="middle"
                  fontSize="3.5"
                  fill="var(--color-text-secondary)"
                >
                  {Math.round(week.avgScore)}
                </text>
              )}

              {/* Week label */}
              <text
                x={x + actualBarWidth / 2}
                y={labelY}
                textAnchor="middle"
                fontSize="3"
                fill="var(--color-text-hint)"
              >
                {week.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Card>
  );
}
