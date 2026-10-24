(() => {
  'use strict';
  // Explanation states only. No playback, timers, model calls, storage or external execution.
  document.querySelectorAll('[data-scene]').forEach(scene => {
    const records = [...scene.querySelectorAll('.scene-transcript li')];
    const title = scene.querySelector('.scene-live-step strong');
    const action = scene.querySelector('[data-live-action]');
    const observation = scene.querySelector('[data-live-observation]');
    const prev = scene.querySelector('[data-prev]');
    const next = scene.querySelector('[data-next]');
    const counter = scene.querySelector('[data-counter]');
    const steps = [...scene.querySelectorAll('button[data-step]')];
    if (!records.length || !title || !action || !observation || !prev || !next || !counter) return;
    let current = 0;
    const render = index => {
      const prevFocused = document.activeElement === prev;
      const nextFocused = document.activeElement === next;
      current = Math.max(0, Math.min(records.length - 1, index));
      scene.dataset.current = String(current);
      const record = records[current];
      title.textContent = `${current + 1} / ${records.length} · ${record.querySelector('[data-step-title]').textContent}`;
      action.textContent = record.querySelector('[data-step-action]').textContent;
      observation.textContent = record.querySelector('[data-step-observation]').textContent;
      counter.textContent = `${current + 1} / ${records.length}`;
      prev.disabled = current === 0;
      next.disabled = current === records.length - 1;
      steps.forEach((button, i) => button.setAttribute('aria-pressed', String(i === current)));
      scene.querySelectorAll('.qa-actual [data-status]').forEach(row => {
        row.hidden = current >= 4 && row.dataset.status !== 'reviewed';
      });
      scene.querySelectorAll('[data-phase]').forEach(node => {
        const active = Number(node.dataset.phase) === current || (current === 1 && node.closest('.flow-branches'));
        node.classList.toggle('is-current', Boolean(active));
      });
      const context = current === 2 ? 'a' : current === 3 ? 'b' : 'unknown';
      scene.querySelectorAll('[data-context-view]').forEach(view => { view.hidden = view.dataset.contextView !== context; });
      if (prevFocused && prev.disabled) next.focus();
      else if (nextFocused && next.disabled) prev.focus();
    };
    prev.addEventListener('click', () => render(current - 1));
    next.addEventListener('click', () => render(current + 1));
    steps.forEach(button => button.addEventListener('click', () => render(Number(button.dataset.step))));
    render(0);
    scene.querySelectorAll('[data-scene-controls]').forEach(control => { control.hidden = false; });
    scene.dataset.enhanced = 'true';
  });
})();
