---
phase: quick
plan: 003
type: execute
wave: 1
depends_on: []
files_modified:
  - bot/handlers/start.py
  - packages/webapp/src/features/leads/components/LeadDetail.tsx
  - packages/webapp/src/shared/lib/deepLink.ts
autonomous: true

must_haves:
  truths:
    - "User can tap 'Re-analyze Strategy' on a lead in the TMA and be taken to the bot chat where the re-analysis flow starts automatically"
    - "User can tap 'Add Context' on a lead in the TMA and be taken to the bot chat where the context input flow starts automatically"
    - "User can tap 'Re-research' on a lead in the TMA and be taken to the bot re-research flow"
    - "User can tap 'Get Advice' on a lead in the TMA and be taken to the bot advice flow"
    - "Bot /start handler routes deep link payloads (lead_reanalyze_42, lead_context_42, etc.) to the correct handler flow"
    - "Deep links that reference a non-existent lead ID show a graceful error, not a crash"
  artifacts:
    - path: "bot/handlers/start.py"
      provides: "Deep link routing in cmd_start for lead action payloads"
      contains: "lead_reanalyze|lead_context|lead_reresearch|lead_advice"
    - path: "packages/webapp/src/features/leads/components/LeadDetail.tsx"
      provides: "Action buttons row in LeadDetail that deep-link to bot"
    - path: "packages/webapp/src/shared/lib/deepLink.ts"
      provides: "Reusable openBotDeepLink helper"
      exports: ["openBotDeepLink"]
  key_links:
    - from: "packages/webapp/src/features/leads/components/LeadDetail.tsx"
      to: "bot/handlers/start.py"
      via: "openTelegramLink -> t.me/BotName?start=lead_ACTION_ID -> /start deep_link routing"
      pattern: "lead_(reanalyze|context|reresearch|advice)_\\d+"
    - from: "bot/handlers/start.py"
      to: "bot/handlers/context_input.py"
      via: "FSM state set + message send (simulates callback flow)"
      pattern: "ReanalysisState|context:add"
---

<objective>
Add TMA-to-bot deep linking for lead actions. When a user views a lead in the TMA, they see action buttons (Re-analyze, Add Context, Re-research, Get Advice) that open the Telegram bot chat with the corresponding workflow already started for that specific lead.

Purpose: Currently the TMA shows lead data read-only. To trigger AI-powered actions (re-analysis, context updates, advice), users must manually navigate to the bot, run /leads, find the lead, and tap the right button. Deep linking eliminates 4+ taps and makes the TMA a true action center.

Output: Bot deep link routing in start.py, TMA action buttons in LeadDetail.tsx, shared deepLink utility.
</objective>

<execution_context>
@/Users/dmytrolevin/.claude/get-shit-done/workflows/execute-plan.md
@/Users/dmytrolevin/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@bot/handlers/start.py
@bot/handlers/leads.py
@bot/handlers/context_input.py
@bot/utils_tma.py
@packages/webapp/src/features/leads/components/LeadDetail.tsx
@packages/webapp/src/features/support/components/SupportInput.tsx
@packages/webapp/src/lib/telegram.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Bot deep link routing in /start handler</name>
  <files>bot/handlers/start.py</files>
  <action>
Add deep link payload parsing to the `cmd_start` handler. Currently, `/start` with a deep link payload (e.g., `/start lead_reanalyze_42`) shows the generic welcome-back message. Add routing BEFORE the welcome-back message for existing users.

**Payload format:** `lead_{action}_{lead_id}` where action is one of: `reanalyze`, `context`, `reresearch`, `advice`. Lead ID is numeric. This fits within Telegram's 64-char base64url limit.

**Implementation:**

1. In `cmd_start`, after checking `existing and existing.encrypted_api_key`, parse the deep link args from `message.text`. The `/start` command with deep link sends `/start PAYLOAD` -- extract the payload by splitting on space: `parts = (message.text or "").split(); payload = parts[1] if len(parts) > 1 else ""`.

