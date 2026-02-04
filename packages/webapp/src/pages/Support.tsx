/**
 * Support page with nested sub-routes.
 *
 * Three views:
 * - Index (SupportHome): CTA to start analysis + recent sessions list
 * - Session detail: Full structured analysis display
 * - History: Complete session list (reuses useSupportSessions)
 *
 * Uses the /support/* wildcard route from Router.tsx.
 */

import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router';
import { Zap } from 'lucide-react';
import { Skeleton } from '@/shared/ui';
import { SupportInput } from '@/features/support/components/SupportInput';
import { AnalysisDisplay } from '@/features/support/components/AnalysisDisplay';
import { StrategyDisplay } from '@/features/support/components/StrategyDisplay';
import { TacticsDisplay } from '@/features/support/components/TacticsDisplay';
import { DraftDisplay } from '@/features/support/components/DraftDisplay';
import { SessionCard } from '@/features/support/components/SessionCard';
import { useSupportSessions } from '@/features/support/hooks/useSupportSessions';
import { useSupportSession } from '@/features/support/hooks/useSupportSession';
import { parseOutputJson } from '@/features/support/types';

// ---------------------------------------------------------------------------
// SupportHome (index route)
// ---------------------------------------------------------------------------

function SupportHome() {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useSupportSessions();

  return (
    <div className="space-y-6">
      {/* CTA section */}
      <SupportInput />

      {/* Recent sessions */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-secondary">
          Recent Sessions
        </h3>

        {isLoading && (
          <div className="space-y-2">
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </div>
        )}

        {!isLoading && (!sessions || sessions.length === 0) && (
          <div className="flex flex-col items-center gap-2 rounded-card bg-surface-secondary/30 p-6 text-center">
            <p className="text-sm font-medium text-text-secondary">
              No sessions yet — you're starting fresh!
            </p>
            <p className="text-xs text-text-hint">
              Analyze a deal above and your session history will build up here.
              Text, screenshots, voice messages — whatever works for you.
            </p>
          </div>
        )}

        {!isLoading && sessions && sessions.length > 0 && (
          <div className="space-y-2">
            {sessions.slice(0, 5).map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onClick={() => navigate(`/support/session/${session.id}`)}
              />
            ))}
            {sessions.length > 5 && (
              <button
                onClick={() => navigate('/support/history')}
                className="w-full rounded-card py-2 text-center text-sm font-medium text-accent transition-colors hover:bg-accent/5"
              >
                View all sessions
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SessionDetail (session/:sessionId route)
// ---------------------------------------------------------------------------

function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const numericId = Number(sessionId);

  const { data: session, isLoading } = useSupportSession(
    Number.isNaN(numericId) ? 0 : numericId,
  );

  if (Number.isNaN(numericId)) {
    return <Navigate to="/support" replace />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton height={28} width="60%" />
        <Skeleton height={120} />
        <Skeleton height={120} />
        <Skeleton height={120} />
        <Skeleton height={120} />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/support" replace />;
  }

  const output = parseOutputJson(session.output_json);

  return (
    <div className="space-y-6">
      {/* Input preview */}
      {session.input_text && (
        <div className="rounded-card border border-surface-secondary bg-surface-secondary/30 p-3">
          <p className="text-xs font-medium text-text-secondary">Your input</p>
          <p className="mt-1 text-sm text-text">{session.input_text}</p>
        </div>
      )}

      {/* Analysis sections stacked vertically */}
      <AnalysisDisplay analysis={output.analysis} />

      <div className="border-t border-surface-secondary" />

      <StrategyDisplay strategy={output.strategy} />

      <div className="border-t border-surface-secondary" />

      <TacticsDisplay tactics={output.engagement_tactics} />

      <div className="border-t border-surface-secondary" />

      <DraftDisplay draft={output.draft} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// SessionHistory (history route)
// ---------------------------------------------------------------------------

function SessionHistory() {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useSupportSessions();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-text-secondary">
        All Sessions
      </h3>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
          <Skeleton height={72} />
        </div>
      )}

      {!isLoading && (!sessions || sessions.length === 0) && (
        <div className="rounded-card bg-surface-secondary/30 p-6 text-center">
          <p className="text-sm text-text-hint">
            No support sessions yet.
          </p>
        </div>
      )}

      {!isLoading && sessions && sessions.length > 0 && (
        <div className="space-y-2">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onClick={() => navigate(`/support/session/${session.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Support page (root with nested routes)
// ---------------------------------------------------------------------------

export default function Support() {
  return (
    <div className="space-y-4 px-4 pt-4 pb-6">
      {/* Page title */}
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-accent" />
        <h1 className="text-xl font-bold text-text">Deal Support</h1>
      </div>

      {/* Sub-routes */}
      <Routes>
        <Route index element={<SupportHome />} />
        <Route path="session/:sessionId" element={<SessionDetail />} />
        <Route path="history" element={<SessionHistory />} />
        <Route path="*" element={<Navigate to="/support" replace />} />
      </Routes>
    </div>
  );
}
