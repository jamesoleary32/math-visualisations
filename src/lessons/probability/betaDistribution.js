// The Beta distribution — the distribution of a probability.
// Blitzstein & Hwang, Chapter 8 (Transformations): Beta, and the Beta–Gamma story.
//
// The arc: Beta lives on [0,1], so it models an unknown probability/proportion; two
// shape parameters α, β sculpt every shape (Uniform, U, skew, spike); the mean is
// α/(α+β) and the concentration is α+β; it is the conjugate prior for coin flips, so
// Bayesian updating is literally adding counts, Beta(α,β) → Beta(α+s, β+f); and the
// parameters read as pseudo-counts of prior successes and failures.
//
// The density is computed exactly via a Lanczos log-gamma; normalization and means
// verified in node.

// ── Beta pdf ──────────────────────────────────────────────────────────────────
function lgamma(z) {
  const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
const lnB = (a, b) => lgamma(a) + lgamma(b) - lgamma(a + b);
const betaPdf = (x, a, b) => (x <= 0 || x >= 1 ? 0 : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - lnB(a, b)));
const betaMean = (a, b) => a / (a + b);
const betaVar = (a, b) => (a * b) / ((a + b) ** 2 * (a + b + 1));
const betaMode = (a, b) => (a > 1 && b > 1 ? (a - 1) / (a + b - 2) : null);

// ── Colour ──────────────────────────────────────────────────────────────────
const BLUE = '#1565c0', GREY = '#c2c2c2', RED = '#c62828', GREEN = '#2e7d32';

