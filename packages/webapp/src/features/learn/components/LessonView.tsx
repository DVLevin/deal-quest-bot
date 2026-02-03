/**
 * Lesson content display with title, text, and key points list.
 *
 * Renders the lesson material for a given level: heading, content paragraph,
 * and a bulleted list of key points with checkmark icons. A "Continue to Practice"
 * button at the bottom advances to the scenario practice section.
 */

import { CheckCircle } from 'lucide-react';
import { Button } from '@/shared/ui';

interface LessonViewProps {
  lesson: {
    title: string;
    content: string;
    keyPoints: string[];
  };
  onContinue: () => void;
}

export function LessonView({ lesson, onContinue }: LessonViewProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-text">{lesson.title}</h2>

      <p className="text-sm leading-relaxed text-text-secondary">
        {lesson.content}
      </p>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-text">Key Points</h3>
        <ul className="space-y-2">
          {lesson.keyPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span className="text-sm text-text-secondary">{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <Button onClick={onContinue} className="w-full">
        Continue to Practice
      </Button>
    </div>
  );
}
