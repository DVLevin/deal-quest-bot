"""Utility for computing analysis diffs between versions."""

from __future__ import annotations

from typing import Any


def compute_analysis_diff(
    old_analysis: dict[str, Any],
    new_analysis: dict[str, Any],
) -> dict[str, Any]:
    """
    Compute a field-level diff between two analysis JSON objects.

    Returns a dict with:
    - changed: dict of {field: {old: value, new: value}}
    - added: dict of {field: value}
    - removed: dict of {field: value}
    """
    diff: dict[str, Any] = {
        "changed": {},
        "added": {},
        "removed": {},
    }

    # Get all keys from both
    all_keys = set(old_analysis.keys()) | set(new_analysis.keys())

    for key in all_keys:
        old_val = old_analysis.get(key)
        new_val = new_analysis.get(key)

        if key not in old_analysis:
            diff["added"][key] = new_val
        elif key not in new_analysis:
            diff["removed"][key] = old_val
        elif old_val != new_val:
            # For nested dicts, recurse
            if isinstance(old_val, dict) and isinstance(new_val, dict):
                nested_diff = compute_analysis_diff(old_val, new_val)
                if nested_diff["changed"] or nested_diff["added"] or nested_diff["removed"]:
                    diff["changed"][key] = {"nested": nested_diff}
            else:
                diff["changed"][key] = {"old": old_val, "new": new_val}

    return diff


def summarize_diff_for_humans(diff: dict[str, Any]) -> str:
    """
    Convert a field diff to a human-readable summary.

    Example output:
    - Buying signal changed from Medium to High
    - Stage moved from early_interest to qualified
    - Added: key_concern (pricing)
    """
    lines = []

    # Changed fields
    for field, change in diff.get("changed", {}).items():
        if "nested" in change:
            # Recursively summarize nested changes
            nested_summary = _summarize_nested(field, change["nested"])
            lines.extend(nested_summary)
        else:
            old = _format_value(change.get("old"))
            new = _format_value(change.get("new"))
            field_name = _humanize_field(field)
            lines.append(f"- {field_name} changed from {old} to {new}")

    # Added fields
    for field, value in diff.get("added", {}).items():
        field_name = _humanize_field(field)
        val = _format_value(value)
        lines.append(f"- Added: {field_name} ({val})")

    # Removed fields
    for field, value in diff.get("removed", {}).items():
        field_name = _humanize_field(field)
        lines.append(f"- Removed: {field_name}")

    return "\n".join(lines) if lines else "No significant changes detected."


def _summarize_nested(parent: str, nested_diff: dict[str, Any]) -> list[str]:
    """Summarize a nested diff with parent context."""
    lines = []
    parent_name = _humanize_field(parent)

    for field, change in nested_diff.get("changed", {}).items():
        if "nested" in change:
            lines.extend(_summarize_nested(f"{parent}.{field}", change["nested"]))
        else:
            old = _format_value(change.get("old"))
            new = _format_value(change.get("new"))
            field_name = _humanize_field(field)
            lines.append(f"- {parent_name}: {field_name} changed from {old} to {new}")

    for field, value in nested_diff.get("added", {}).items():
        field_name = _humanize_field(field)
        val = _format_value(value)
        lines.append(f"- {parent_name}: added {field_name} ({val})")

    return lines


def _humanize_field(field: str) -> str:
    """Convert field_name to Field Name."""
    return field.replace("_", " ").title()


def _format_value(value: Any) -> str:
    """Format a value for human display."""
    if value is None:
        return "none"
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, list):
        if len(value) == 0:
            return "empty"
        return f"{len(value)} items"
    if isinstance(value, dict):
        return "object"
    return str(value)[:50]
