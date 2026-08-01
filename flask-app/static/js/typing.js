/* ============================================================
   Typing engine — hidden reference + live Net WPM
   Net WPM = (words typed - wrong words) / minutes (live)
   ============================================================ */
(function () {
  const cfg = window.TYPING_TEST;
  if (!cfg) return;

  const REFERENCE = cfg.reference || '';
  const area = document.getElementById('typeArea');
  const timerEl = document.getElementById('timer');
  const liveTime = document.getElementById('liveTime');
  const liveGross = document.getElementById('liveGross');
  const liveNet = document.getElementById('liveNet');
  const liveWrong = document.getElementById('liveWrong');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const finishBtn = document.getElementById('finishBtn');
  const overlay = document.getElementById('countdownOverlay');
  const countdownNumber = document.getElementById('countdownNumber');
  const countdownLabel = document.getElementById('countdownLabel');

  const DRAFT_KEY = 'typing-draft-' + location.pathname + '-' + cfg.title;

  const state = {
    running: false,
    paused: false,
    finished: false,
    startTime: 0,
    elapsedMs: 0,
    interval: null,
    typing: false
  };

  /* ---------------- word scoring (mirrors compare.py) ---------------- */
  function score(typedText) {
    const origWords = REFERENCE.split(/\s+/).filter(Boolean);
    const typedWords = typedText.split(/\s+/).filter(Boolean);
    const maxN = Math.max(origWords.length, typedWords.length);
    let correct = 0, wrong = 0, missing = 0, extra = 0;
    for (let i = 0; i < maxN; i++) {
      const ow = i < origWords.length ? origWords[i] : null;
      const tw = i < typedWords.length ? typedWords[i] : null;
      if (ow !== null && tw !== null && ow === tw) correct++;
      else if (ow !== null && tw !== null) wrong++;
      else if (ow === null) { extra++; wrong++; }
      else missing++;
    }
    return { wordsTyped: typedWords.length, correct, wrong, missing, extra };
  }

  /* ---------------- live stat rendering ---------------- */
  function render() {
    const minutes = state.elapsedMs / 60000;
    const typed = area.value;
    const s = score(typed);

    const gross = minutes > 0 ? (typed.length / 5) / minutes : 0;
    const net = minutes > 0 ? s.correct / minutes : 0;

    const sec = Math.floor(state.elapsedMs / 1000);
    timerEl.textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
    liveTime.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    liveGross.textContent = Math.round(gross);
    liveNet.textContent = net.toFixed(1);
    liveWrong.textContent = s.wrong;

    if (state.running && !state.paused) {
      state.elapsedMs = Date.now() - state.startTime;
    }
  }

  function startTick() {
    if (state.interval) clearInterval(state.interval);
    state.interval = setInterval(render, 250);
  }

  /* ---------------- countdown ---------------- */
  function beginCountdown(cb) {
    overlay.style.display = 'flex';
    let n = 3;
    countdownNumber.textContent = '3';
    countdownLabel.textContent = 'Get ready';
    const tick = setInterval(function () {
      n--;
      if (n > 0) {
        countdownNumber.textContent = String(n);
        countdownLabel.textContent = n === 3 ? 'Get ready' : 'Almost there';
      } else {
        clearInterval(tick);
        countdownNumber.textContent = 'GO';
        countdownLabel.textContent = 'Start typing!';
        setTimeout(function () {
          overlay.style.display = 'none';
          cb();
        }, 500);
      }
    }, 1000);
  }

  function startTest() {
    if (state.running || state.finished) return;
    beginCountdown(function () {
      state.running = true;
      state.paused = false;
      state.typing = true;
      state.startTime = Date.now() - state.elapsedMs;
      startTick();
      area.disabled = false;
      area.focus();
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      render();
    });
  }

  function pauseTest() {
    if (!state.running || state.finished) return;
    state.paused = !state.paused;
    if (state.paused) {
      state.elapsedMs = Date.now() - state.startTime;
      clearInterval(state.interval);
      area.blur();
      pauseBtn.textContent = 'Resume';
    } else {
      state.startTime = Date.now() - state.elapsedMs;
      startTick();
      area.focus();
      pauseBtn.textContent = 'Pause';
    }
    render();
  }

  function resetTest() {
    state.running = state.paused = state.finished = state.typing = false;
    state.elapsedMs = 0;
    if (state.interval) clearInterval(state.interval);
    area.value = '';
    area.disabled = true;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = 'Pause';
    localStorage.removeItem(DRAFT_KEY);
    render();
  }

  /* ---------------- finish & save ---------------- */
  async function finishTest() {
    if (state.finished) return;
    if (!state.typing) { area.focus(); return; }

    state.running = false;
    state.finished = true;
    state.elapsedMs = Date.now() - state.startTime;
    if (state.interval) clearInterval(state.interval);

    finishBtn.disabled = true;
    finishBtn.textContent = 'Saving…';
    area.disabled = true;
    localStorage.removeItem(DRAFT_KEY);

    const durationSeconds = state.elapsedMs / 1000;
    try {
      const res = await fetch(cfg.testUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cfg.title,
          original_text: REFERENCE,
          typed_text: area.value,
          duration_seconds: durationSeconds
        })
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      window.location.href = cfg.resultBase.replace(/\/0$/, '/' + data.id);
    } catch (e) {
      alert('Could not save result. Please retry.\n\n' + e.message);
      finishBtn.disabled = false;
      finishBtn.textContent = 'Finish Ctrl+Enter';
      state.finished = false;
      state.running = true;
      state.typing = true;
      startTick();
    }
  }

  /* ---------------- draft autosave ---------------- */
  function saveDraft() {
    if (!state.finished && area.value) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ text: area.value, elapsed: state.elapsedMs }));
    }
  }

  function restoreDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d.text) return;
      area.value = d.text;
      state.elapsedMs = d.elapsed || 0;
      startBtn.disabled = false;
      render();
    } catch (e) { /* ignore corrupt draft */ }
  }

  /* ---------------- events ---------------- */
  area.addEventListener('input', function () {
    if (state.running && !state.paused) {
      state.elapsedMs = Date.now() - state.startTime;
      render();
      saveDraft();
    }
  });

  area.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      finishTest();
    }
    if (e.key === 'F11') e.preventDefault();
  });

  startBtn.addEventListener('click', startTest);
  pauseBtn.addEventListener('click', pauseTest);
  resetBtn.addEventListener('click', resetTest);
  finishBtn.addEventListener('click', finishTest);

  window.addEventListener('beforeunload', function (e) {
    if (state.running && !state.paused && !state.finished) {
      saveDraft();
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /* ---------------- init ---------------- */
  render();
  if (area.value === '') restoreDraft();
})();
