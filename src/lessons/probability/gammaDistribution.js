// The Gamma distribution — the waiting time until the α-th event.
// Blitzstein & Hwang, Chapter 8 (Transformations): Gamma, Beta–Gamma connections.
//
// The arc: Gamma lives on [0,∞), so it models a positive quantity — most naturally a
// waiting time; shape α and rate λ sculpt it (α=1 is the Exponential); it is a SUM of
// α independent Exponentials, i.e. the time to the α-th Poisson event; mean α/λ and
// variance α/λ², and as α grows the sum drifts to a Normal (CLT); and it is the
// conjugate prior for a Poisson/Exponential rate, with the Beta–Gamma split tying it
// back to the Beta lesson.
//
// The density is computed exactly via a Lanczos log-gamma; normalization and means
// verified in node.

function lgamma(z) {
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
const gammaPdf = (x, a, l) => (x <= 0 ? 0 : Math.exp(a * Math.log(l) + (a - 1) * Math.log(x) - l * x - lgamma(a)));
const normPdf = (x, m, s) => Math.exp(-(((x - m) / s) ** 2) / 2) / (s * Math.sqrt(2 * Math.PI));
const gMean = (a, l) => a / l, gSd = (a, l) => Math.sqrt(a) / l, gMode = (a, l) => (a >= 1 ? (a - 1) / l : null);

const BLUE = '#1565c0', GREY = '#c2c2c2', RED = '#c62828', GREEN = '#2e7d32', PURP = '#7b1fa2';

// ── Draw ──────────────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  c2d.raw((ctx, c) => {
    const a = st.a, l = st.lam;
    const L = 62, T = 30, size = Math.min(c.height - 96, c.width - 300), R = L + size, B = T + size;
    const xmax = Math.max(4 / l, gMean(a, l) + 4.4 * gSd(a, l));
    let ymax = 0; for (let i = 1; i < 240; i++) ymax = Math.max(ymax, gammaPdf(xmax * i / 240, a, l));
    if (o.expFaint) for (let i = 1; i < 240; i++) ymax = Math.max(ymax, gammaPdf(xmax * i / 240, 1, l));
    ymax = Math.min(ymax * 1.15 + 0.02, Math.max(ymax * 1.15, l * 1.2 + 0.3, 1.2));
    const px = x => L + x / xmax * size;
    const py = y => B - Math.min(y, ymax) / ymax * size;

    ctx.strokeStyle = '#e6e6e6'; ctx.lineWidth = 1; ctx.strokeRect(L, T, size, size);
    ctx.fillStyle = '#bbb'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    for (let t = 0; t <= 4; t++) { const xv = xmax * t / 4; ctx.strokeStyle = '#f2f2f2'; ctx.beginPath(); ctx.moveTo(px(xv), T); ctx.lineTo(px(xv), B); ctx.stroke(); ctx.fillText(xv.toFixed(xmax < 6 ? 1 : 0), px(xv), B + 15); }
    ctx.fillText(o.rate ? 'λ  (a rate)' : 'x  (a waiting time)', (L + R) / 2, B + 32);

    const curve = (aa, ll, color, width, fill, dash) => {
      ctx.setLineDash(dash || []); ctx.beginPath(); let s = false;
      for (let i = 0; i <= 400; i++) { const x = xmax * i / 400; const Y = py(gammaPdf(x, aa, ll)); const X = px(x); s ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); s = true; }
      if (fill) { ctx.lineTo(px(xmax), py(0)); ctx.lineTo(px(0), py(0)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
      else { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); } ctx.setLineDash([]);
    };

    if (o.expFaint && a > 1.01) { curve(1, l, GREY, 1.8, null, [5, 4]); ctx.fillStyle = GREY; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.fillText('one Exp(λ)', px(0.1) + 6, py(gammaPdf(0.4, 1, l))); }
    curve(a, l, BLUE, 0, 'rgba(21,101,192,0.10)');
    curve(a, l, BLUE, 2.8, null);

    // Normal overlay (drift to bell)
    if (o.normal) { const m = gMean(a, l), sd = gSd(a, l); ctx.setLineDash([5, 4]); ctx.strokeStyle = PURP; ctx.lineWidth = 2; ctx.beginPath(); let s = false; for (let i = 0; i <= 400; i++) { const x = xmax * i / 400; const Y = py(normPdf(x, m, sd)); const X = px(x); s ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); s = true; } ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = PURP; ctx.font = '600 11px system-ui'; ctx.textAlign = 'left'; ctx.fillText('Normal(α/λ, α/λ²)', px(m) + 6, T + 16); }

    // markers
    if (o.mean) { const m = gMean(a, l); ctx.strokeStyle = RED; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(px(m), py(0)); ctx.lineTo(px(m), py(gammaPdf(m, a, l))); ctx.stroke(); ctx.fillStyle = RED; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('mean', px(m), py(gammaPdf(m, a, l)) - 6); }
    if (o.mode) { const md = gMode(a, l); if (md != null && md > 0) { ctx.fillStyle = PURP; ctx.beginPath(); ctx.arc(px(md), py(gammaPdf(md, a, l)), 4.5, 0, 6.28); ctx.fill(); ctx.textAlign = 'center'; ctx.font = '11px system-ui'; ctx.fillText('mode', px(md), py(gammaPdf(md, a, l)) - 8); } }

    // ── readout ──
    const rx = R + 34; let ry = T + 20; ctx.textAlign = 'left';
    const line = (aa, bb, col = '#333') => { ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.fillText(aa, rx, ry); ctx.fillStyle = col; ctx.font = '600 15px system-ui'; ctx.fillText(bb, rx, ry + 19); ry += 44; };
    const note = ls => { ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ls.forEach((L2, i) => ctx.fillText(L2, rx, ry + i * 16)); };
    if (o.sum) {
      line('events waited for', `α = ${a}`, BLUE);
      line('mean time  α/λ', gMean(a, l).toFixed(2), RED);
      note(['Gamma(α, λ) is the time until the', 'α-th event of a Poisson process —', 'a SUM of α exponential waits.', 'Add more waits: the total marches', 'right and its shape rounds into a', 'bell (grey = a single Exp(λ)).']);
    } else {
      line('Gamma(α, λ)', `α = ${a.toFixed(1)}, λ = ${l.toFixed(1)}`, BLUE);
      line('mean  α/λ', gMean(a, l).toFixed(2), RED);
      if (o.varr) { line('variance  α/λ²', (a / (l * l)).toFixed(2)); line('skewness  2/√α', (2 / Math.sqrt(a)).toFixed(2), PURP); }
      if (o.conn) note(['Connections:', '• sum of α Exp(λ) → time to α-th', '  Poisson event', '• conjugate prior for a rate λ:', '  add event-count to α, exposure', '  time to λ', '• X/(X+Y) ~ Beta(a,b) when', '  X~Gamma(a), Y~Gamma(b)']);
      else if (o.msg) note(o.msg);
    }
  });
}

