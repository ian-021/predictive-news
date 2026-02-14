"""Convert question-format market titles to declarative news headlines."""

import re


def to_headline(title: str, probability: float) -> str:
    """
    Convert question-format market title to declarative news headline.

    Args:
        title: Market question (e.g. "Will Bitcoin be above $60,000 on Feb 13?")
        probability: 0-100 scale

    Returns:
        Declarative headline string
    """
    headline = title.strip()

    # Strip "Will " prefix (case insensitive)
    headline = re.sub(r'^Will\s+', '', headline, flags=re.IGNORECASE)

    # Strip trailing "?"
    headline = headline.rstrip('?').strip()

    # Capitalize first letter
    if headline:
        headline = headline[0].upper() + headline[1:]

    # Clean up "the price of X be above" → "X Price Above"
    headline = re.sub(
        r'the price of (.+?) be above',
        lambda m: f'{m.group(1)} Price Above',
        headline,
        flags=re.IGNORECASE,
    )

    # Clean up "X be Y" → "X Y" (remove "be")
    headline = re.sub(r'\bbe\b\s+', '', headline)

    # Add editorial framing based on probability
    if probability >= 80:
        # Present as expected outcome - just use the cleaned title
        pass
    elif probability >= 40:
        # Add uncertainty marker
        if not any(word in headline.lower() for word in ['question', 'uncertain', 'jeopardy']):
            headline = headline + " \u2014 Outcome Uncertain"
    else:
        # Present as unlikely
        if not any(word in headline.lower() for word in ['unlikely', 'doubt']):
            headline = headline + " Remains Unlikely"

    return headline
