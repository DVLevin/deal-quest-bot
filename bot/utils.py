"""Telegram formatting helpers."""

import re
import logging

logger = logging.getLogger(__name__)

MAX_MESSAGE_LENGTH = 4096


def escape_md(text: str) -> str:
    """Escape MarkdownV2 special characters."""
    special = r"_*[]()~`>#+-=|{}.!"
    return re.sub(f"([{re.escape(special)}])", r"\\\1", text)


def truncate_message(text: str, max_len: int = MAX_MESSAGE_LENGTH) -> str:
    """Truncate message to fit Telegram limits."""
    if len(text) <= max_len:
        return text
    return text[: max_len - 20] + "\n\n... (truncated)"


def format_score_bar(score: int, max_score: int = 100) -> str:
    """Create a visual score bar."""
    filled = round(score / max_score * 10)
    empty = 10 - filled
    return f"[{'█' * filled}{'░' * empty}] {score}/{max_score}"


def format_xp_level(total_xp: int) -> tuple[int, int, int]:
    """Calculate level from XP. Returns (level, xp_in_level, xp_needed)."""
    level = 1
    xp_remaining = total_xp
    while True:
        xp_needed = level * 200
        if xp_remaining < xp_needed:
            return level, xp_remaining, xp_needed
        xp_remaining -= xp_needed
        level += 1


def format_support_response(output: dict) -> str:
    """Format strategist agent output for Telegram."""
    parts = []

    analysis = output.get("analysis", {})
    if analysis:
        parts.append("📊 *PROSPECT ANALYSIS*")
        parts.append(f"Type: {analysis.get('prospect_type', 'N/A')}")
        parts.append(f"Seniority: {analysis.get('seniority', 'N/A')}")
        parts.append(f"Key Concern: {analysis.get('key_concern', 'N/A')}")
        signal = analysis.get("buying_signal", "N/A")
        reason = analysis.get("buying_signal_reason", "")
        parts.append(f"Signal: {signal} — {reason}")
        parts.append("")

    strategy = output.get("strategy", {})
    if strategy:
        parts.append("🎯 *CLOSING STRATEGY*")
        for i, step in enumerate(strategy.get("steps", []), 1):
            principle = step.get("principle", "")
            detail = step.get("detail", "")
            parts.append(f"{i}. *{principle}*")
            parts.append(f"   {detail}")
        obj = strategy.get("anticipated_objection", "")
        obj_resp = strategy.get("objection_response", "")
        if obj:
            parts.append(f"\nAnticipated objection: _{obj}_")
            parts.append(f"Handle: {obj_resp}")
        parts.append("")

    tactics = output.get("engagement_tactics", {})
    if tactics:
        parts.append("💡 *ENGAGEMENT TACTICS*")
        for action in tactics.get("linkedin_actions", []):
            parts.append(f"  🔘 {action}")
        comment = tactics.get("comment_suggestion", "")
        if comment:
            parts.append(f'  💬 Comment: "{comment}"')
        timing = tactics.get("timing", "")
        if timing:
            parts.append(f"  ⏰ {timing}")
        parts.append("")

    draft = output.get("draft", {})
    if draft:
        platform = draft.get("platform", "")
        parts.append(f"📝 *DRAFT ({platform.upper()})*")
        parts.append(draft.get("message", ""))
        ref = draft.get("playbook_reference", "")
        if ref:
            parts.append(f"\n📚 Playbook ref: {ref}")

    result = "\n".join(parts)
    return truncate_message(result)


def format_training_feedback(output: dict) -> str:
    """Format trainer agent output for Telegram."""
    parts = []

    score = output.get("total_score", 0)
    xp = output.get("xp_earned", 0)

    if score >= 80:
        emoji = "🎯"
    elif score >= 60:
        emoji = "📊"
    else:
        emoji = "📝"

    parts.append(f"{emoji} *Score: {score}/100*")
    parts.append(format_score_bar(score))
    parts.append(f"XP earned: +{xp}")
    parts.append("")

    breakdown = output.get("breakdown", [])
    if breakdown:
        parts.append("*Breakdown:*")
        for item in breakdown:
            criterion = item.get("criterion", "")
            sc = item.get("score", 0)
            mx = item.get("max", 0)
            parts.append(f"  • {criterion}: {sc}/{mx}")
            feedback = item.get("feedback", "")
            if feedback:
                parts.append(f"    {feedback}")
        parts.append("")

    strengths = output.get("strengths", [])
    if strengths:
        parts.append("✅ *Strengths:*")
        for s in strengths:
            parts.append(f"  • {s}")
        parts.append("")

    improvements = output.get("improvements", [])
    if improvements:
        parts.append("🔧 *To improve:*")
        for imp in improvements:
            parts.append(f"  • {imp}")
        parts.append("")

    pattern = output.get("pattern_observation", {})
    if pattern:
        recurring = pattern.get("recurring_issue", "")
        improving = pattern.get("improving_area", "")
        if recurring:
            parts.append(f"⚠️ Pattern: {recurring}")
        if improving:
            parts.append(f"📈 Improving: {improving}")

    result = "\n".join(parts)
    return truncate_message(result)
