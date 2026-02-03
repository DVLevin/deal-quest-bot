/**
 * Learn page with nested sub-routes.
 *
 * - index:                       TrackList (overview of all levels with status)
 * - level/:levelId:              LevelDetail (lesson content + scenario practice)
 * - level/:levelId/results:      LevelResults (score, feedback, ideal comparison)
 *
 * Uses React Router v7 nested Routes within the /learn/* wildcard.
 */

import { useRef } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router';
import { Button } from '@/shared/ui';
import { TRACKS } from '@/features/learn/data/tracks';
import { TrackList } from '@/features/learn/components/TrackList';
import { LessonView } from '@/features/learn/components/LessonView';
import { ScenarioPractice } from '@/features/learn/components/ScenarioPractice';
import { LevelResults } from '@/features/learn/components/LevelResults';

/**
 * Level detail view: lesson content followed by scenario practice.
 * Looks up the level from static TRACKS data by levelId param.
 */
function LevelDetail() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const practiceRef = useRef<HTMLDivElement>(null);

  const track = TRACKS['foundations'];
  const level = track?.levels.find((l) => l.id === levelId);

  if (!level) {
    return <Navigate to="/learn" replace />;
  }

  const handleContinue = () => {
    practiceRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 px-4 pt-4 pb-4">
      <button
        className="flex items-center gap-1 text-sm text-accent min-h-[44px]"
        onClick={() => navigate('/learn')}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Track
      </button>

      <LessonView lesson={level.lesson} onContinue={handleContinue} />

      <div ref={practiceRef}>
        <ScenarioPractice scenario={level.scenario} levelId={level.id} />
      </div>

      {/* View Results link */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={() => navigate(`/learn/level/${level.id}/results`)}
      >
        View Results
      </Button>
    </div>
  );
}

export default function Learn() {
  return (
    <Routes>
      <Route index element={<TrackList />} />
      <Route path="level/:levelId" element={<LevelDetail />} />
      <Route path="level/:levelId/results" element={<LevelResults />} />
    </Routes>
  );
}
