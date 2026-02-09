/**
 * Admin lead detail view with assignment management.
 *
 * Shows lead header info, the list of assigned members (with the owner
 * always shown first and not removable), and a button to open the
 * AssignMemberModal.
 */

import { useState } from 'react';
import { ArrowLeft, User, UserPlus, X, ExternalLink } from 'lucide-react';
import { Card, Badge, Skeleton } from '@/shared/ui';
import { LEAD_STATUS_CONFIG, PIPELINE_ACCENT, formatLeadDate } from '@/features/leads/types';
import { useLeadAssignments } from '../hooks/useLeadAssignments';
import { useUnassignLead } from '../hooks/useAssignLead';
import { AssignMemberModal } from './AssignMemberModal';
import type { LeadListItem } from '@/features/leads/hooks/useLeads';
import type { LeadStatus } from '@/types/enums';

interface AdminLeadDetailProps {
  lead: LeadListItem;
  ownerTelegramId: number;
  ownerName: string;
  onBack: () => void;
}

export function AdminLeadDetail({ lead, ownerTelegramId, ownerName, onBack }: AdminLeadDetailProps) {
  const { data: assignments, isLoading: assignmentsLoading } = useLeadAssignments(lead.id);
  const unassign = useUnassignLead();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const statusConfig = LEAD_STATUS_CONFIG[lead.status as LeadStatus];

  const displayName = lead.prospect_first_name && lead.prospect_last_name
    ? `${lead.prospect_first_name} ${lead.prospect_last_name}`
    : lead.prospect_name ?? 'Unknown Prospect';

  return (
    <div className="space-y-3">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-text-secondary transition-colors active:text-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pipeline
      </button>

      {/* Lead header */}
      <Card>
        <div className="flex items-start gap-3">
          {/* Color bar */}
          <div
            className="mt-1 h-12 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: PIPELINE_ACCENT[lead.status as LeadStatus] ?? 'transparent' }}
          />

          {/* Photo */}
          <div className="shrink-0">
            {lead.photo_url ? (
              <img
                src={lead.photo_url}
                alt={displayName}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                <User className="h-5 w-5 text-accent" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text">{displayName}</p>
            {(lead.prospect_company || lead.prospect_title) && (
              <p className="truncate text-xs text-text-secondary">
                {[lead.prospect_title, lead.prospect_company].filter(Boolean).join(' @ ')}
              </p>
            )}
            <div className="mt-1 flex items-center gap-2">
              {statusConfig && (
                <Badge variant={statusConfig.variant} size="sm">
                  {statusConfig.label}
                </Badge>
              )}
              <span className="text-xs text-text-hint">
                Owner: {ownerName}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-hint">
              Updated {formatLeadDate(lead.updated_at ?? lead.created_at ?? null)}
            </p>
          </div>
        </div>
      </Card>

      {/* Assigned Members */}
      <Card>
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text">Assigned Members</h4>
          <button
            type="button"
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-1 rounded-md bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent transition-colors active:bg-accent/25"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Assign
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {/* Owner is always shown first */}
          <div className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15">
              <User className="h-3.5 w-3.5 text-accent" />
            </div>
            <span className="flex-1 text-sm text-text">{ownerName}</span>
            <Badge variant="default" size="sm">Owner</Badge>
          </div>

          {/* Assigned members */}
          {assignmentsLoading ? (
            <div className="space-y-2">
              <Skeleton height={36} />
              <Skeleton height={36} />
            </div>
          ) : assignments && assignments.length > 0 ? (
            assignments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg bg-surface-secondary/50 px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-info/15">
                  <User className="h-3.5 w-3.5 text-info" />
                </div>
                <span className="flex-1 text-sm text-text">{a.displayName}</span>
                <button
                  type="button"
                  onClick={() => unassign.mutate({ leadId: lead.id, telegramId: a.telegramId })}
                  disabled={unassign.isPending}
                  className="rounded-md p-1 text-text-hint transition-colors hover:text-error active:text-error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-xs text-text-hint">No additional members assigned.</p>
          )}
        </div>
      </Card>

      {/* Link to full lead detail */}
      <a
        href={`/leads/${lead.id}`}
        className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-accent transition-colors active:bg-surface-secondary"
      >
        <ExternalLink className="h-4 w-4" />
        Open Full Detail
      </a>

      {/* Assign modal */}
      {showAssignModal && (
        <AssignMemberModal
          leadId={lead.id}
          ownerTelegramId={ownerTelegramId}
          existingAssignments={assignments ?? []}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
}
