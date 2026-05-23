import { renderEquation } from './equation.js';

// Renders text containing $...$ inline math into an element.
// Segments without $ are set as text nodes; segments inside $...$ are rendered
// by KaTeX. Falls back to plain text if KaTeX is not loaded.
function renderInline(el, text) {
  el.innerHTML = '';
  if (!text) return;
  /* global katex */
  if (typeof katex === 'undefined' || !text.includes('$')) {
    el.textContent = text;
    return;
  }
  const parts = text.split(/\$([^$]+)\$/g);
  parts.forEach((part, i) => {
    if (i % 2 === 0) {
      if (part) el.appendChild(document.createTextNode(part));
    } else {
      const span = document.createElement('span');
      katex.render(part, span, { throwOnError: false, displayMode: false });
      el.appendChild(span);
    }
  });
}

// Updates the right-hand panel DOM for the current step.
export function updatePanel(step, index, total) {
  document.getElementById('step-title').textContent  = step.title;
  document.getElementById('counter').textContent     = `${index + 1} / ${total}`;
  renderInline(document.getElementById('step-description'), step.description ?? '');
  renderInline(document.getElementById('step-notes'),       step.notes ?? '');
  renderEquation(step.equation ?? '');
}
