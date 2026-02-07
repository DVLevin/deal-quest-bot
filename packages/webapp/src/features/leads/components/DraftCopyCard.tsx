/**
 * DraftCopyCard -- displays draft message text with one-tap copy to clipboard.
 *
 * Uses the same clipboard fallback pattern as LeadDetail.tsx to handle
 * Telegram WebView clipboard restrictions (textarea + execCommand fallback).
 */

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

// ---------------------------------------------------------------------------
// Clipboard helper (Telegram WebView fallback)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// DraftCopyCard
// ---------------------------------------------------------------------------

interface DraftCopyCardProps {
  draftText: string;
}

export function DraftCopyCard({ draftText }: DraftCopyCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(draftText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [draftText]);

  return (
    <div className="rounded-xl border border-surface-secondary bg-surface-secondary/30 p-3">
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary">
          Draft Message
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center justify-center rounded-md p-1 text-text-hint transition-colors active:scale-95 active:bg-surface-secondary"
          aria-label="Copy draft"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Draft text */}
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text">
        {draftText}
      </pre>

      {/* Full-width copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent/15 px-3 py-2 text-sm font-medium text-accent transition-colors active:scale-95 active:bg-accent/25"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy Draft
          </>
        )}
      </button>
    </div>
  );
}
