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
    <div className="space-y-4 px-4 pt-4 pb-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-accent" />
        <h1 className="text-xl font-bold text-text">Leads</h1>
      </div>

      <Routes>
        <Route index element={<LeadListView />} />
        <Route path=":leadId" element={<LeadDetailView />} />
        <Route path="*" element={<Navigate to="/leads" replace />} />
      </Routes>
    </div>
  );
}
