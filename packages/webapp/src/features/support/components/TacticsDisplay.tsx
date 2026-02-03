/**
 * Engagement tactics display with LinkedIn actions, comment suggestion, and timing.
 *
 * Shows actionable engagement steps: LinkedIn profile actions as a bulleted
 * list, a suggested comment for posts/content, and timing recommendations.
 */

import { Card } from '@/shared/ui';
import { Linkedin, MessageCircle, Clock } from 'lucide-react';
import type { EngagementTactics } from '../types';

interface TacticsDisplayProps {
  tactics: EngagementTactics;
}

export function TacticsDisplay({ tactics }: TacticsDisplayProps) {
  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Linkedin className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text">Engagement Tactics</h3>
      </div>

      {/* LinkedIn actions */}
      {tactics.linkedin_actions.length > 0 && (
        <Card padding="sm" className="space-y-1.5">
          <p className="text-xs font-medium text-text-secondary">
            LinkedIn Actions
          </p>
          <ul className="space-y-1">
            {tactics.linkedin_actions.map((action, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-text">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/50" />
                {action}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Comment suggestion */}
      {tactics.comment_suggestion && (
        <Card padding="sm">
          <div className="flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5 text-text-secondary" />
            <p className="text-xs font-medium text-text-secondary">
              Comment Suggestion
            </p>
          </div>
          <p className="mt-1 rounded-lg bg-surface-secondary/50 p-2 text-sm italic text-text">
            &ldquo;{tactics.comment_suggestion}&rdquo;
          </p>
        </Card>
      )}

      {/* Timing */}
      {tactics.timing && (
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-hint" />
          <div>
            <p className="text-xs font-medium text-text-secondary">Timing</p>
            <p className="text-sm text-text">{tactics.timing}</p>
          </div>
        </div>
      )}
    </div>
  );
}
