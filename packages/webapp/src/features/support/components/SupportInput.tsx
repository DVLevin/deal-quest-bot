/**
 * Support input CTA with bot deep links.
 *
 * Primary CTA: "Start Analysis in Bot" for text-based deal analysis.
 * Secondary CTA: "Send Screenshot for Analysis" for photo-based analysis.
 * Both use openTelegramLink for native Telegram deep linking.
 */

import { useCallback } from 'react';
import { openTelegramLink } from '@telegram-apps/sdk-react';
import { MessageSquare, ArrowRight, Camera } from 'lucide-react';
import { Card, Button } from '@/shared/ui';

export function SupportInput() {
  const botUsername = import.meta.env.VITE_BOT_USERNAME ?? 'DealQuestBot';

  const handleStartAnalysis = useCallback(() => {
    const url = `https://t.me/${botUsername}?start=support`;
    if (openTelegramLink.isAvailable()) {
      openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [botUsername]);

  const handleSendScreenshot = useCallback(() => {
    const url = `https://t.me/${botUsername}?start=support_photo`;
    if (openTelegramLink.isAvailable()) {
      openTelegramLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [botUsername]);

  return (
    <Card className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15">
          <MessageSquare className="h-4 w-4 text-accent" />
        </div>
        <h2 className="text-base font-semibold text-text">
          AI Deal Support
        </h2>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-text-secondary">
        Get AI-powered strategy analysis for your prospects. Receive prospect
        analysis, closing strategy, engagement tactics, and a draft response
        tailored to your situation.
      </p>

      {/* Primary CTA: Text analysis */}
      <Button
        variant="primary"
        size="lg"
        className="w-full gap-2"
        onClick={handleStartAnalysis}
      >
        Start Analysis in Bot
        <ArrowRight className="h-4 w-4" />
      </Button>

      {/* Secondary CTA: Screenshot analysis */}
      <button
        onClick={handleSendScreenshot}
        className="flex w-full items-center gap-3 rounded-button border border-surface-secondary bg-surface-secondary/40 p-3 text-left transition-colors hover:bg-surface-secondary/70 active:scale-[0.98]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <Camera className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text">
            Send Screenshot for Analysis
          </p>
          <p className="text-xs text-text-hint">
            Send a screenshot of a conversation, profile, or post for AI visual analysis
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-text-hint" />
      </button>
    </Card>
  );
}