// ── Draw ──────────────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  c2d.raw((ctx, c) => {
    const L = 62, T = 30, size = Math.min(c.height - 96, c.width - 300), R = L + size, B = T + size;
    const post = { a: st.a + st.s, b: st.b + st.f };
    const showPost = o.update;
    // adaptive y-max from whichever curve peaks highest (clamped for spikes)
    let ymax = 0;
    for (let i = 1; i < 200; i++) { const x = i / 200; ymax = Math.max(ymax, betaPdf(x, st.a, st.b), showPost ? betaPdf(x, post.a, post.b) : 0); }
    ymax = Math.min(ymax * 1.15 + 0.3, 8);
    const px = x => L + x * size;
    const py = y => B - Math.min(y, ymax) / ymax * size;

    // frame + x ticks
    ctx.strokeStyle = '#e6e6e6'; ctx.lineWidth = 1; ctx.strokeRect(L, T, size, size);
    ctx.fillStyle = '#bbb'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    [0, 0.25, 0.5, 0.75, 1].forEach(t => { ctx.strokeStyle = '#f2f2f2'; ctx.beginPath(); ctx.moveTo(px(t), T); ctx.lineTo(px(t), B); ctx.stroke(); ctx.fillText(t.toFixed(2), px(t), B + 15); });
    ctx.fillText('x  (a probability)', (L + R) / 2, B + 32);

    const curve = (a, b, color, width, fill) => {
      ctx.beginPath(); let s = false;
      for (let i = 0; i <= 400; i++) { const x = i / 400; const Y = py(betaPdf(x, a, b)); const X = px(x); s ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); s = true; }
      if (fill) { ctx.lineTo(px(1), py(0)); ctx.lineTo(px(0), py(0)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
      else { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(); }
    };

    if (showPost) {
      curve(st.a, st.b, GREY, 2, null); ctx.strokeStyle = GREY; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); let s = false; for (let i = 0; i <= 400; i++) { const x = i / 400; const X = px(x), Y = py(betaPdf(x, st.a, st.b)); s ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); s = true; } ctx.stroke(); ctx.setLineDash([]);
      curve(post.a, post.b, BLUE, 0, 'rgba(21,101,192,0.10)');
      curve(post.a, post.b, BLUE, 2.8, null);
      // true p line
      ctx.strokeStyle = GREEN; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(px(st.truep), T); ctx.lineTo(px(st.truep), B); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = GREEN; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('true p', px(st.truep), T - 4);
    } else {
      curve(st.a, st.b, BLUE, 0, 'rgba(21,101,192,0.10)');
      curve(st.a, st.b, BLUE, 2.8, null);
    }

    // mean / mode markers
    const A = showPost ? post.a : st.a, Bp = showPost ? post.b : st.b;
    if (o.mean || o.update) { const m = betaMean(A, Bp); ctx.strokeStyle = RED; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(px(m), py(0)); ctx.lineTo(px(m), py(betaPdf(m, A, Bp))); ctx.stroke(); ctx.fillStyle = RED; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('mean', px(m), py(betaPdf(m, A, Bp)) - 6); }
    if (o.mode) { const md = betaMode(A, Bp); if (md != null) { ctx.fillStyle = '#7b1fa2'; ctx.beginPath(); ctx.arc(px(md), py(betaPdf(md, A, Bp)), 4.5, 0, 6.28); ctx.fill(); ctx.textAlign = 'center'; ctx.font = '11px system-ui'; ctx.fillText('mode', px(md), py(betaPdf(md, A, Bp)) - 8); } }

    // ── readout ──
    const rx = R + 34; let ry = T + 20; ctx.textAlign = 'left';
    const line = (a, b, col = '#333') => { ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.fillText(a, rx, ry); ctx.fillStyle = col; ctx.font = '600 15px system-ui'; ctx.fillText(b, rx, ry + 19); ry += 44; };
    const note = ls => { ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ls.forEach((l, i) => ctx.fillText(l, rx, ry + i * 16)); };
    if (o.update) {
      line('prior', `Beta(${st.a}, ${st.b})`, GREY === GREY ? '#999' : '#333');
      line('data', `${st.s} heads, ${st.f} tails`);
      line('posterior', `Beta(${st.a + st.s}, ${st.b + st.f})`, BLUE);
      line('posterior mean', betaMean(post.a, post.b).toFixed(3), RED);
      note(['Flip coins (true p = 0.7). The', 'posterior shifts toward the green', 'line and tightens — updating is', 'just adding the counts.']);
    } else {
      line('Beta(α, β)', `α = ${st.a}, β = ${st.b}`, BLUE);
      line('mean  α/(α+β)', betaMean(st.a, st.b).toFixed(3), RED);
      if (o.conc) line('concentration α+β', (st.a + st.b).toFixed(1));
      if (o.conc) line('variance', betaVar(st.a, st.b).toFixed(4));
      if (o.pseudo) note(['Read α, β as prior observations:', `≈ ${(st.a - 1).toFixed(1)} prior successes and`, `${(st.b - 1).toFixed(1)} prior failures (vs the flat`, 'Beta(1,1)). A prior is just', 'pretend data.']);
      else if (o.msg) note(o.msg);
    }
  });
}

