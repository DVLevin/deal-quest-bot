/**
 * DraftCopyCard -- displays AI-generated draft options in a tabbed view.
 *
 * Supports two modes:
 * 1. Structured options (DraftOption[]) -- tabbed segmented control
 * 2. Legacy single text (string) -- simple text display (backward compat)
 *
 * After copy, fires onCopy callback so parent can show "Done" nudge.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Copy, Check, RefreshCw, Loader2 } from 'lucide-react';
import type { DraftOption } from '../hooks/useGenerateDraft';

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

const LINKEDIN_INVITE_CHAR_LIMIT = 200;

interface DraftCopyCardProps {
  options?: DraftOption[];
  draftText?: string;
  platform?: string;
  contentType?: string;
  onCopy?: (text: string) => void;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  email: 'Email',
  twitter: 'Twitter/X',
  slack: 'Slack',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  other: 'General',
};

export function DraftCopyCard({
  options,
  draftText,
  platform,
  contentType,
  onCopy,
  onRegenerate,
  isRegenerating,
}: DraftCopyCardProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const hasOptions = options && options.length > 0;
  const displayText = hasOptions ? options[activeTab]?.text : draftText;

  const handleCopy = useCallback(async () => {
    if (!displayText) return;
    const success = await copyToClipboard(displayText);
    if (success) {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
      onCopy?.(displayText);
    }
  }, [displayText, onCopy]);

  if (!displayText) return null;

  return (
    <div className="rounded-xl border border-surface-secondary bg-surface-secondary/30 p-3">
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text-secondary">Draft Message</span>
          {platform && PLATFORM_LABELS[platform] && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
              {PLATFORM_LABELS[platform]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex items-center justify-center rounded-md p-1 text-text-hint transition-colors active:scale-95 active:bg-surface-secondary disabled:opacity-50"
              aria-label="Regenerate draft"
            >
              {isRegenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </button>
          )}
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
      </div>

      {/* Segmented control for tabs */}
      {hasOptions && options.length > 1 && (
        <div className="mb-3 flex rounded-lg bg-surface-secondary/50 p-0.5">
          {options.map((opt, i) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setActiveTab(i)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === i
                  ? 'bg-surface text-text shadow-sm'
                  : 'text-text-hint'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Draft text */}
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text">
        {displayText}
      </pre>

      {/* Character counter for LinkedIn invites */}
      {platform === 'linkedin' && contentType === 'connection_request' && displayText && (
        <div className={`mt-1.5 flex items-center justify-end gap-1 text-[10px] font-medium ${
          displayText.length > LINKEDIN_INVITE_CHAR_LIMIT
            ? 'text-error'
            : displayText.length > LINKEDIN_INVITE_CHAR_LIMIT * 0.85
              ? 'text-warning'
              : 'text-text-hint'
        }`}>
          <span>{displayText.length}/{LINKEDIN_INVITE_CHAR_LIMIT}</span>
          {displayText.length > LINKEDIN_INVITE_CHAR_LIMIT && (
            <span className="text-error">(exceeds LinkedIn invite limit)</span>
          )}
        </div>
      )}

      {/* General character count for long texts */}
      {!(platform === 'linkedin' && contentType === 'connection_request') && displayText && displayText.length > 280 && (
        <div className="mt-1.5 text-right text-[10px] text-text-hint">
          {displayText.length} chars
        </div>
      )}

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
