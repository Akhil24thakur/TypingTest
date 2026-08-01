/* ============================================================
   Result page — LCS-based character diff
   ============================================================ */
(function () {
  const cfg = window.RESULT_DATA;
  if (!cfg) return;

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function lcsDiff(original, typed) {
    const o = original.split('');
    const t = typed.split('');
    const oLen = o.length, tLen = t.length;
    const CHUNK = 800;

    function run(o, t) {
      const n = o.length, m = t.length;
      const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          dp[i][j] = o[i - 1] === t[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
      const seq = [];
      let i = n, j = m;
      while (i > 0 && j > 0) {
        if (o[i - 1] === t[j - 1]) { seq.unshift({ type: 'correct', oc: o[i - 1], tc: t[j - 1] }); i--; j--; }
        else if (dp[i - 1][j] >= dp[i][j - 1]) { seq.unshift({ type: 'missing', oc: o[i - 1], tc: null }); i--; }
        else { seq.unshift({ type: 'extra', oc: null, tc: t[j - 1] }); j--; }
      }
      while (i > 0) { seq.unshift({ type: 'missing', oc: o[i - 1], tc: null }); i--; }
      while (j > 0) { seq.unshift({ type: 'extra', oc: null, tc: t[j - 1] }); j--; }
      return seq;
    }

    if (Math.max(oLen, tLen) <= CHUNK) return run(o, t);

    const seq = [];
    const chunkCount = Math.max(Math.ceil(oLen / CHUNK), Math.ceil(tLen / CHUNK));
    for (let c = 0; c < chunkCount; c++) {
      const os = c * CHUNK, oe = Math.min((c + 1) * CHUNK, oLen);
      const ts = c * CHUNK, te = Math.min((c + 1) * CHUNK, tLen);
      seq.push.apply(seq, run(o.slice(os, oe), t.slice(ts, te)));
    }
    return seq;
  }

  function mergeSubstitutions(seq) {
    const merged = [];
    for (const item of seq) {
      const last = merged[merged.length - 1];
      if (item.type === 'missing' && last && last.type === 'extra') {
        merged.pop();
        merged.push({ type: 'incorrect', oc: item.oc, tc: last.tc });
      } else if (item.type === 'extra' && last && last.type === 'missing') {
        merged.pop();
        merged.push({ type: 'incorrect', oc: last.oc, tc: item.tc });
      } else {
        merged.push(item);
      }
    }
    return merged;
  }

  const seq = mergeSubstitutions(lcsDiff(cfg.original, cfg.typed));

  const diffOrig = document.getElementById('diffOriginal');
  const diffTyped = document.getElementById('diffTyped');

  let origHtml = '', typedHtml = '';
  for (const m of seq) {
    if (m.type === 'correct') {
      origHtml += `<span class="diff-correct">${escapeHtml(m.oc)}</span>`;
      typedHtml += `<span class="diff-correct">${escapeHtml(m.tc)}</span>`;
    } else if (m.type === 'incorrect') {
      origHtml += `<span class="diff-incorrect">${escapeHtml(m.oc)}</span>`;
      typedHtml += `<span class="diff-incorrect">${escapeHtml(m.tc)}</span>`;
    } else if (m.type === 'missing') {
      origHtml += `<span class="diff-missing">${escapeHtml(m.oc)}</span>`;
    } else if (m.type === 'extra') {
      typedHtml += `<span class="diff-extra">${escapeHtml(m.tc)}</span>`;
    }
  }

  diffOrig.innerHTML = origHtml || '<em>(empty)</em>';
  diffTyped.innerHTML = typedHtml || '<em>(empty)</em>';

  const printBtn = document.getElementById('printBtn');
  if (printBtn) {
    printBtn.addEventListener('click', function () { window.print(); });
  }
})();
