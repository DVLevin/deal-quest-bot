"""XP and scoring calculation helpers."""

from __future__ import annotations


def calculate_xp(score: int, *, first_attempt: bool = True, previous_score: int | None = None) -> int:
    """Calculate XP earned from a score.

    Rules:
    - Base XP = score (so 72/100 = 72 XP)
    - First attempt score > 80: +10 bonus
    - Retry improves by > 20 points: +15 bonus
    """
    xp = score

    if first_attempt and score > 80:
        xp += 10

    if previous_score is not None and (score - previous_score) > 20:
        xp += 15

    return max(0, xp)


def calculate_track_completion_bonus() -> int:
    """Bonus XP for completing all levels in a track."""
    return 50


def get_level_from_xp(total_xp: int) -> tuple[int, int, int]:
    """Returns (level, xp_in_current_level, xp_needed_for_level)."""
    level = 1
    xp_remaining = total_xp
    while True:
        xp_needed = level * 200
        if xp_remaining < xp_needed:
            return level, xp_remaining, xp_needed
        xp_remaining -= xp_needed
        level += 1


def get_rank_title(level: int) -> str:
    """Get a rank title based on level."""
    ranks = {
        1: "Rookie",
        2: "Associate",
        3: "Specialist",
        4: "Expert",
        5: "Strategist",
        6: "Deal Closer",
        7: "Senior Advisor",
        8: "Master Negotiator",
        9: "VP of Deals",
        10: "Deal Legend",
    }
    return ranks.get(min(level, 10), "Deal Legend")
