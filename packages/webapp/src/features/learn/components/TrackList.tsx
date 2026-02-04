/**
 * Track overview showing all levels with status indicators.
 *
 * Displays the track name and description at top, then maps over
 * all levels rendering a LevelCard for each. Handles loading and
 * error states. Clicking an unlocked/completed level navigates
 * to the level detail sub-route.
 */

import { useNavigate } from 'react-router';
import { Skeleton, ErrorCard } from '@/shared/ui';
import { useTrackProgress } from '../hooks/useTrackProgress';
import { LevelCard } from './LevelCard';
import { TrackStats } from './TrackStats';
import { TRACKS } from '../data/tracks';

export function TrackList() {
  const navigate = useNavigate();
  const { data: levels, isLoading, error, refetch } = useTrackProgress('foundations');
  const track = TRACKS['foundations'];

  if (isLoading) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <Skeleton height={28} width="60%" />
        <Skeleton height={16} width="80%" />
        <div className="space-y-3 mt-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={72} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 px-4 pt-4">
        <h1 className="text-xl font-bold text-text">{track.name}</h1>
        <ErrorCard message="Failed to load progress" onRetry={refetch} />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 pt-4 pb-4">
      <div>
        <h1 className="text-xl font-bold text-text">{track.name}</h1>
        <p className="mt-1 text-sm text-text-hint">{track.description}</p>
      </div>

      {levels && <TrackStats levels={levels} />}

      <div className="space-y-3">
        {levels?.map((level) => (
          <LevelCard
            key={level.id}
            level={level}
            trackId="foundations"
            onClick={() => navigate(`level/${level.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
