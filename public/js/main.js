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

function formatDateTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    updateStats();
    saveBtn.disabled = false;
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
    localStorage.setItem('typing-test-active', 'true');
    localStorage.setItem('typing-test-startTime', Date.now().toString());
    window.location.href = '/typing';
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
    window.location.href = '/input';
    return;
  }

  /* ---- State ---- */
  let state = {
    startTime: null,
    elapsed: 0,
    running: false,
    paused: false,
    finished: false,
    firstKey: true,
    backspaceCount: 0,
    totalKeystrokes: 0,
    timerId: null,
    timerMode: localStorage.getItem('typing-timer-mode') || 'unlimited',
    maxDuration: parseInt(localStorage.getItem('typing-max-duration')) || 0,
    timeLimit: 0
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

  const style = document.createElement('style');
  style.textContent = `
    .typing-textarea { -webkit-text-security: none !important; }
  `;
  document.head.appendChild(style);

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

    const now = Date.now();
    state.elapsed = (now - state.startTime) / 1000;

    if (state.timeLimit > 0 && state.elapsed >= state.timeLimit) {
      finishTest();
      return;
    }

    timerDisplay.textContent = formatTime(state.elapsed);
    if (liveElapsed) liveElapsed.textContent = formatTime(state.elapsed);

    updateLiveStats();
    autosaveProgress();

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
      localStorage.setItem('typing-test-startTime', state.startTime.toString());
      localStorage.setItem('typing-test-elapsed', '0');
      timerTick();
    }

    if (e.key === 'Backspace') {
      state.backspaceCount++;
    }
    state.totalKeystrokes++;

    autosaveProgress();
  });

  /* ---- Keyboard Shortcuts ---- */
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      if (!state.finished && state.running) finishTest();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      if (state.running && !state.paused && !state.finished) {
        pauseTest();
      } else if (state.paused) {
        resumeTest();
      }
    }
    if (e.key === 'F11') {
      // F11 is full screen, we let browser handle it
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
    localStorage.setItem('typing-test-paused', 'true');
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
    localStorage.setItem('typing-test-startTime', state.startTime.toString());
    localStorage.setItem('typing-test-paused', 'false');
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
    localStorage.removeItem('typing-test-active');
    localStorage.removeItem('typing-test-startTime');
    localStorage.removeItem('typing-test-elapsed');
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

    localStorage.setItem('typing-test-typed', typedText);
    localStorage.setItem('typing-test-duration', duration.toString());
    localStorage.setItem('typing-test-backspaces', state.backspaceCount.toString());
    localStorage.setItem('typing-test-keystrokes', state.totalKeystrokes.toString());

    localStorage.removeItem('typing-test-active');
    localStorage.removeItem('typing-test-startTime');
    localStorage.removeItem('typing-test-elapsed');
    localStorage.removeItem('typing-test-progress');

    submitTest(originalText, typedText, duration, state.backspaceCount, state.totalKeystrokes);
  }

  finishBtn.addEventListener('click', finishTest);
  finishBtn2.addEventListener('click', finishTest);

  /* ---- Submit ---- */
  async function submitTest(original, typed, duration, backspaces, keystrokes) {
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_text: original,
          typed_text: typed,
          duration_seconds: duration,
          backspace_count: backspaces,
          total_keystrokes: keystrokes
        })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('typing-test-result-id', data.id.toString());
        window.location.href = '/result?id=' + data.id;
      } else {
        alert('Error saving test: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error submitting test. Please check your connection.');
    }
  }

  /* ---- Autosave ---- */
  function autosaveProgress() {
    if (!state.finished && typingArea.value) {
      localStorage.setItem('typing-test-progress', typingArea.value);
    }
  }

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
  const id = params.get('id') || localStorage.getItem('typing-test-result-id');

  if (!id) {
    document.querySelector('.container').innerHTML = '<div class="card"><p class="text-muted text-center">No test result found. <a href="/input">Start a new test</a></p></div>';
    return;
  }

  async function loadResult() {
    try {
      const res = await fetch(`/api/tests/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      displayResult(data);
    } catch (err) {
      document.querySelector('.container').innerHTML = '<div class="card"><p class="text-muted text-center">Test result not found. <a href="/input">Start a new test</a></p></div>';
    }
  }

  function displayResult(data) {
    const rating = getPerformanceRating(data.net_wpm, data.accuracy);

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
    initExports(data);
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
    const filename = `typing-result-${data.id}-${new Date().toISOString().slice(0,10)}`;
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

  loadResult();
}

/* ============================================================
   HISTORY PAGE
   ============================================================ */
function initHistoryPage() {
  if (!document.querySelector('.history-page')) return;

  async function loadHistory() {
    try {
      const [testsRes, statsRes] = await Promise.all([
        fetch('/api/tests'),
        fetch('/api/stats')
      ]);
      const tests = await testsRes.json();
      const stats = await statsRes.json();

      displayStats(stats);
      displayTable(tests);
    } catch (err) {
      console.error('Error loading history:', err);
    }
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
      const rating = getPerformanceRating(t.netWpm || t.net_wpm, t.accuracy);
      const netWpm = t.netWpm || t.net_wpm;
      const duration = t.durationSeconds || t.duration_seconds;
      const wordsTyped = t.wordsTyped || t.words_typed;
      const perfRating = t.performanceRating || t.performance_rating;
      return `<tr>
        <td>${formatDate(t.created_at)}</td>
        <td>${new Date(t.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
        <td>${formatTime(duration)}</td>
        <td><strong>${Math.round(netWpm)}</strong></td>
        <td>${t.accuracy.toFixed(1)}%</td>
        <td>${wordsTyped}</td>
        <td><span class="rating-pill ${getRatingClass(perfRating)}">${perfRating}</span></td>
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
        fetch(`/api/tests/${btn.dataset.id}`).then(r => r.json()).then(data => {
          localStorage.setItem('typing-original-text', data.originalText || data.original_text);
          localStorage.setItem('typing-test-active', 'true');
          localStorage.setItem('typing-test-startTime', Date.now().toString());
          window.location.href = '/typing';
        });
      });
    });
    tbody.querySelectorAll('.delete-test').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this test record?')) return;
        await fetch(`/api/tests/${btn.dataset.id}`, { method: 'DELETE' });
        loadHistory();
      });
    });
  }

  async function viewDetail(id) {
    try {
      const res = await fetch(`/api/tests/${id}`);
      const data = await res.json();
      const modal = document.getElementById('detailModal');
      const body = document.getElementById('detailBody');
      const close = document.getElementById('modalClose');

      const d = data;
      const rating = getPerformanceRating(d.netWpm || d.net_wpm, d.accuracy);
      const netWpm = d.netWpm || d.net_wpm;
      const grossWpm = d.grossWpm || d.gross_wpm;
      const duration = d.durationSeconds || d.duration_seconds;
      const perf = d.performanceRating || d.performance_rating;

      body.innerHTML = `
        <div class="rating-banner" style="margin-bottom:16px">
          <div class="rating-circle" style="width:60px;height:60px"><span class="rating-letter" style="font-size:1.6rem">${rating.letter}</span></div>
          <div class="rating-info"><h3>${perf}</h3></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div><strong>Net WPM:</strong> ${Math.round(netWpm)}</div>
          <div><strong>Gross WPM:</strong> ${Math.round(grossWpm)}</div>
          <div><strong>Accuracy:</strong> ${d.accuracy.toFixed(1)}%</div>
          <div><strong>Duration:</strong> ${formatTime(duration)}</div>
          <div><strong>Correct Words:</strong> ${d.correctWords || d.correct_words}</div>
          <div><strong>Wrong Words:</strong> ${d.incorrectWords || d.incorrect_words}</div>
          <div><strong>Missing Words:</strong> ${d.missingWords || d.missing_words}</div>
          <div><strong>Extra Words:</strong> ${d.extraWords || d.extra_words}</div>
          <div><strong>Correct Chars:</strong> ${d.correctChars || d.correct_chars}</div>
          <div><strong>Wrong Chars:</strong> ${d.incorrectChars || d.incorrect_chars}</div>
          <div><strong>Missing Chars:</strong> ${d.missingChars || d.missing_chars}</div>
          <div><strong>Extra Chars:</strong> ${d.extraChars || d.extra_chars}</div>
          <div><strong>Backspaces:</strong> ${d.backspaceCount || d.backspace_count}</div>
          <div><strong>Total Errors:</strong> ${d.totalErrors || d.total_errors}</div>
          <div><strong>Chars Typed:</strong> ${d.charactersTyped || d.characters_typed}</div>
          <div><strong>Chars/Min:</strong> ${Math.round(d.charactersPerMinute || d.characters_per_minute)}</div>
        </div>
        <div style="margin-top:16px">
          <p style="margin-bottom:4px"><strong>Original Text (first 200 chars):</strong></p>
          <pre style="background:var(--bg-input);padding:12px;border-radius:8px;font-size:0.85rem;white-space:pre-wrap;word-break:break-word">${escapeHtml((d.originalText || d.original_text).slice(0, 200))}${(d.originalText || d.original_text).length > 200 ? '...' : ''}</pre>
        </div>
        <div style="margin-top:12px">
          <a href="/result?id=${d.id}" class="btn btn-sm btn-primary" style="margin-top:8px">View Full Report</a>
        </div>
      `;

      modal.style.display = 'flex';
      close.onclick = () => { modal.style.display = 'none'; };
      modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    } catch (err) {
      console.error('Error loading detail:', err);
    }
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
