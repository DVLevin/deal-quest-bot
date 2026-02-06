/**
 * Dashboard card showing today's actions across all leads.
 *
 * Aggregates overdue and due-today engagement plan steps using useTodayActions.
 * Each action item navigates to /leads/:id?step=:stepId for quick execution.
 *
 * Follows existing dashboard widget patterns (ProgressCard, WeakAreasCard).
 *
 * TMAUX-V20-04: Dashboard Today's Actions widget
 */

import { ListTodo, ChevronRight, AlertCircle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card, Badge, Skeleton, ErrorCard } from '@/shared/ui';
import { useTodayActions } from '@/features/leads/hooks/useTodayActions';

export function TodayActionsCard() {
  const navigate = useNavigate();
  const { data: actions, isLoading, isError, refetch } = useTodayActions();

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </Card>
    );
  }

  if (isError) {
    return <ErrorCard message="Unable to load actions" onRetry={refetch} compact />;
  }

  if (!actions || actions.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-text-secondary">
          <ListTodo className="h-5 w-5" />
          <span className="text-sm font-medium">Today's Actions</span>
        </div>
        <p className="mt-2 text-sm text-text-hint">No actions due today. Great job!</p>
      </Card>
    );
  }

  const overdueCount = actions.filter((a) => a.isOverdue).length;
  const dueTodayCount = actions.filter((a) => a.isDueToday && !a.isOverdue).length;

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-accent" />
          <span className="text-sm font-semibold text-text">Today's Actions</span>
        </div>
        <div className="flex gap-1">
          {overdueCount > 0 && (
            <Badge variant="error" size="sm">
              <AlertCircle className="mr-1 h-3 w-3" />
              {overdueCount} overdue
            </Badge>
          )}
          {dueTodayCount > 0 && (
            <Badge variant="info" size="sm">
              <Calendar className="mr-1 h-3 w-3" />
              {dueTodayCount} today
            </Badge>
          )}
        </div>
      </div>

      {/* Action list (show up to 5) */}
      <div className="mt-3 space-y-2">
        {actions.slice(0, 5).map((action) => (
          <button
            key={`${action.lead_id}-${action.step_id}`}
            type="button"
            onClick={() => navigate(`/leads/${action.lead_id}?step=${action.step_id}`)}
            className="flex w-full items-center gap-3 rounded-lg bg-surface-secondary/50 p-2 text-left transition-colors active:bg-surface-secondary"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-text">
                  {action.leadName}
                </p>
                {action.isOverdue && (
                  <span className="shrink-0 text-xs text-error">overdue</span>
                )}
              </div>
              <p className="truncate text-xs text-text-secondary">
                {action.stepDescription}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-hint" />
          </button>
        ))}
      </div>

      {/* View all link if more than 5 */}
      {actions.length > 5 && (
        <button
          type="button"
          onClick={() => navigate('/leads')}
          className="mt-2 w-full text-center text-xs text-accent"
        >
          View all {actions.length} actions
        </button>
      )}
    </Card>
  );
}