// ── Controls ──────────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }
function addSlider(st, label, min, max, step, get, set, fmt) {
  const id = 'gam-' + label.replace(/[^a-z0-9]/gi, '');
  const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  w.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui"><span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(get())}</span></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${get()}" style="width:100%;accent-color:#1565c0">`;
  st._controls.appendChild(w);
  const inp = w.querySelector('input'), v = w.querySelector(`#${id}-v`);
  inp.addEventListener('input', () => { const x = parseFloat(inp.value); v.textContent = fmt(x); set(x); });
}
function presetRow(st, presets) {
  const w = document.createElement('div'); w.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
  presets.forEach(([lab, a, l]) => { const b = document.createElement('button'); b.textContent = lab; b.style.cssText = 'padding:6px 10px;font-size:12px;border:1px solid #1565c0;color:#1565c0;background:#fff;border-radius:6px;cursor:pointer;'; b.addEventListener('click', () => { st.a = a; st.lam = l; renderSliders(st); }); w.appendChild(b); });
  st._controls.appendChild(w);
}
let renderSliders = () => {};
const f1 = v => v.toFixed(1);

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'The Gamma Distribution',
  subject: 'Probability',
  initState() { return { a: 3, lam: 1, _controls: null }; },
  init(c2d, state, panelEl) {
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div'); div.style.cssText = 'display:flex;flex-direction:column;gap:12px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav); state._controls = div;
  },
  steps: [
    {
      title: 'A distribution for a positive quantity',
      description: 'The Gamma distribution lives on $[0, \\infty)$, so it models a positive amount — most naturally a $\\textbf{waiting time}$. It has a shape parameter $\\alpha$ and a rate $\\lambda$; the density is a power of $x$ times an exponential decay, normalized by $\\Gamma(\\alpha)$.',
      equation: 'f(x;\\alpha,\\lambda) = \\frac{\\lambda^{\\alpha}\\,x^{\\alpha-1}\\,e^{-\\lambda x}}{\\Gamma(\\alpha)}, \\quad x > 0',
      notes: 'When α = 1 the power term vanishes and you get the Exponential distribution — a spike at 0 that decays. For α > 1 the x^{α−1} term pushes the mass away from 0, so the density rises to a hump and then falls.\n\nDrag α and λ to feel the two effects.',
      setup(c2d, st) { st.a = 3; st.lam = 1; clearControls(st); renderSliders = () => { clearControls(st); addSlider(st, 'shape α', 0.4, 12, 0.1, () => st.a, v => st.a = v, f1); addSlider(st, 'rate λ', 0.3, 4, 0.1, () => st.lam, v => st.lam = v, f1); }; renderSliders(); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { msg: ['α sets the shape;', 'λ sets the scale (rate).'] }); },
    },
    {
      title: 'Shape α and rate λ',
      description: 'The two parameters do different jobs. $\\textbf{Shape } \\alpha$ controls the form: $\\alpha<1$ spikes at 0, $\\alpha=1$ is the Exponential, larger $\\alpha$ gives a hump that grows more symmetric. $\\textbf{Rate } \\lambda$ is a scale knob — bigger $\\lambda$ squeezes everything toward 0 (events arrive faster, so you wait less).',
      equation: '\\text{mode} = \\frac{\\alpha-1}{\\lambda}\\ (\\alpha\\ge 1), \\qquad \\text{Exponential} = \\text{Gamma}(1,\\lambda)',
      notes: 'Use the presets or the sliders. Notice λ only rescales the x-axis — double λ and the same shape shrinks to half the width — while α genuinely reshapes the curve.\n\nThe purple dot is the mode (peak), which exists once α ≥ 1.',
      setup(c2d, st) { clearControls(st); renderSliders = () => { clearControls(st); presetRow(st, [['Exp (α=1)', 1, 1], ['hump', 3, 1], ['sharp', 9, 1], ['fast λ', 3, 2]]); addSlider(st, 'shape α', 0.4, 15, 0.1, () => st.a, v => st.a = v, f1); addSlider(st, 'rate λ', 0.3, 4, 0.1, () => st.lam, v => st.lam = v, f1); }; renderSliders(); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: true }); },
    },
    {
      title: 'A sum of exponential waits',
      description: 'Here is what the Gamma really $\\textbf{is}$. If events arrive as a Poisson process at rate $\\lambda$, the time until the $\\alpha$-th event is the sum of $\\alpha$ independent Exponential waits — and that sum is exactly $\\text{Gamma}(\\alpha, \\lambda)$. The Exponential is the one-event case.',
      equation: 'T = \\underbrace{E_1 + E_2 + \\dots + E_k}_{k\\ \\text{Exp}(\\lambda)\\ \\text{waits}} \\sim \\text{Gamma}(k, \\lambda)',
      notes: 'Increase k (number of events to wait for). Each extra wait shifts the total right by 1/λ on average and — by the same convolution smoothing you saw for sums — rounds the shape toward a bell. The grey dashed curve is a single Exp(λ) for comparison.',
      setup(c2d, st) { st.a = 1; st.lam = 1; clearControls(st); renderSliders = () => { clearControls(st); addSlider(st, 'events k', 1, 12, 1, () => st.a, v => st.a = v, v => String(v)); }; renderSliders(); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { sum: true, expFaint: true, mean: true }); },
    },
    {
      title: 'Mean, spread, and the drift to a bell',
      description: 'Since Gamma is a sum of $\\alpha$ i.i.d. Exponentials (each mean $1/\\lambda$, variance $1/\\lambda^2$), the mean is $\\alpha/\\lambda$ and the variance $\\alpha/\\lambda^2$. Its skewness is $2/\\sqrt{\\alpha}$ — so as $\\alpha$ grows the distribution loses its skew and approaches a $\\textbf{Normal}$. That is the Central Limit Theorem, one distribution deep.',
      equation: '\\mathbb{E}[X] = \\frac{\\alpha}{\\lambda}, \\quad \\operatorname{Var}(X) = \\frac{\\alpha}{\\lambda^2}, \\quad \\text{skew} = \\frac{2}{\\sqrt{\\alpha}}',
      notes: 'The purple dashed curve is a Normal with the same mean and variance. At small α the Gamma is visibly lopsided and the match is poor; crank α up and the two curves lock together — a sum of many small waits is approximately Gaussian.',
      setup(c2d, st) { st.a = 2; st.lam = 1; clearControls(st); renderSliders = () => { clearControls(st); addSlider(st, 'shape α', 1, 40, 1, () => st.a, v => st.a = v, v => String(v)); addSlider(st, 'rate λ', 0.5, 4, 0.1, () => st.lam, v => st.lam = v, f1); }; renderSliders(); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mean: true, varr: true, normal: true }); },
    },
    {
      title: 'Connections: rates, Poisson, and Beta',
      description: 'The Gamma sits at a crossroads. It is the waiting time for the $\\alpha$-th Poisson event; flip the interpretation and it is the $\\textbf{conjugate prior}$ for an unknown Poisson/Exponential rate $\\lambda$ (observe events and updating just adds the event-count to $\\alpha$ and the exposure time to $\\lambda$); and it splits into a Beta.',
      equation: 'X\\sim\\text{Gamma}(a),\\ Y\\sim\\text{Gamma}(b) \\ \\Rightarrow\\ \\frac{X}{X+Y}\\sim\\text{Beta}(a,b)\\ \\perp\\ X+Y\\sim\\text{Gamma}(a{+}b)',
      notes: 'That last line is the Beta–Gamma story: two independent Gammas (with the same rate) split into a fraction that is Beta and a total that is Gamma — and the two are independent. It is how the Beta from the previous lesson and the Gamma here are secretly the same family, seen from different angles.',
      setup(c2d, st) { st.a = 3; st.lam = 1; clearControls(st); renderSliders = () => { clearControls(st); addSlider(st, 'shape α', 0.4, 12, 0.1, () => st.a, v => st.a = v, f1); addSlider(st, 'rate λ', 0.3, 4, 0.1, () => st.lam, v => st.lam = v, f1); }; renderSliders(); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mean: true, conn: true }); },
    },
  ],
};
