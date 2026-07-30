class ComparisonEngine {

  /**
   * Compute character-level diff between original and typed texts.
   * Uses LCS (Longest Common Subsequence) for accurate alignment.
   */
  static compareChars(original, typed) {
    const oLen = original.length;
    const tLen = typed.length;

    if (oLen === 0 && tLen === 0) {
      return { correct: 0, incorrect: 0, missing: 0, extra: 0 };
    }

    const dp = Array.from({ length: oLen + 1 }, () => Array(tLen + 1).fill(0));
    for (let i = 1; i <= oLen; i++) {
      for (let j = 1; j <= tLen; j++) {
        if (original[i - 1] === typed[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    let correct = 0, incorrect = 0, missing = 0, extra = 0;
    let i = oLen, j = tLen;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && original[i - 1] === typed[j - 1]) {
        correct++;
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        extra++;
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        missing++;
        i--;
      } else {
        if (i > 0) { missing++; i--; }
        if (j > 0) { extra++; j--; }
      }
    }

    return { correct, incorrect, missing, extra };
  }

  /**
   * Compare words by splitting on whitespace.
   */
  static compareWords(original, typed) {
    const oWords = original.trim() ? original.trim().split(/\s+/) : [];
    const tWords = typed.trim() ? typed.trim().split(/\s+/) : [];
    const oLen = oWords.length;
    const tLen = tWords.length;

    const dp = Array.from({ length: oLen + 1 }, () => Array(tLen + 1).fill(0));
    for (let i = 1; i <= oLen; i++) {
      for (let j = 1; j <= tLen; j++) {
        if (oWords[i - 1] === tWords[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    let correct = 0, incorrect = 0, missing = 0, extra = 0;
    let i = oLen, j = tLen;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oWords[i - 1] === tWords[j - 1]) {
        correct++;
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        extra++;
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        missing++;
        i--;
      } else {
        if (i > 0) { missing++; i--; }
        if (j > 0) { extra++; j--; }
      }
    }

    const totalWords = correct + incorrect + missing;
    incorrect = totalWords > 0 ? (totalWords - correct) : (tLen > 0 ? 1 : 0);
    if (incorrect < 0) incorrect = 0;

    return { correct, incorrect, missing, extra };
  }

  /**
   * Compute all typing metrics.
   */
  static computeAll(original, typed, durationSeconds, backspaceCount, totalKeystrokes) {
    const charResult = this.compareChars(original, typed);
    const wordResult = this.compareWords(original, typed);

    const charactersTyped = typed.length;
    const correctChars = charResult.correct;
    const incorrectChars = charResult.incorrect;
    const missingChars = charResult.missing;
    const extraChars = charResult.extra;

    const minutes = durationSeconds / 60;
    const totalCharsTyped = charactersTyped;

    const grossWpm = minutes > 0 ? (totalCharsTyped / 5) / minutes : 0;
    const totalErrors = incorrectChars + missingChars + extraChars;
    const errorPercentage = totalCharsTyped > 0 ? (totalErrors / totalCharsTyped) * 100 : 0;
    const netWpm = minutes > 0 ? Math.max(0, grossWpm - (totalErrors / minutes)) : 0;

    const wordsTyped = typed.trim() ? typed.trim().split(/\s+/).length : 0;
    const cpm = minutes > 0 ? totalCharsTyped / minutes : 0;

    const accuracy = totalCharsTyped > 0 ? (correctChars / totalCharsTyped) * 100 : 0;

    let performanceRating = 'Poor';
    if (netWpm >= 80 && accuracy >= 95) performanceRating = 'Excellent';
    else if (netWpm >= 60 && accuracy >= 90) performanceRating = 'Very Good';
    else if (netWpm >= 40 && accuracy >= 85) performanceRating = 'Good';
    else if (netWpm >= 25 && accuracy >= 75) performanceRating = 'Average';

    return {
      originalText: original,
      typedText: typed,
      durationSeconds,
      grossWpm: Math.round(grossWpm * 100) / 100,
      netWpm: Math.round(netWpm * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100,
      correctChars,
      incorrectChars,
      missingChars,
      extraChars,
      correctWords: wordResult.correct,
      incorrectWords: wordResult.incorrect,
      missingWords: wordResult.missing,
      extraWords: wordResult.extra,
      totalKeystrokes,
      backspaceCount,
      totalErrors,
      errorPercentage: Math.round(errorPercentage * 100) / 100,
      wordsTyped,
      charactersPerMinute: Math.round(cpm * 100) / 100,
      charactersTyped: totalCharsTyped,
      timeTakenSeconds: durationSeconds,
      performanceRating
    };
  }
}

module.exports = ComparisonEngine;
