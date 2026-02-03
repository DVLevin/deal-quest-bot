/**
 * Draft response display with copy, regenerate, and save-to-casebook actions.
 *
 * Shows the AI-generated draft message with platform badge and word count.
 * Copy uses navigator.clipboard with textarea fallback for older WebViews.
 * Regenerate and save-to-casebook deep-link to the bot via openTelegramLink.
 */

import { useState, useCallback } from 'react';
import { openTelegramLink } from '@telegram-apps/sdk-react';
import { FileText, Copy, Check, RefreshCw, BookmarkPlus } from 'lucide-react';
import { Card, Badge, Button } from '@/shared/ui';
import type { SupportDraft } from '../types';

interface DraftDisplayProps {
  draft: SupportDraft;
}

/**
 * Clipboard write with textarea fallback for older WebViews.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback: create a temporary textarea element
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

export function DraftDisplay({ draft }: DraftDisplayProps) {
  const [copied, setCopied] = useState(false);
  const botUsername = import.meta.env.VITE_BOT_USERNAME ?? 'DealQuestBot';

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(draft.message);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [draft.message]);

  const handleRegenerate = useCallback(() => {
    const url = `https://t.me/${botUsername}?start=support`;
    if (openTelegramLink.isAvailable()) {
      openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [botUsername]);

  const handleSaveToCasebook = useCallback(() => {
    const url = `https://t.me/${botUsername}?start=save_casebook`;
    if (openTelegramLink.isAvailable()) {
      openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [botUsername]);

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-text">Draft Response</h3>
      </div>

      {/* Platform & word count */}
      <div className="flex items-center gap-2">
        <Badge variant="brand" size="sm">{draft.platform}</Badge>
        {draft.word_count > 0 && (
          <Badge variant="default" size="sm">
            {draft.word_count} words
          </Badge>
        )}
      </div>

      {/* Draft message */}
      <Card padding="sm" className="bg-surface-secondary/30">
        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-text font-sans">
          {draft.message || 'No draft available'}
        </pre>
      </Card>

      {/* Playbook reference */}
      {draft.playbook_reference && (
        <p className="text-xs text-text-hint">
          Playbook ref: {draft.playbook_reference}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 gap-1.5"
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
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={handleRegenerate}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={handleSaveToCasebook}
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </div>
  );
}