// ── Controls ──────────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }
function addSlider(st, label, min, max, step, get, set, fmt) {
  const id = 'beta-' + label.replace(/[^a-z0-9]/gi, '');
  const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  w.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui"><span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(get())}</span></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${get()}" style="width:100%;accent-color:#1565c0">`;
  st._controls.appendChild(w);
  const inp = w.querySelector('input'), v = w.querySelector(`#${id}-v`);
  inp.addEventListener('input', () => { const x = parseFloat(inp.value); v.textContent = fmt(x); set(x); });
}
function button(st, label, onClick) {
  const b = document.createElement('button'); b.textContent = label;
  b.style.cssText = 'padding:6px 11px;font-size:12px;border:1px solid #1565c0;color:#1565c0;background:#fff;border-radius:6px;cursor:pointer;';
  b.addEventListener('click', onClick); return b;
}
function buttonRow(st, buttons) { const w = document.createElement('div'); w.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;'; buttons.forEach(b => w.appendChild(b)); st._controls.appendChild(w); }
function presetRow(st, presets) {
  const w = document.createElement('div'); w.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';
  presets.forEach(([lab, a, b]) => { const btn = button(st, lab, () => { st.a = a; st.b = b; renderSliders(st); }); w.appendChild(btn); });
  st._controls.appendChild(w);
}
let renderSliders = () => {};
const f1 = v => v.toFixed(1);

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'The Beta Distribution',
  subject: 'Probability',
  initState() { return { a: 2, b: 2, s: 0, f: 0, truep: 0.7, _controls: null }; },
  init(c2d, state, panelEl) {
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div'); div.style.cssText = 'display:flex;flex-direction:column;gap:12px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav); state._controls = div;
  },
  steps: [
    {
      title: 'The distribution of a probability',
      description: 'The Beta distribution lives on the interval $[0, 1]$ — which makes it the natural home for an unknown $\\textbf{probability}$ or proportion: a coin\'s bias, a click-through rate, a defect rate. Its density is a product of two power terms, $x^{\\alpha-1}(1-x)^{\\beta-1}$, normalized to integrate to 1.',
      equation: 'f(x;\\alpha,\\beta) = \\frac{x^{\\alpha-1}(1-x)^{\\beta-1}}{B(\\alpha,\\beta)}, \\quad x \\in [0,1]',
      notes: 'Most named distributions live on counts or the whole real line; Beta is the one that inhabits the unit interval. So when you are uncertain about a rate $p$, your uncertainty is a Beta over $[0,1]$ — a "distribution of a probability".\n\nDrag α and β and watch the shape respond.',
      setup(c2d, st) { st.a = 2; st.b = 2; clearControls(st); renderSliders = () => { clearControls(st); addSlider(st, 'α', 0.3, 12, 0.1, () => st.a, v => st.a = v, f1); addSlider(st, 'β', 0.3, 12, 0.1, () => st.b, v => st.b = v, f1); }; renderSliders(); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { msg: ['α is weight pulling toward 1,', 'β weight pulling toward 0.'] }); },
    },
    {
      title: 'Two knobs, every shape',
      description: 'Two parameters cover a remarkable range. $\\text{Beta}(1,1)$ is flat — the Uniform, total ignorance. With $\\alpha, \\beta < 1$ the mass flees to the ends (a U-shape: "probably extreme"). With $\\alpha, \\beta > 1$ you get a hump, skewed toward 1 if $\\alpha>\\beta$ and toward 0 if $\\alpha<\\beta$; large values give a sharp spike.',
      equation: '\\text{mode} = \\frac{\\alpha-1}{\\alpha+\\beta-2}\\quad(\\alpha,\\beta>1)',
      notes: 'Use the presets, or drag the sliders. α is the weight pulling probability mass toward 1; β pulls toward 0. Equal α = β is symmetric about ½.\n\nThe purple dot marks the mode (the peak) when there is one.',
      setup(c2d, st) { clearControls(st); renderSliders = () => { clearControls(st); presetRow(st, [['Uniform', 1, 1], ['U-shape', 0.5, 0.5], ['skew →1', 5, 2], ['spike', 20, 20]]); addSlider(st, 'α', 0.3, 25, 0.1, () => st.a, v => st.a = v, f1); addSlider(st, 'β', 0.3, 25, 0.1, () => st.b, v => st.b = v, f1); }; renderSliders(); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: true }); },
    },
    {
      title: 'Where it sits, and how sure you are',
      description: 'The two parameters split into an intuitive pair. The $\\textbf{mean}$ is $\\alpha/(\\alpha+\\beta)$ — where your belief balances. The $\\textbf{concentration}$ is $\\alpha+\\beta$ — the bigger it is (for the same ratio), the narrower the distribution and the more certain you are.',
      equation: '\\mathbb{E}[X] = \\frac{\\alpha}{\\alpha+\\beta}, \\qquad \\operatorname{Var}(X) = \\frac{\\alpha\\beta}{(\\alpha+\\beta)^2(\\alpha+\\beta+1)}',
      notes: 'Keep the ratio α : β fixed and scale both up — the mean stays put while the curve tightens: same belief, more confidence. Scale down and it spreads: less data, more doubt.\n\nSo α/(α+β) says WHERE, and α+β says HOW SURE.',
      setup(c2d, st) { st.a = 6; st.b = 4; clearControls(st); renderSliders = () => { clearControls(st); addSlider(st, 'α', 0.3, 40, 0.1, () => st.a, v => st.a = v, f1); addSlider(st, 'β', 0.3, 40, 0.1, () => st.b, v => st.b = v, f1); }; renderSliders(); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mean: true, conc: true }); },
    },
    {
      title: 'Bayesian updating = adding the counts',
      description: 'This is the Beta\'s superpower. It is the $\\textbf{conjugate prior}$ for coin flips: if your prior belief about $p$ is $\\text{Beta}(\\alpha,\\beta)$ and you then see $s$ heads and $f$ tails, the posterior is simply $\\text{Beta}(\\alpha+s,\\ \\beta+f)$. You update by $\\textbf{adding the counts}$ — no integrals.',
      equation: '\\text{Beta}(\\alpha,\\beta) \\;\\xrightarrow{\\;s\\text{ heads},\\ f\\text{ tails}\\;}\\; \\text{Beta}(\\alpha+s,\\ \\beta+f)',
      notes: 'The grey dashed curve is your prior; the solid blue is the posterior after the flips. The coin\'s true bias is p = 0.7 (green line).\n\nFlip a few, then a batch: watch the posterior slide toward the green line and sharpen. That is Bayesian learning, in closed form.',
      setup(c2d, st) {
        st.a = 2; st.b = 2; st.s = 0; st.f = 0; clearControls(st);
        renderSliders = () => {
          clearControls(st);
          addSlider(st, 'prior α', 0.5, 10, 0.5, () => st.a, v => st.a = v, f1);
          addSlider(st, 'prior β', 0.5, 10, 0.5, () => st.b, v => st.b = v, f1);
          const flip = n => () => { for (let k = 0; k < n; k++) (Math.random() < st.truep ? st.s++ : st.f++); };
          buttonRow(st, [button(st, 'flip 1', flip(1)), button(st, 'flip 25', flip(25)), button(st, 'reset', () => { st.s = 0; st.f = 0; })]);
        };
        renderSliders();
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { update: true }); },
    },
    {
      title: 'The parameters are pseudo-counts',
      description: 'Because updating just adds counts, $\\alpha$ and $\\beta$ read as $\\textbf{imagined prior data}$: relative to the flat $\\text{Beta}(1,1)$, a $\\text{Beta}(\\alpha,\\beta)$ behaves as if you had already seen $\\alpha-1$ successes and $\\beta-1$ failures. Choosing a prior is just pretending you have seen some data.',
      equation: '\\text{Beta}(\\alpha,\\beta) \\;\\approx\\; (\\alpha-1)\\text{ prior successes},\\ (\\beta-1)\\text{ prior failures}',
      notes: 'So "I think it is roughly fair, but I am not certain" might be Beta(4, 4) — as if you had seen 3 heads and 3 tails. More pseudo-counts = a stronger prior that new data must overcome.\n\nAside: Beta also appears as order statistics — the k-th smallest of n Uniform(0,1) draws is exactly Beta(k, n−k+1).',
      setup(c2d, st) { st.a = 4; st.b = 4; st.s = 0; st.f = 0; clearControls(st); renderSliders = () => { clearControls(st); addSlider(st, 'α', 1, 12, 0.5, () => st.a, v => st.a = v, f1); addSlider(st, 'β', 1, 12, 0.5, () => st.b, v => st.b = v, f1); }; renderSliders(); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mean: true, pseudo: true }); },
    },
  ],
};
