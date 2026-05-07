// Wires prev/next buttons and arrow-key navigation to the go(index) callback.
export function setupNavigation(go, getCurrent, total) {
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');

  function update(i) {
    prev.disabled = i === 0;
    next.disabled = i === total - 1;
    go(i);
  }

  prev.addEventListener('click', () => update(getCurrent() - 1));
  next.addEventListener('click', () => update(getCurrent() + 1));

  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' && getCurrent() < total - 1) update(getCurrent() + 1);
    if (e.key === 'ArrowLeft'  && getCurrent() > 0)         update(getCurrent() - 1);
  });

  // Set initial button state
  prev.disabled = true;
  next.disabled = total <= 1;
}
