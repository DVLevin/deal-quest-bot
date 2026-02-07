/**
 * Leads page with nested sub-routes.
 *
 * Two views:
 * - Index: Lead list with status badges
 * - Detail: Full lead detail with status management (:leadId)
 *
 * Uses the /leads/* wildcard route from Router.tsx.
 */

import { Routes, Route, useNavigate, Navigate } from 'react-router';
import { Users } from 'lucide-react';
import { LeadList } from '@/features/leads/components/LeadList';
import { LeadDetail } from '@/features/leads/components/LeadDetail';

// ---------------------------------------------------------------------------
// LeadListView (index route)
// ---------------------------------------------------------------------------

function LeadListView() {
  const navigate = useNavigate();
  return <LeadList onSelectLead={(id) => navigate(`/leads/${id}`)} />;
}

// ---------------------------------------------------------------------------
// LeadDetailView (:leadId route)
// ---------------------------------------------------------------------------

function LeadDetailView() {
  return <LeadDetail />;
}

// ---------------------------------------------------------------------------
// Leads page (root with nested routes)
// ---------------------------------------------------------------------------

export default function Leads() {
  return (
    <div className="space-y-4 px-4 pt-4 pb-24">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
          <Users className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="text-overline">Pipeline</p>
          <h1 className="text-lg font-bold text-text">Your Leads</h1>
        </div>
      </div>

      <Routes>
        <Route index element={<LeadListView />} />
        <Route path=":leadId" element={<LeadDetailView />} />
        <Route path="*" element={<Navigate to="/leads" replace />} />
      </Routes>
    </div>
  );
}
