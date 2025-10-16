// Lightweight Lab Enhancer: hints, attempts, timer, completion dispatch
(function(){
  'use strict';

  function onReady(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);} else {fn();} }

  function getModuleIdFromPath(){
    // Matches /labs/A01 or /module/A01/lab or query hints
    const path = location.pathname;
    const m1 = path.match(/\/labs\/(A\d{2})/i);
    if (m1) return m1[1].toUpperCase();
    const m2 = path.match(/\/module\/(A\d{2})\/lab/i);
    if (m2) return m2[1].toUpperCase();
    // Fallback from content if present
    const header = document.querySelector('.section-header h1');
    if (header){ const m3 = header.textContent.match(/(A\d{2})/i); if(m3) return m3[1].toUpperCase(); }
    return null;
  }

  function createToolbar(){
    const bar = document.createElement('div');
    bar.className = 'lab-toolbar';
    bar.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:flex-end;margin:8px 0;';
    bar.innerHTML = `
      <button class="btn btn--outline btn--sm" id="lab-hint-btn">💡 Hint</button>
      <button class="btn btn--outline btn--sm" id="lab-reset-btn">↺ Reset</button>
      <span id="lab-timer" style="font-size:12px;color:var(--color-text-secondary)">⏱️ 00:00</span>
    `;
    return bar;
  }

  function formatTime(s){ const m = Math.floor(s/60); const r = s%60; return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`; }

  function attachEnhancements(){
    const moduleId = getModuleIdFromPath();
    if (!moduleId) return;

    // Identify primary lab card/container to inject toolbar
    const cardBody = document.querySelector('.card .card__body') || document.querySelector('.card');
    if (!cardBody) return;

    const toolbar = createToolbar();
    cardBody.parentNode.insertBefore(toolbar, cardBody.nextSibling);

    // Attempts tracking
    const storageKey = `lab_attempts:${moduleId}`;
    const startKey = `lab_start:${moduleId}`;
    const completedKey = `lab_completed:${moduleId}`;

    let attempts = parseInt(localStorage.getItem(storageKey) || '0', 10) || 0;
    let startTs = parseInt(localStorage.getItem(startKey) || String(Date.now()), 10);
    localStorage.setItem(startKey, String(startTs));

    // Timer
    const timerEl = document.getElementById('lab-timer');
    let timerInt = null;
    function startTimer(){
      if (!timerEl) return; 
      if (timerInt) clearInterval(timerInt);
      timerInt = setInterval(()=>{
        const elapsed = Math.floor((Date.now() - startTs)/1000);
        timerEl.textContent = `⏱️ ${formatTime(elapsed)}`;
      }, 1000);
    }
    startTimer();

    // Progressive hints
    const HINTS = {
      A01: [
        'Try changing the id parameter to a different number.',
        'Look for a profile id you do not own.',
        'Authorization is missing; IDs are directly used without checks.'
      ],
      A03: [
        'Classic injection uses quotes and tautologies.',
        "Try: ' OR '1'='1",
        'Consider comment sequences to bypass the rest of the query.'
      ]
    };

    function nextHint(){
      const hints = HINTS[moduleId] || ['Think about the core weakness described in this module.'];
      const idx = Math.min(attempts, hints.length - 1);
      const msg = hints[idx];
      showStatus(msg, 'warning');
    }

    // Status helper
    function showStatus(text, level){
      const div = document.createElement('div');
      div.className = `status status--${level||'info'}`;
      div.style.marginTop = '8px';
      div.textContent = text;
      cardBody.appendChild(div);
      setTimeout(()=>{ if(div.parentNode) div.parentNode.removeChild(div); }, 6000);
    }

    // Reset handler
    document.getElementById('lab-reset-btn')?.addEventListener('click', function(){
      attempts = 0; localStorage.setItem(storageKey, String(attempts));
      startTs = Date.now(); localStorage.setItem(startKey, String(startTs));
      startTimer();
      showStatus('Lab reset. Timer and attempts cleared.', 'info');
    });

    // Hint handler
    document.getElementById('lab-hint-btn')?.addEventListener('click', function(){
      nextHint();
    });

    // Form attempt tracking (increment on submit with error)
    document.addEventListener('submit', function(e){
      // Wait a tick to see if an error status appears
      setTimeout(()=>{
        const hasError = !!document.querySelector('.status--error');
        const hasSuccess = !!document.querySelector('.status--success');
        if (hasError && !hasSuccess){
          attempts += 1; localStorage.setItem(storageKey, String(attempts));
          if (attempts === 1 || attempts === 3 || attempts === 5) nextHint();
        }
        if (hasSuccess){
          maybeComplete();
        }
      }, 50);
    }, true);

    function maybeComplete(){
      if (localStorage.getItem(completedKey) === '1') return;
      localStorage.setItem(completedKey, '1');
      const elapsed = Math.floor((Date.now() - startTs)/1000);
      // Gamification event
      try {
        if (window.gamificationEngine) {
          document.dispatchEvent(new CustomEvent('activityCompleted', {
            detail: { moduleId, activityType: 'lab', data: { score: 100, timeSpent: elapsed } }
          }));
        } else if (window.app && typeof window.app.completeActivity === 'function') {
          window.app.completeActivity(moduleId, 'lab', { score: 100, timeSpent: elapsed });
        }
      } catch(_){}
      // Success flair
      showStatus(`✅ Lab completed! Time: ${formatTime(elapsed)} • Attempts: ${attempts}. Click "Mark as Complete & Go to Assessment" to continue.`, 'success');
      // DO NOT auto-redirect - let user click the "Mark as Complete & Go to Assessment" button
    }

    // Auto-detect success from backend-provided success notes
    const hasInitialSuccess = !!document.querySelector('.status--success');
    if (hasInitialSuccess) { setTimeout(maybeComplete, 10); }
  }

  onReady(attachEnhancements);
})();


