/**
 * Chronological activity timeline for a lead.
 *
 * Displays activity log entries with type-specific icons and colors:
 * - status_change: ArrowRightLeft (blue)
 * - context_update: StickyNote (green)
 * - screenshot_comment: Camera (purple)
 * - ai_advice: Sparkles (amber)
 * - followup_sent: Send (brand/accent)
 * - default: Clock (gray)
 */

import {
  ArrowRightLeft,
  StickyNote,
  Camera,
  Sparkles,
  Send,
  Clock,
} from 'lucide-react';
import { Skeleton } from '@/shared/ui';
import { useLeadActivities } from '../hooks/useLeadActivities';
import { formatLeadDate } from '../types';
import type { LeadActivityRow } from '@/types/tables';
import type { ComponentType } from 'react';

// ---------------------------------------------------------------------------
// Activity type icon/color mapping
// ---------------------------------------------------------------------------

interface ActivityStyle {
  icon: ComponentType<{ className?: string }>;
  bgColor: string;
  iconColor: string;
}

const ACTIVITY_STYLES: Record<string, ActivityStyle> = {
  status_change: {
    icon: ArrowRightLeft,
    bgColor: 'bg-blue-500/15',
    iconColor: 'text-blue-500',
  },
  context_update: {
    icon: StickyNote,
    bgColor: 'bg-green-500/15',
    iconColor: 'text-green-500',
  },
  screenshot_comment: {
    icon: Camera,
    bgColor: 'bg-purple-500/15',
    iconColor: 'text-purple-500',
  },
  ai_advice: {
    icon: Sparkles,
    bgColor: 'bg-amber-500/15',
    iconColor: 'text-amber-500',
  },
  followup_sent: {
    icon: Send,
    bgColor: 'bg-accent/15',
    iconColor: 'text-accent',
  },
};

const DEFAULT_STYLE: ActivityStyle = {
  icon: Clock,
  bgColor: 'bg-surface-secondary',
  iconColor: 'text-text-hint',
};

function getActivityStyle(activityType: string): ActivityStyle {
  return ACTIVITY_STYLES[activityType] ?? DEFAULT_STYLE;
}

// ---------------------------------------------------------------------------
// ActivityTimeline
// ---------------------------------------------------------------------------

export function ActivityTimeline({ leadId }: { leadId: number }) {
  const { data: activities, isLoading } = useLeadActivities(leadId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton height={32} width={32} />
            <div className="flex-1 space-y-1">
              <Skeleton height={16} width="80%" />
              <Skeleton height={12} width="40%" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <p className="text-sm text-text-hint">No activity recorded yet.</p>
    );
  }

  return (
    <div className="relative">
      {activities.map((activity, index) => (
        <ActivityEntry
          key={activity.id}
          activity={activity}
          isLast={index === activities.length - 1}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single activity entry
// ---------------------------------------------------------------------------

function ActivityEntry({
  activity,
  isLast,
}: {
  activity: LeadActivityRow;
  isLast: boolean;
}) {
  const style = getActivityStyle(activity.activity_type);
  const Icon = style.icon;

  return (
    <div className="relative flex gap-3 pb-4">
      {/* Vertical connector line */}
      {!isLast && (
        <div className="absolute left-4 top-8 bottom-0 w-px border-l-2 border-surface-secondary" />
      )}

      {/* Icon circle */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.bgColor}`}
      >
        <Icon className={`h-3.5 w-3.5 ${style.iconColor}`} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text">{activity.content}</p>

        {/* AI response if present */}
        {activity.ai_response && (
          <div className="mt-1.5 rounded-lg bg-surface-secondary/30 p-2">
            <p className="text-xs text-text-secondary">
              {activity.ai_response}
            </p>
          </div>
        )}

        {/* Timestamp */}
        <p className="mt-1 text-xs text-text-hint">
          {formatLeadDate(activity.created_at)}
        </p>
      </div>
    </div>
  );
}
