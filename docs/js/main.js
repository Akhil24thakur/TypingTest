/* ============================================================
   COMPARISON ENGINE — Client-Side
   ============================================================ */
function compareChars(original, typed) {
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

function compareWords(original, typed) {
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

function computeAll(original, typed, durationSeconds, backspaceCount, totalKeystrokes) {
  const charResult = compareChars(original, typed);
  const wordResult = compareWords(original, typed);

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

/* ============================================================
   LOCALSTORAGE HISTORY STORE
   ============================================================ */
const HISTORY_KEY = 'typing-history';

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveTest(test) {
  const history = getHistory();
  test.id = history.length ? Math.max(...history.map(t => t.id)) + 1 : 1;
  test.created_at = new Date().toISOString();
  history.unshift(test);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return test;
}

function getTestById(id) {
  return getHistory().find(t => t.id === id) || null;
}

function deleteTest(id) {
  const history = getHistory().filter(t => t.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function getStats() {
  const tests = getHistory();
  const count = tests.length;
  if (count === 0) {
    return {
      total_tests: 0, avg_wpm: 0, highest_wpm: 0, highest_accuracy: 0,
      avg_accuracy: 0, longest_test: 0, total_practice_time: 0,
      total_words_typed: 0, total_characters_typed: 0
    };
  }
  return {
    total_tests: count,
    avg_wpm: Math.round(tests.reduce((s, t) => s + t.netWpm, 0) / count * 100) / 100,
    highest_wpm: Math.max(...tests.map(t => t.netWpm)),
    highest_accuracy: Math.round(Math.max(...tests.map(t => t.accuracy)) * 100) / 100,
    avg_accuracy: Math.round(tests.reduce((s, t) => s + t.accuracy, 0) / count * 100) / 100,
    longest_test: Math.max(...tests.map(t => t.durationSeconds)),
    total_practice_time: Math.round(tests.reduce((s, t) => s + t.durationSeconds, 0) * 100) / 100,
    total_words_typed: tests.reduce((s, t) => s + t.wordsTyped, 0),
    total_characters_typed: tests.reduce((s, t) => s + t.charactersTyped, 0)
  };
}

/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */
function $(id) { return document.getElementById(id); }

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getPerformanceRating(netWpm, accuracy) {
  if (netWpm >= 80 && accuracy >= 95) return { label: 'Excellent', letter: 'A', cls: 'rating-excellent' };
  if (netWpm >= 60 && accuracy >= 90) return { label: 'Very Good', letter: 'B', cls: 'rating-very-good' };
  if (netWpm >= 40 && accuracy >= 85) return { label: 'Good', letter: 'C', cls: 'rating-good' };
  if (netWpm >= 25 && accuracy >= 75) return { label: 'Average', letter: 'D', cls: 'rating-average' };
  return { label: 'Poor', letter: 'F', cls: 'rating-poor' };
}

function getRatingClass(rating) {
  const map = {
    'Excellent': 'rating-excellent',
    'Very Good': 'rating-very-good',
    'Good': 'rating-good',
    'Average': 'rating-average',
    'Poor': 'rating-poor'
  };
  return map[rating] || 'rating-average';
}

/* ============================================================
   THEME TOGGLE
   ============================================================ */
function initTheme() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  const icon = toggle.querySelector('.theme-icon');
  const saved = localStorage.getItem('typing-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  icon.textContent = saved === 'dark' ? '☀️' : saved === 'professional' ? '💼' : '🌙';
  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const themes = ['light', 'dark', 'professional'];
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('typing-theme', next);
    icon.textContent = next === 'dark' ? '☀️' : next === 'professional' ? '💼' : '🌙';
  });
}

/* ============================================================
   INPUT PAGE
   ============================================================ */
function initInputPage() {
  const textarea = document.getElementById('originalText');
  const wordCount = document.getElementById('wordCount');
  const charCount = document.getElementById('charCount');
  const readingTime = document.getElementById('readingTime');
  const saveBtn = document.getElementById('saveTextBtn');
  const startBtn = document.getElementById('startTestBtn');
  const savedAlert = document.getElementById('savedAlert');

  if (!textarea) return;

  const autoSaved = localStorage.getItem('typing-original-text');
  if (autoSaved) {
    textarea.value = autoSaved;
  }

  function updateStats() {
    const text = textarea.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const mins = Math.max(1, Math.ceil(words / 200));
    wordCount.textContent = `${words} words`;
    charCount.textContent = `${chars} characters`;
    readingTime.textContent = `~${mins} min read`;
    saveBtn.disabled = !text;
    startBtn.disabled = !text;
  }

  textarea.addEventListener('input', updateStats);

  saveBtn.addEventListener('click', () => {
    localStorage.setItem('typing-original-text', textarea.value);
    savedAlert.style.display = 'block';
    setTimeout(() => { savedAlert.style.display = 'none'; }, 3000);
  });

  startBtn.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (!text) return;
    localStorage.setItem('typing-original-text', text);
    window.location.href = 'typing.html';
  });

  updateStats();
}

/* ============================================================
   TYPING PAGE — CORE ENGINE
   ============================================================ */
function initTypingPage() {
  const typingArea = document.getElementById('typingArea');
  const finishBtn = document.getElementById('finishBtn');
  const finishBtn2 = document.getElementById('finishBtn2');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const restartBtn = document.getElementById('restartBtn');
  const resumeFromPause = document.getElementById('resumeFromPause');
  const timerDisplay = document.getElementById('timerDisplay');
  const liveWpm = document.getElementById('liveWpm');
  const liveWords = document.getElementById('liveWords');
  const liveChars = document.getElementById('liveChars');
  const liveElapsed = document.getElementById('liveElapsed');
  const typingStats = document.getElementById('typingStats');
  const typingControls = document.getElementById('typingControls');
  const countdownOverlay = document.getElementById('countdownOverlay');
  const countdownNumber = document.getElementById('countdownNumber');
  const pauseModal = document.getElementById('pauseModal');

  if (!typingArea) return;

  const originalText = localStorage.getItem('typing-original-text') || '';
  if (!originalText) {
    window.location.href = 'input.html';
    return;
  }

  let state = {
    startTime: null,
    elapsed: 0,
    running: false,
    paused: false,
    finished: false,
    firstKey: true,
    backspaceCount: 0,
    totalKeystrokes: 0,
    timerId: null
  };

  /* ---- Keyboard Security ---- */
  ['copy', 'cut', 'paste', 'drag', 'drop', 'contextmenu'].forEach(evt => {
    document.addEventListener(evt, e => {
      if (e.target === typingArea || e.target.closest('.typing-area')) e.preventDefault();
    });
  });

  typingArea.setAttribute('autocomplete', 'off');
  typingArea.setAttribute('autocorrect', 'off');
  typingArea.setAttribute('autocapitalize', 'off');
  typingArea.setAttribute('spellcheck', 'false');
  typingArea.setAttribute('data-gramm', 'false');
  typingArea.setAttribute('data-gramm_editor', 'false');
  typingArea.setAttribute('data-enable-grammarly', 'false');

  /* ---- Countdown ---- */
  let countdownVal = 3;
  countdownNumber.textContent = '3';
  countdownOverlay.style.display = 'flex';

  const countInterval = setInterval(() => {
    countdownVal--;
    if (countdownVal > 0) {
      countdownNumber.textContent = countdownVal;
    } else if (countdownVal === 0) {
      countdownNumber.textContent = 'Go!';
      countdownNumber.style.fontSize = '5rem';
    } else {
      clearInterval(countInterval);
      countdownOverlay.style.display = 'none';
      typingArea.disabled = false;
      typingArea.focus();
      typingStats.style.display = 'flex';
      typingControls.style.display = 'flex';
      pauseBtn.style.display = 'inline-flex';
      finishBtn.style.display = 'inline-flex';
      state.running = true;
      state.startTime = Date.now();
      state.elapsed = 0;
    }
  }, 1000);

  /* ---- Timer ---- */
  function timerTick() {
    if (!state.running || state.paused || state.finished) return;
    state.elapsed = (Date.now() - state.startTime) / 1000;

    timerDisplay.textContent = formatTime(state.elapsed);
    if (liveElapsed) liveElapsed.textContent = formatTime(state.elapsed);
    updateLiveStats();

    state.timerId = requestAnimationFrame(timerTick);
  }

  function updateLiveStats() {
    const text = typingArea.value;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const minutes = state.elapsed / 60;
    const wpm = minutes > 0 ? Math.round((chars / 5) / minutes) : 0;

    if (liveWords) liveWords.textContent = words;
    if (liveChars) liveChars.textContent = chars;
    if (liveWpm) liveWpm.textContent = wpm;
  }

  /* ---- First Key Start ---- */
  typingArea.addEventListener('keydown', (e) => {
    if (state.firstKey && !state.paused && !state.finished) {
      state.firstKey = false;
      state.startTime = Date.now();
      state.elapsed = 0;
      timerTick();
    }

    if (e.key === 'Backspace') state.backspaceCount++;
    state.totalKeystrokes++;

    if (typingArea.value) {
      localStorage.setItem('typing-test-progress', typingArea.value);
    }
  });

  /* ---- Keyboard Shortcuts ---- */
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter' && state.running && !state.paused && !state.finished) {
      e.preventDefault();
      finishTest();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (state.running && !state.paused && !state.finished) {
        pauseTest();
      } else if (state.paused) {
        resumeTest();
      }
    }
  });

  /* ---- Pause / Resume ---- */
  function pauseTest() {
    if (state.paused || state.finished || !state.running) return;
    state.paused = true;
    typingArea.disabled = true;
    pauseBtn.style.display = 'none';
    resumeBtn.style.display = 'inline-flex';
    pauseModal.style.display = 'flex';
    cancelAnimationFrame(state.timerId);
  }

  function resumeTest() {
    if (!state.paused) return;
    state.paused = false;
    typingArea.disabled = false;
    typingArea.focus();
    pauseBtn.style.display = 'inline-flex';
    resumeBtn.style.display = 'none';
    pauseModal.style.display = 'none';
    state.startTime = Date.now() - (state.elapsed * 1000);
    timerTick();
  }

  pauseBtn.addEventListener('click', pauseTest);
  resumeBtn.addEventListener('click', resumeTest);
  resumeFromPause.addEventListener('click', resumeTest);

  /* ---- Restart ---- */
  restartBtn.addEventListener('click', () => {
    if (!confirm('Are you sure you want to restart? All progress will be lost.')) return;
    state.finished = true;
    cancelAnimationFrame(state.timerId);
    typingArea.value = '';
    localStorage.removeItem('typing-test-progress');
    window.location.reload();
  });

  /* ---- Finish ---- */
  function finishTest() {
    if (state.finished) return;
    state.finished = true;
    state.running = false;
    cancelAnimationFrame(state.timerId);
    typingArea.disabled = true;

    const typedText = typingArea.value;
    const duration = state.elapsed;

    pauseBtn.style.display = 'none';
    finishBtn.style.display = 'none';
    finishBtn2.style.display = 'none';

    const metrics = computeAll(originalText, typedText, duration, state.backspaceCount, state.totalKeystrokes);
    const saved = saveTest(metrics);

    localStorage.removeItem('typing-test-progress');
    localStorage.setItem('typing-last-result-id', saved.id.toString());
    window.location.href = 'result.html?id=' + saved.id;
  }

  finishBtn.addEventListener('click', finishTest);
  finishBtn2.addEventListener('click', finishTest);

  /* ---- Restore autosaved progress ---- */
  const savedProgress = localStorage.getItem('typing-test-progress');
  if (savedProgress) {
    typingArea.value = savedProgress;
  }

  /* ---- Warn before leaving ---- */
  window.addEventListener('beforeunload', (e) => {
    if (state.running && !state.finished && typingArea.value.length > 0) {
      e.preventDefault();
      e.returnValue = 'You have an ongoing typing test. Are you sure you want to leave?';
    }
  });
}

