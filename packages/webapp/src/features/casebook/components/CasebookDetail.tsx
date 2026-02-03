/**
 * Full detail view for a casebook entry.
 *
 * Shows all analysis sections (prospect analysis, closing strategy,
 * engagement tactics, draft response), quality score, badges, and
 * a "Use as Template" button that deep-links to the bot's /support command.
 *
 * Copy button uses navigator.clipboard with textarea fallback for older WebViews.
 */

import { useState, useCallback } from 'react';
import { openTelegramLink } from '@telegram-apps/sdk-react';
import {
  FileText,
  Copy,
  Check,
  Target,
  Lightbulb,
  MessageSquare,
  BookOpen,
} from 'lucide-react';
import { Card, Badge, Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type { CasebookRow } from '@/types/tables';

interface CasebookDetailProps {
  entry: CasebookRow;
}

/**
 * Clipboard write with textarea fallback for older WebViews.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

function QualityScore({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const colorClass =
    score >= 0.8
      ? 'text-success'
      : score >= 0.6
        ? 'text-warning'
        : 'text-error';

  return (
    <span className={cn('text-sm font-bold tabular-nums', colorClass)}>
      {pct}%
    </span>
  );
}

function Section({
  icon: Icon,
  title,
  content,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  content: string | null;
}) {
  return (
    <Card padding="sm">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
        {content || 'No information available.'}
      </p>
    </Card>
  );
}

export function CasebookDetail({ entry }: CasebookDetailProps) {
  const [copied, setCopied] = useState(false);
  const botUsername = import.meta.env.VITE_BOT_USERNAME ?? 'DealQuestBot';

  const handleCopy = useCallback(async () => {
    if (!entry.draft_response) return;
    const success = await copyToClipboard(entry.draft_response);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [entry.draft_response]);

  const handleUseAsTemplate = useCallback(() => {
    const url = `https://t.me/${botUsername}?start=support`;
    if (openTelegramLink.isAvailable()) {
      openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [botUsername]);

  const createdDate = entry.created_at
    ? new Date(entry.created_at).toLocaleDateString()
    : null;

  return (
    <div className="space-y-4">
      {/* Header badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="brand" size="md">
          {entry.persona_type}
        </Badge>
        <Badge variant="default" size="md">
          {entry.scenario_type}
        </Badge>
        {entry.industry && (
          <Badge variant="info" size="md">
            {entry.industry}
          </Badge>
        )}
        <span className="ml-auto">
          <QualityScore score={entry.quality_score} />
        </span>
      </div>

      {/* Analysis sections */}
      <Section
        icon={Target}
        title="Prospect Analysis"
        content={entry.prospect_analysis}
      />

      <Section
        icon={Lightbulb}
        title="Closing Strategy"
        content={entry.closing_strategy}
      />

      <Section
        icon={MessageSquare}
        title="Engagement Tactics"
        content={entry.engagement_tactics}
      />

      {/* Draft response with copy button */}
      <Card padding="sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-text">Draft Response</h3>
          </div>
          {entry.draft_response && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 !min-h-[36px] !px-2"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </Button>
          )}
        </div>
        <Card padding="sm" className="bg-surface-secondary/30">
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-text font-sans">
            {entry.draft_response || 'No draft available'}
          </pre>
        </Card>
      </Card>

      {/* Playbook references */}
      {entry.playbook_references && (
        <Card padding="sm">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-text">
              Playbook References
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
            {entry.playbook_references}
          </p>
        </Card>
      )}

      {/* Use as Template action */}
      <Button
        variant="primary"
        size="lg"
        className="w-full gap-2"
        onClick={handleUseAsTemplate}
      >
        <FileText className="h-4 w-4" />
        Use as Template
      </Button>

      {/* Created date footer */}
      {createdDate && (
        <p className="text-center text-xs text-text-hint">
          Created {createdDate}
        </p>
      )}
    </div>
  );
}
