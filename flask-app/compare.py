"""Rebuilt typing-test algorithm.

Scoring model (competitive-exam style, type from printed material):

  * Words are compared position by position against the reference text.
  * A word is "correct" only when it exactly matches the reference word.
  * Gross WPM  = (total characters typed / 5) / minutes
  * Net WPM    = correct words per minute
               = (total words typed - wrong words) / minutes
  * word accuracy = correct words / max(reference words, typed words) * 100
"""

import math


def split_words(text):
    """Split text into words. The typed text is compared against the
    reference word-for-word, so a single normalized split is used."""
    return text.split()


def compute_result(original_text, typed_text, duration_seconds):
    """Compute all statistics for a completed test.

    Returns a dict that is JSON-serializable and safe to persist.
    """
    orig_words = split_words(original_text)
    typed_words = split_words(typed_text)

    words_typed = len(typed_words)
    words_expected = len(orig_words)

    correct_words = 0
    wrong_words = 0
    missing_words = 0
    extra_words = 0
    word_results = []

    max_n = max(words_expected, words_typed)

    for i in range(max_n):
        ow = orig_words[i] if i < words_expected else None
        tw = typed_words[i] if i < words_typed else None

        if ow is not None and tw is not None and ow == tw:
            correct_words += 1
            status = 'correct'
        elif ow is not None and tw is not None:
            wrong_words += 1
            status = 'incorrect'
        elif ow is None:
            extra_words += 1
            wrong_words += 1
            status = 'extra'
        else:
            missing_words += 1
            status = 'missing'

        word_results.append({
            'index': i,
            'original': ow,
            'typed': tw,
            'status': status,
        })

    minutes = duration_seconds / 60.0 if duration_seconds > 0 else 0

    gross_wpm = (len(typed_text) / 5.0) / minutes if minutes > 0 else 0.0
    # Net WPM = (total words typed - wrong words) / minutes = correct words / minute
    net_wpm = correct_words / minutes if minutes > 0 else 0.0

    denominator = max(words_expected, words_typed)
    word_accuracy = (correct_words / denominator * 100.0) if denominator else 100.0

    o_chars = list(original_text)
    t_chars = list(typed_text)
    char_match = 0
    for i in range(max(len(o_chars), len(t_chars))):
        oc = o_chars[i] if i < len(o_chars) else None
        tc = t_chars[i] if i < len(t_chars) else None
        if oc is not None and tc is not None and oc == tc:
            char_match += 1
    char_accuracy = (char_match / max(len(o_chars), len(t_chars)) * 100.0) if (o_chars or t_chars) else 100.0

    return {
        'words_expected': words_expected,
        'words_typed': words_typed,
        'correct_words': correct_words,
        'wrong_words': wrong_words,
        'missing_words': missing_words,
        'extra_words': extra_words,
        'gross_wpm': round(gross_wpm, 2),
        'net_wpm': round(net_wpm, 2),
        'word_accuracy': round(word_accuracy, 2),
        'char_accuracy': round(char_accuracy, 2),
        'duration_seconds': round(duration_seconds, 2),
        'word_results': word_results,
    }


def rating_for_net_wpm(net_wpm):
    """Map Net WPM to a grade."""
    if net_wpm >= 90:
        return {'grade': 'A', 'label': 'Excellent', 'css': 'rating-excellent'}
    if net_wpm >= 70:
        return {'grade': 'B', 'label': 'Very Good', 'css': 'rating-very-good'}
    if net_wpm >= 50:
        return {'grade': 'C', 'label': 'Good', 'css': 'rating-good'}
    if net_wpm >= 30:
        return {'grade': 'D', 'label': 'Average', 'css': 'rating-average'}
    return {'grade': 'E', 'label': 'Poor', 'css': 'rating-poor'}


def _fmt(x):
    return 0.0 if not math.isfinite(x) else round(x, 2)