2. If payload matches `lead_{action}_{id}` pattern (use regex: `r"^lead_(reanalyze|context|reresearch|advice)_(\d+)$"`), route to a new async helper `_handle_lead_deep_link(message, state, action, lead_id, ...)`.

3. The `_handle_lead_deep_link` function needs `lead_repo: LeadRegistryRepo` injected. Add it to `cmd_start` signature with default `None` (aiogram DI will inject it). The function should:

   a. Fetch the lead: `lead = await lead_repo.get_by_id(lead_id)`. If not found, answer "Lead not found. Use /leads to see your pipeline." and return.

   b. Verify ownership: `if lead.telegram_id != tg_id` -> "This lead doesn't belong to you." and return.

   c. Route by action:

   - **reanalyze**: Set FSM state to `ReanalysisState.collecting_context`, set state data `active_lead_id=lead_id`, send the context collection prompt (same text as in context_input.py's `on_context_add` handler: "Add any new context about {name}..."). Import `ReanalysisState` from `bot.states`.

   - **context**: Set FSM state to `LeadEngagementState.adding_context`, set state data `active_lead_id=lead_id`, send the context prompt (same as leads.py `on_lead_context_start`). Import `LeadEngagementState` from `bot.states`.

   - **reresearch**: Set FSM state to `LeadEngagementState.reresearch_input`, set state data `active_lead_id=lead_id`, send the re-research prompt (same as leads.py `on_lead_reresearch_start`). Import from `bot.states`.

   - **advice**: For advice, there's no FSM needed -- it's a one-shot callback. Instead of replicating the full advice flow, send a message with a single inline button that triggers the existing `lead:advice:{lead_id}` callback: `InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text="Get Fresh AI Advice", callback_data=f"lead:advice:{lead_id}")]])`. Include lead name and basic info in the message.

4. Also handle existing TMA deep links that currently don't work: `support`, `support_photo`, `settings`. For `support` and `support_photo`, set `SupportState.waiting_input` and send the support prompt. For `settings`, just call the settings command. Use an elif chain after the lead action check.

**Important:** Import `LeadRegistryRepo` from `bot.storage.repositories`. Add `lead_repo: LeadRegistryRepo | None = None` to `cmd_start` params (aiogram DI pattern). The `_handle_lead_deep_link` should be a standalone async function that `cmd_start` calls with the needed dependencies.

**What to avoid:** Do NOT duplicate the full advice generation logic in start.py. Use the inline button approach to delegate to the existing callback handler in leads.py. Do NOT change the existing onboarding flow for new users (the deep link routing only applies to existing users with API keys set up).
  </action>
  <verify>
Run `python -c "from bot.handlers.start import cmd_start; print('import ok')"` to verify no import errors. Grep for `lead_reanalyze` in start.py to confirm routing exists.
  </verify>
  <done>
Bot /start handler parses deep link payloads matching `lead_{action}_{id}` pattern and routes to the correct FSM state or inline button for reanalyze, context, reresearch, and advice actions. Non-existent leads get a graceful error message. Existing TMA deep links (support, support_photo, settings) also route correctly.
  </done>
</task>

<task type="auto">
  <name>Task 2: TMA deep link utility and LeadDetail action buttons</name>
  <files>
    packages/webapp/src/shared/lib/deepLink.ts
    packages/webapp/src/features/leads/components/LeadDetail.tsx
  </files>
  <action>
**Part A: Create `packages/webapp/src/shared/lib/deepLink.ts`**

A small utility that encapsulates the TMA-to-bot deep link pattern already used across the app (SupportInput, SettingsPanel, CasebookDetail, etc.) but currently copy-pasted everywhere.

```typescript
import { openTelegramLink } from '@telegram-apps/sdk-react';

const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME ?? 'DealQuestBot';

/**
 * Open a deep link to the bot chat with a /start payload.
 * Uses native Telegram SDK when available, falls back to window.open.
 *
 * @param payload - The deep link payload (appended after ?start=)
 *   Must be 1-64 chars, base64url alphabet [A-Za-z0-9_-]
 */
export function openBotDeepLink(payload: string): void {
  const url = `https://t.me/${BOT_USERNAME}?start=${payload}`;
  if (openTelegramLink.isAvailable()) {
    openTelegramLink(url);
  } else {
    window.open(url, '_blank');
  }
}
```

**Part B: Add action buttons to LeadDetail.tsx**

Add an "Actions" row between the Status selector and the Active Plan section. This row provides quick deep-link buttons for bot-powered actions on this lead.

1. Import `openBotDeepLink` from `@/shared/lib/deepLink`.
2. Import `RefreshCw, MessageCirclePlus, Search, Lightbulb` from `lucide-react` (add to existing import).
3. After the `<LeadStatusSelector>` block and before `{/* SECTION 1: Active Plan */}`, add a new "Quick Actions" row:

```tsx
{/* Quick actions -- deep link to bot */}
<div className="flex gap-2 overflow-x-auto pb-1">
  <ActionChip
    icon={RefreshCw}
    label="Re-analyze"
    onClick={() => openBotDeepLink(`lead_reanalyze_${lead.id}`)}
  />
  <ActionChip
    icon={MessageCirclePlus}
    label="Add Context"
    onClick={() => openBotDeepLink(`lead_context_${lead.id}`)}
  />
  <ActionChip
    icon={Search}
    label="Re-research"
    onClick={() => openBotDeepLink(`lead_reresearch_${lead.id}`)}
  />
  <ActionChip
    icon={Lightbulb}
    label="Get Advice"
    onClick={() => openBotDeepLink(`lead_advice_${lead.id}`)}
  />
