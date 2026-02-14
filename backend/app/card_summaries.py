"""Template-based summary generation for editorial market cards."""


def get_summary_for_card(
    probability: float,
    change_pct: float,
    volume: float,
    context_summary: str | None = None,
) -> str:
    """
    Returns the best available summary for a market card.
    Priority: scraped context > template fallback.

    Args:
        probability: 0-100 scale
        change_pct: signed percentage points change in 24h
        volume: USD volume
        context_summary: scraped Polymarket context summary (if available)
    """
    if context_summary:
        return context_summary

    return _generate_template_summary(probability, change_pct, volume)


def _generate_template_summary(
    probability: float,
    change_pct: float,
    volume: float,
) -> str:
    """Generate a template-based summary based on market state."""
    abs_change = abs(change_pct)

    if abs_change >= 10 and change_pct > 0:
        return (
            f"Prediction markets have surged {abs_change:.0f}% in the last 24 hours, "
            f"signaling growing confidence at {probability:.0f}% likelihood."
        )

    if abs_change >= 10 and change_pct < 0:
        return (
            f"Market confidence has dropped {abs_change:.0f}% in the last 24 hours, "
            f"reflecting increasing uncertainty."
        )

    if probability >= 90:
        change_clause = ""
        if abs_change >= 2:
            direction = "a recent surge" if change_pct > 0 else "despite recent movement"
            change_clause = f", {direction} of {abs_change:.0f}%"
        return (
            f"Markets assign {probability:.0f}% probability to this outcome{change_clause}."
        )

    if probability <= 15:
        return (
            f"Markets see this as highly unlikely at just {probability:.0f}% probability."
        )

    return f"Traders currently price this outcome at {probability:.0f}% likelihood."
