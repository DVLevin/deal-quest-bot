"""Shared input validation for bot text handlers.

Provides consistent validation across /support, /learn, and /train handlers
with context-specific error messages and command detection with fuzzy matching.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ValidationResult:
    is_valid: bool
    error_message: str | None = None
    cleaned_input: str | None = None
    is_command: bool = False
    suggested_command: str | None = None


KNOWN_COMMANDS = {
    "/start", "/support", "/learn", "/train", "/stats",
    "/settings", "/leads", "/admin", "/help", "/cancel",
}


def _edit_distance(a: str, b: str) -> int:
    """Simple Levenshtein distance."""
    if len(a) < len(b):
        return _edit_distance(b, a)
    if len(b) == 0:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (ca != cb)))
        prev = curr
    return prev[len(b)]


def _check_mistyped_command(text: str) -> str | None:
    """If text looks like a mistyped command, suggest the correct one."""
    text = text.strip().lower()
    if not text.startswith("/"):
        return None

    # Exact match — it's a real command, clear state and let them re-send
    if text in KNOWN_COMMANDS:
        return text

    # Fuzzy match: find closest command
    word = text.split()[0]  # just the first word
    best_match = None
    best_dist = 999
    for cmd in KNOWN_COMMANDS:
        dist = _edit_distance(word, cmd)
        if dist < best_dist:
            best_dist = dist
            best_match = cmd

    if best_dist <= 2 and best_match:
        return best_match
    return "unknown"


def validate_user_input(
    text: str,
    *,
    min_length: int = 1,
    max_length: int = 4000,
    context: str = "general",
) -> ValidationResult:
    """Validate user text input with context-specific messages."""
    stripped = text.strip()

    # 1. Empty check
    if not stripped:
        messages = {
            "support": "Please describe your prospect or send a screenshot.",
            "learn": "Please type your response to the scenario.",
            "train": "Please type your response to the scenario.",
        }
        return ValidationResult(
            is_valid=False,
            error_message=messages.get(context, "Please provide some input."),
        )

    # 2. Command detection (applies to all contexts)
    if stripped.startswith("/"):
        if stripped.lower() == "/cancel":
            return ValidationResult(
                is_valid=False,
                is_command=True,
                error_message=None,
                suggested_command="/cancel",
            )
        suggested = _check_mistyped_command(stripped)
        return ValidationResult(
            is_valid=False,
            is_command=True,
            suggested_command=suggested,
            error_message=None,
        )

    # 3. Min length check (context-specific messages)
    if len(stripped) < min_length:
        messages = {
            "support": (
                "That's quite short. Please provide more context about your prospect:\n"
                "- Their role, company, and situation\n"
                "- Or send a LinkedIn screenshot\n"
                "- Or a voice message"
            ),
            "learn": "Please provide a more detailed response to the scenario.",
            "train": "Please provide a more detailed response to the scenario.",
        }
        return ValidationResult(
            is_valid=False,
            error_message=messages.get(context, "Input is too short."),
        )

    # 4. Max length truncation (silent)
    cleaned = stripped[:max_length]

    return ValidationResult(is_valid=True, cleaned_input=cleaned)