/* ============================================================
   RESULT PAGE
   ============================================================ */
function initResultPage() {
  if (!document.querySelector('.result-page')) return;

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id') || localStorage.getItem('typing-last-result-id'));

  if (!id) {
    document.querySelector('.container').innerHTML = '<div class="card"><p class="text-muted text-center">No test result found. <a href="input.html">Start a new test</a></p></div>';
    return;
  }

  const data = getTestById(id);
  if (!data) {
    document.querySelector('.container').innerHTML = '<div class="card"><p class="text-muted text-center">Test result not found. <a href="input.html">Start a new test</a></p></div>';
    return;
  }

  displayResult(data);
  initExports(data);

  function displayResult(data) {
    const rating = getPerformanceRating(data.netWpm, data.accuracy);

    document.getElementById('ratingLetter').textContent = rating.letter;
    document.getElementById('ratingTitle').textContent = data.performanceRating;
    document.getElementById('ratingDesc').textContent = getRatingDescription(data.performanceRating);

    document.getElementById('metricTime').textContent = formatTime(data.durationSeconds);
    document.getElementById('metricGrossWpm').textContent = Math.round(data.grossWpm);
    document.getElementById('metricNetWpm').textContent = Math.round(data.netWpm);
    document.getElementById('metricAccuracy').textContent = data.accuracy.toFixed(1) + '%';
    document.getElementById('metricChars').textContent = data.charactersTyped;
    document.getElementById('metricCpm').textContent = Math.round(data.charactersPerMinute);
    document.getElementById('metricErrors').textContent = data.totalErrors;
    document.getElementById('metricBackspaces').textContent = data.backspaceCount;

    document.getElementById('correctWords').textContent = data.correctWords;
    document.getElementById('incorrectWords').textContent = data.incorrectWords;
    document.getElementById('missingWords').textContent = data.missingWords;
    document.getElementById('extraWords').textContent = data.extraWords;

    document.getElementById('correctChars').textContent = data.correctChars;
    document.getElementById('incorrectChars').textContent = data.incorrectChars;
    document.getElementById('missingChars').textContent = data.missingChars;
    document.getElementById('extraChars').textContent = data.extraChars;

    renderDiff(data.originalText, data.typedText);
  }

  function getRatingDescription(rating) {
    const map = {
      'Excellent': 'Outstanding performance! You are ready for any typing exam.',
      'Very Good': 'Great work! Consistent speed with high accuracy.',
      'Good': 'Solid performance. Keep practicing to improve further.',
      'Average': 'Good start. Focus on accuracy and gradually increase speed.',
      'Poor': 'Keep practicing regularly. Speed and accuracy will improve with time.'
    };
    return map[rating] || '';
  }

  function renderDiff(original, typed) {
    const diffOrig = document.getElementById('diffOriginal');
    const diffTyped = document.getElementById('diffTyped');

    const oChars = original.split('');
    const tChars = typed.split('');
    const maxLen = Math.max(oChars.length, tChars.length);

    let origHtml = '', typedHtml = '';

    for (let i = 0; i < maxLen; i++) {
      const oc = oChars[i] || '';
      const tc = tChars[i] || '';

      if (oc === tc) {
        origHtml += `<span class="diff-correct">${escapeHtml(oc)}</span>`;
        typedHtml += `<span class="diff-correct">${escapeHtml(tc)}</span>`;
      } else if (oc && tc) {
        origHtml += `<span class="diff-incorrect">${escapeHtml(oc)}</span>`;
        typedHtml += `<span class="diff-incorrect">${escapeHtml(tc)}</span>`;
      } else if (oc && !tc) {
        origHtml += `<span class="diff-missing">${escapeHtml(oc)}</span>`;
      } else if (!oc && tc) {
        typedHtml += `<span class="diff-extra">${escapeHtml(tc)}</span>`;
      }
    }

    diffOrig.innerHTML = origHtml || '<em>(empty)</em>';
    diffTyped.innerHTML = typedHtml || '<em>(empty)</em>';
  }

  function initExports(data) {
    document.getElementById('exportPdfBtn').addEventListener('click', () => exportResult('pdf', data));
    document.getElementById('exportCsvBtn').addEventListener('click', () => exportResult('csv', data));
    document.getElementById('exportJsonBtn').addEventListener('click', () => exportResult('json', data));
  }

  function exportResult(format, data) {
    const filename = `typing-result-${data.id}-${new Date().toISOString().slice(0, 10)}`;
    let content, mimeType, ext;

    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        ext = 'json';
        break;
      case 'csv': {
        const headers = 'Metric,Value\n';
        const rows = [
          `Gross WPM,${data.grossWpm}`,
          `Net WPM,${data.netWpm}`,
          `Accuracy,${data.accuracy}%`,
          `Correct Chars,${data.correctChars}`,
          `Incorrect Chars,${data.incorrectChars}`,
          `Missing Chars,${data.missingChars}`,
          `Extra Chars,${data.extraChars}`,
          `Correct Words,${data.correctWords}`,
          `Incorrect Words,${data.incorrectWords}`,
          `Missing Words,${data.missingWords}`,
          `Extra Words,${data.extraWords}`,
          `Duration,${data.durationSeconds}s`,
          `Backspaces,${data.backspaceCount}`,
          `Total Errors,${data.totalErrors}`,
          `Rating,${data.performanceRating}`
        ];
        content = headers + rows.join('\n');
        mimeType = 'text/csv';
        ext = 'csv';
        break;
      }
      case 'pdf':
        content = generatePdfHtml(data);
        mimeType = 'text/html';
        ext = 'html';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function generatePdfHtml(data) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Typing Test Result</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:0 auto}
    h1{color:#1a56db;border-bottom:2px solid #1a56db;padding-bottom:10px}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    td,th{padding:10px 12px;text-align:left;border-bottom:1px solid #ddd}
    th{background:#f3f6fa;font-weight:600}
    .rating{font-size:1.4rem;font-weight:700;color:#1a56db;text-align:center;padding:20px;background:#e8effd;border-radius:8px;margin:20px 0}
    </style></head><body>
    <h1>Typing Test Result</h1>
    <div class="rating">Performance: ${data.performanceRating} | Net WPM: ${Math.round(data.netWpm)} | Accuracy: ${data.accuracy.toFixed(1)}%</div>
    <table>
    <tr><th>Metric</th><th>Value</th></tr>
    <tr><td>Gross WPM</td><td>${data.grossWpm}</td></tr>
    <tr><td>Net WPM</td><td>${data.netWpm}</td></tr>
    <tr><td>Accuracy</td><td>${data.accuracy}%</td></tr>
    <tr><td>Characters Typed</td><td>${data.charactersTyped}</td></tr>
    <tr><td>Correct Characters</td><td>${data.correctChars}</td></tr>
    <tr><td>Incorrect Characters</td><td>${data.incorrectChars}</td></tr>
    <tr><td>Missing Characters</td><td>${data.missingChars}</td></tr>
    <tr><td>Extra Characters</td><td>${data.extraChars}</td></tr>
    <tr><td>Correct Words</td><td>${data.correctWords}</td></tr>
    <tr><td>Incorrect Words</td><td>${data.incorrectWords}</td></tr>
    <tr><td>Missing Words</td><td>${data.missingWords}</td></tr>
    <tr><td>Extra Words</td><td>${data.extraWords}</td></tr>
    <tr><td>Duration</td><td>${data.durationSeconds}s</td></tr>
    <tr><td>Backspaces</td><td>${data.backspaceCount}</td></tr>
    <tr><td>Total Errors</td><td>${data.totalErrors}</td></tr>
    <tr><td>Chars Per Minute</td><td>${data.charactersPerMinute}</td></tr>
    <tr><td>Total Keystrokes</td><td>${data.totalKeystrokes}</td></tr>
    <tr><td>Rating</td><td>${data.performanceRating}</td></tr>
    </table>
    <p style="color:#999;font-size:0.8rem;margin-top:40px">Generated by Typing Practice App | ${new Date().toLocaleString()}</p>
    </body></html>`;
  }
}

/* ============================================================
   HISTORY PAGE
   ============================================================ */
function initHistoryPage() {
  if (!document.querySelector('.history-page')) return;

  function loadHistory() {
    const tests = getHistory();
    const stats = getStats();
    displayStats(stats);
    displayTable(tests);
  }

  function displayStats(stats) {
    document.getElementById('statAvgWpm').textContent = Math.round(stats.avg_wpm);
    document.getElementById('statHighestWpm').textContent = Math.round(stats.highest_wpm);
    document.getElementById('statHighestAccuracy').textContent = stats.highest_accuracy.toFixed(1) + '%';
    document.getElementById('statAvgAccuracy').textContent = stats.avg_accuracy.toFixed(1) + '%';
    document.getElementById('statLongestTest').textContent = formatTime(stats.longest_test);
    document.getElementById('statTotalTime').textContent = Math.round(stats.total_practice_time / 60) + ' min';
    document.getElementById('statTotalWords').textContent = stats.total_words_typed;
    document.getElementById('statTotalChars').textContent = stats.total_characters_typed;
  }

  function displayTable(tests) {
    const tbody = document.getElementById('historyBody');
    if (!tests.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No test history yet.</td></tr>';
      return;
    }

    tbody.innerHTML = tests.map(t => {
      const rating = getPerformanceRating(t.netWpm, t.accuracy);
      return `<tr>
        <td>${formatDate(t.created_at)}</td>
        <td>${new Date(t.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
        <td>${formatTime(t.durationSeconds)}</td>
        <td><strong>${Math.round(t.netWpm)}</strong></td>
        <td>${t.accuracy.toFixed(1)}%</td>
        <td>${t.wordsTyped}</td>
        <td><span class="rating-pill ${getRatingClass(t.performanceRating)}">${t.performanceRating}</span></td>
        <td>
          <button class="action-btn view-detail" data-id="${t.id}" title="View Details">👁</button>
          <button class="action-btn retake-test" data-id="${t.id}" title="Retake">🔄</button>
          <button class="action-btn danger delete-test" data-id="${t.id}" title="Delete">🗑</button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('.view-detail').forEach(btn => {
      btn.addEventListener('click', () => viewDetail(parseInt(btn.dataset.id)));
    });
    tbody.querySelectorAll('.retake-test').forEach(btn => {
      btn.addEventListener('click', () => {
        const data = getTestById(parseInt(btn.dataset.id));
        localStorage.setItem('typing-original-text', data.originalText);
        window.location.href = 'typing.html';
      });
    });
    tbody.querySelectorAll('.delete-test').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this test record?')) return;
        deleteTest(parseInt(btn.dataset.id));
        loadHistory();
      });
    });
  }

  function viewDetail(id) {
    const data = getTestById(id);
    if (!data) return;

    const modal = document.getElementById('detailModal');
    const body = document.getElementById('detailBody');
    const close = document.getElementById('modalClose');

    const rating = getPerformanceRating(data.netWpm, data.accuracy);

    body.innerHTML = `
      <div class="rating-banner" style="margin-bottom:16px">
        <div class="rating-circle" style="width:60px;height:60px"><span class="rating-letter" style="font-size:1.6rem">${rating.letter}</span></div>
        <div class="rating-info"><h3>${data.performanceRating}</h3></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><strong>Net WPM:</strong> ${Math.round(data.netWpm)}</div>
        <div><strong>Gross WPM:</strong> ${Math.round(data.grossWpm)}</div>
        <div><strong>Accuracy:</strong> ${data.accuracy.toFixed(1)}%</div>
        <div><strong>Duration:</strong> ${formatTime(data.durationSeconds)}</div>
        <div><strong>Correct Words:</strong> ${data.correctWords}</div>
        <div><strong>Wrong Words:</strong> ${data.incorrectWords}</div>
        <div><strong>Missing Words:</strong> ${data.missingWords}</div>
        <div><strong>Extra Words:</strong> ${data.extraWords}</div>
        <div><strong>Correct Chars:</strong> ${data.correctChars}</div>
        <div><strong>Wrong Chars:</strong> ${data.incorrectChars}</div>
        <div><strong>Missing Chars:</strong> ${data.missingChars}</div>
        <div><strong>Extra Chars:</strong> ${data.extraChars}</div>
        <div><strong>Backspaces:</strong> ${data.backspaceCount}</div>
        <div><strong>Total Errors:</strong> ${data.totalErrors}</div>
        <div><strong>Chars Typed:</strong> ${data.charactersTyped}</div>
        <div><strong>Chars/Min:</strong> ${Math.round(data.charactersPerMinute)}</div>
      </div>
      <div style="margin-top:16px">
        <p style="margin-bottom:4px"><strong>Original Text (first 200 chars):</strong></p>
        <pre style="background:var(--bg-input);padding:12px;border-radius:8px;font-size:0.85rem;white-space:pre-wrap;word-break:break-word">${escapeHtml(data.originalText.slice(0, 200))}${data.originalText.length > 200 ? '...' : ''}</pre>
      </div>
      <div style="margin-top:12px">
        <a href="result.html?id=${data.id}" class="btn btn-sm btn-primary" style="margin-top:8px">View Full Report</a>
      </div>
    `;

    modal.style.display = 'flex';
    close.onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
  }

  document.getElementById('refreshHistory')?.addEventListener('click', loadHistory);

  loadHistory();
}

/* ============================================================
   INIT — Run on page load
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initInputPage();
  initTypingPage();
  initResultPage();
  initHistoryPage();
});
