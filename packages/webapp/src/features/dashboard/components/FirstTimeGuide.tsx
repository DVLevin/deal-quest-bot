/**
 * Guided onboarding card for first-time users (QW #9).
 *
 * Displayed on the Dashboard when the user has 0 XP and 0 leads,
 * guiding them through 3 simple steps to get started. Disappears
 * automatically once the user gains XP or creates their first lead.
 */

import { Card } from '@/shared/ui';

export function FirstTimeGuide() {
  return (
    <Card className="border border-accent/20 bg-gradient-to-br from-accent/8 via-accent/4 to-transparent">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-bold text-text">Welcome to Deal Quest!</p>
          <p className="mt-1 text-xs text-text-secondary">
            Get started in 3 simple steps:
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
              1
            </span>
            <div>
              <p className="text-sm font-medium text-text">Send a prospect screenshot</p>
              <p className="text-xs text-text-hint">
                Open the bot and send a LinkedIn profile, email, or business card photo
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
              2
            </span>
            <div>
              <p className="text-sm font-medium text-text">Get AI strategy</p>
              <p className="text-xs text-text-hint">
                See analysis, engagement plan, and draft outreach
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
              3
            </span>
            <div>
              <p className="text-sm font-medium text-text">Follow the plan</p>
              <p className="text-xs text-text-hint">
                Execute steps, track progress, close the deal
              </p>
            </div>
          </div>
        </div>

        <a
          href="https://t.me/DealQuestBot?start=support"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl bg-accent py-3 text-center text-sm font-semibold text-accent-text transition-all active:scale-[0.98]"
        >
          Open Bot & Try It
        </a>
      </div>
    </Card>
  );
}
