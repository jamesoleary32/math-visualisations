import { renderEquation } from './equation.js';

// Updates the right-hand panel DOM for the current step.
export function updatePanel(step, index, total) {
  document.getElementById('step-title').textContent       = step.title;
  document.getElementById('step-description').textContent = step.description;
  document.getElementById('step-notes').textContent       = step.notes ?? '';
  document.getElementById('counter').textContent          = `${index + 1} / ${total}`;
  renderEquation(step.equation ?? '');
}