</div>
```

4. Define `ActionChip` as a small inline component above `LeadDetail` (or inside the file):

```tsx
function ActionChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-surface-secondary bg-surface-secondary/40 px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors active:bg-surface-secondary/70 active:scale-[0.97]"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
```

The chip design uses rounded-full pill shape with the existing surface-secondary color palette, matching the project's Tailwind CSS 4 patterns (bg-surface-secondary/40, text-text-secondary, etc.). The row uses `overflow-x-auto` so chips scroll horizontally on narrow screens.

**What to avoid:** Do NOT add these as full Card components -- they should be lightweight chips/pills in a horizontal scrollable row. Do NOT import the entire Telegram SDK -- just use the `openBotDeepLink` utility. Do NOT remove any existing UI -- these are additive.
  </action>
  <verify>
Run `cd /Users/dmytrolevin/Downloads/GD_playground/packages/webapp && npx tsc --noEmit` to verify TypeScript compiles. Run `pnpm build` to verify the build succeeds.
  </verify>
  <done>
LeadDetail page shows a horizontal row of action chips (Re-analyze, Add Context, Re-research, Get Advice) below the status selector. Tapping any chip opens the bot chat via `openTelegramLink` with the correct `lead_{action}_{id}` payload that the bot's /start handler will route.
  </done>
</task>

</tasks>

<verification>
1. TypeScript builds without errors: `cd packages/webapp && pnpm build`
2. Python imports work: `python -c "from bot.handlers.start import cmd_start"`
3. Deep link payloads in TMA match bot's routing regex: both use `lead_{action}_{id}` format
4. All four actions present in both TMA (chips) and bot (routing): reanalyze, context, reresearch, advice
5. Grep confirms no hardcoded bot username in new code (uses VITE_BOT_USERNAME env var)
</verification>

<success_criteria>
- LeadDetail.tsx renders 4 action chips in a horizontal scrollable row
- Each chip constructs the correct deep link payload for the lead's ID
- Bot /start handler parses deep link payloads and routes to correct FSM state
- Non-existent lead IDs produce a user-friendly error message
- Existing /start onboarding flow is unchanged for new users
- TypeScript and Python both compile/import without errors
</success_criteria>

<output>
After completion, create `.planning/quick/003-tma-bot-deep-actions/003-SUMMARY.md`
</output>
