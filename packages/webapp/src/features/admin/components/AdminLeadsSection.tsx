/**
 * Admin pipeline view showing ALL leads from all team members.
 *
 * Supports grouping by owner or by status. Clicking a lead opens
 * AdminLeadDetail for assignment management.
 */

import { useState, useMemo } from 'react';
import { Briefcase, ChevronDown, ChevronRight, User } from 'lucide-react';
import { Card, Badge, Skeleton, ErrorCard } from '@/shared/ui';
import { useAdminLeads, type AdminLeadItem } from '../hooks/useAdminLeads';
import { AdminLeadDetail } from './AdminLeadDetail';
import { LEAD_STATUS_CONFIG, PIPELINE_ACCENT, computePlanProgress } from '@/features/leads/types';
import { ProgressBar } from '@/shared/ui';
import type { LeadStatus } from '@/types/enums';

type GroupMode = 'owner' | 'status';

interface GroupedLeads {
  key: string;
  label: string;
  count: number;
  leads: AdminLeadItem[];
}

function groupByOwner(leads: AdminLeadItem[]): GroupedLeads[] {
  const map = new Map<string, AdminLeadItem[]>();
  for (const lead of leads) {
    const key = lead.ownerName;
    const arr = map.get(key);
    if (arr) arr.push(lead);
    else map.set(key, [lead]);
  }
  return Array.from(map.entries())
    .map(([label, items]) => ({
      key: label,
      label,
      count: items.length,
      leads: items,
    }))
    .sort((a, b) => b.count - a.count);
}

function groupByStatus(leads: AdminLeadItem[]): GroupedLeads[] {
  const map = new Map<string, AdminLeadItem[]>();
  for (const lead of leads) {
    const key = lead.status;
    const arr = map.get(key);
    if (arr) arr.push(lead);
    else map.set(key, [lead]);
  }

  const statusOrder = ['analyzed', 'reached_out', 'meeting_booked', 'in_progress', 'closed_won', 'closed_lost'];
  return statusOrder
    .filter((s) => map.has(s))
    .map((s) => {
      const items = map.get(s)!;
      const config = LEAD_STATUS_CONFIG[s as LeadStatus];
      return {
        key: s,
        label: config?.label ?? s,
        count: items.length,
        leads: items,
      };
    });
}

function MiniLeadCard({ lead, onClick }: { lead: AdminLeadItem; onClick: () => void }) {
  const statusConfig = LEAD_STATUS_CONFIG[lead.status as LeadStatus];
  const progress = computePlanProgress(lead.engagement_plan, null);

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg bg-surface-secondary/50 px-3 py-2.5 text-left transition-colors active:bg-surface-secondary"
    >
      {/* Color bar */}
      <div
        className="h-10 w-1 shrink-0 rounded-full"
        style={{ backgroundColor: PIPELINE_ACCENT[lead.status as LeadStatus] ?? 'transparent' }}
      />

      {/* Photo or avatar */}
      <div className="shrink-0">
        {lead.photo_url ? (
          <img
            src={lead.photo_url}
            alt={lead.prospect_name ?? 'Prospect'}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15">
            <User className="h-4 w-4 text-accent" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">
          {lead.prospect_first_name && lead.prospect_last_name
            ? `${lead.prospect_first_name} ${lead.prospect_last_name}`
            : lead.prospect_name ?? 'Unknown'}
        </p>
        <p className="truncate text-xs text-text-secondary">
          {[lead.prospect_title, lead.prospect_company].filter(Boolean).join(' @ ')}
        </p>
        <p className="text-xs text-text-hint">{lead.ownerName}</p>
      </div>

      {/* Progress mini */}
      {progress.total > 0 && (
        <div className="w-16 shrink-0">
          <ProgressBar current={progress.completed} max={progress.total} size="sm" showLabel={false} />
          <p className="mt-0.5 text-center text-[10px] text-text-hint">
            {progress.completed}/{progress.total}
          </p>
        </div>
      )}

      {/* Status */}
      {statusConfig && (
        <Badge variant={statusConfig.variant} size="sm" className="shrink-0">
          {statusConfig.label}
        </Badge>
      )}

      <ChevronRight className="h-4 w-4 shrink-0 text-text-hint" />
    </button>
  );
}

function LeadGroup({ group, onSelectLead }: { group: GroupedLeads; onSelectLead: (lead: AdminLeadItem) => void }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 py-1.5 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-text-hint" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-text-hint" />
        )}
        <span className="text-xs font-semibold text-text-secondary">
          {group.label}
        </span>
        <span className="text-xs text-text-hint">({group.count})</span>
      </button>
      {expanded && (
        <div className="space-y-1.5 pl-1">
          {group.leads.map((lead) => (
            <MiniLeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onSelectLead(lead)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminLeadsSection() {
  const { data: leads, isLoading, isError, refetch } = useAdminLeads();
  const [groupMode, setGroupMode] = useState<GroupMode>('owner');
  const [selectedLead, setSelectedLead] = useState<AdminLeadItem | null>(null);

  const groups = useMemo(() => {
    if (!leads || leads.length === 0) return [];
    return groupMode === 'owner' ? groupByOwner(leads) : groupByStatus(leads);
  }, [leads, groupMode]);

  if (selectedLead) {
    return (
      <AdminLeadDetail
        lead={selectedLead}
        ownerTelegramId={selectedLead.telegram_id}
        ownerName={selectedLead.ownerName}
        onBack={() => setSelectedLead(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text">Team Pipeline</h3>
        </div>
        <div className="mt-3 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={48} />
          ))}
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text">Team Pipeline</h3>
        </div>
        <ErrorCard message="Unable to load leads" onRetry={refetch} compact />
      </Card>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text">Team Pipeline</h3>
        </div>
        <p className="mt-2 text-sm text-text-hint">No leads from any team members yet.</p>
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-text">Team Pipeline</h3>
          <span className="text-xs text-text-hint">({leads.length})</span>
        </div>

        {/* Group toggle */}
        <select
          value={groupMode}
          onChange={(e) => setGroupMode(e.target.value as GroupMode)}
          className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-secondary"
        >
          <option value="owner">By Owner</option>
          <option value="status">By Status</option>
        </select>
      </div>

      <div className="space-y-3 px-4 pb-4">
        {groups.map((group) => (
          <LeadGroup
            key={group.key}
            group={group}
            onSelectLead={setSelectedLead}
          />
        ))}
      </div>
    </Card>
  );
}
