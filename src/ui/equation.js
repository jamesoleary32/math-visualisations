// Renders a LaTeX string into #equation using KaTeX (loaded globally via CDN).
export function renderEquation(latex) {
  const el = document.getElementById('equation');
  if (!latex) { el.textContent = ''; return; }
  /* global katex */
  katex.render(latex, el, { throwOnError: false, displayMode: true });
}
