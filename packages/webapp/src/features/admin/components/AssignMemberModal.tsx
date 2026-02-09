/**
 * Modal for assigning/unassigning team members to a lead.
 *
 * Shows all team members with toggle buttons. The lead owner and
 * already-assigned members are indicated.
 */

import { X, UserCheck, UserPlus } from 'lucide-react';
import { Skeleton } from '@/shared/ui';
import { useTeamLeaderboard } from '../hooks/useTeamLeaderboard';
import { useAssignLead, useUnassignLead } from '../hooks/useAssignLead';
import type { AssignmentEntry } from '../hooks/useLeadAssignments';

interface AssignMemberModalProps {
  leadId: number;
  ownerTelegramId: number;
  existingAssignments: AssignmentEntry[];
  onClose: () => void;
}

export function AssignMemberModal({
  leadId,
  ownerTelegramId,
  existingAssignments,
  onClose,
}: AssignMemberModalProps) {
  const { data: members, isLoading } = useTeamLeaderboard();
  const assign = useAssignLead();
  const unassign = useUnassignLead();

  const assignedIds = new Set(existingAssignments.map((a) => a.telegramId));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="card-slide-up w-full max-w-lg rounded-t-2xl bg-surface pb-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-text">Assign Members</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-text-hint transition-colors active:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Member list */}
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} height={44} />
              ))}
            </div>
          ) : !members || members.length === 0 ? (
            <p className="py-4 text-center text-sm text-text-hint">No team members found.</p>
          ) : (
            <div className="space-y-2">
              {members.map((entry) => {
                const tid = entry.user.telegram_id;
                const isOwner = tid === ownerTelegramId;
                const isAssigned = assignedIds.has(tid);
                const displayName = entry.user.first_name || entry.user.username || `User ${tid}`;
                const isPending = assign.isPending || unassign.isPending;

                return (
                  <div
                    key={tid}
                    className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 px-3 py-2.5"
                  >
                    <span className="flex-1 text-sm text-text">{displayName}</span>

                    {isOwner ? (
                      <span className="text-xs text-text-hint">Owner</span>
                    ) : isAssigned ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => unassign.mutate({ leadId, telegramId: tid })}
                        className="flex items-center gap-1 rounded-md bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent transition-colors active:bg-accent/25 disabled:opacity-50"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Assigned
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => assign.mutate({ leadId, telegramId: tid, memberName: displayName })}
                        className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors active:bg-surface-secondary disabled:opacity-50"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
