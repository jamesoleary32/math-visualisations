// Moment Generating Functions — one function that packages a whole distribution.
// Blitzstein & Hwang, Chapter 6 (Moments).
//
// The arc: M_X(t) = E[e^{tX}]; expanding e^{tX} shows the moments are its Taylor
// coefficients, so they fall out as derivatives at 0 (M'(0)=E[X], etc.); for
// independent variables the MGF of a sum is the product of MGFs, turning
// convolution into multiplication (n exponentials → (λ/(λ−t))^n = Gamma(n,λ)); and
// because an MGF determines the distribution uniquely, matching a product to a
// known MGF *proves* the identity — the same idea behind the CLT.
//
// Discrete X on {0,1,2,3} with p=[.1,.4,.3,.2]; moments and Taylor match to machine
// precision (verified in node).

const SUP = [0, 1, 2, 3], P = [0.1, 0.4, 0.3, 0.2];
const mgf = t => SUP.reduce((s, k, i) => s + P[i] * Math.exp(k * t), 0);
const moment = n => SUP.reduce((s, k, i) => s + P[i] * Math.pow(k, n), 0);   // E[X^n]
const fact = n => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };
const taylor = (t, N) => { let s = 0; for (let n = 0; n <= N; n++) s += moment(n) * Math.pow(t, n) / fact(n); return s; };
const MU1 = moment(1), MU2 = moment(2), VAR = MU2 - MU1 * MU1;
const expMgf = (t, n, lam) => (t >= lam ? Infinity : Math.pow(lam / (lam - t), n));
const normMgf = t => Math.exp(t * t / 2);

const BLUE = '#1565c0', RED = '#c62828', GREY = '#9e9e9e', GREEN = '#2e7d32', PURP = '#7b1fa2';

// ── Draw ──────────────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  c2d.raw((ctx, c) => {
    const L = 60, T = 28, size = Math.min(c.height - 96, c.width - 300), R = L + size, B = T + size;
    const [ta, tb] = o.mode === 'exp' ? [-1.7, st.lam - 0.06] : [-1.15, 1.15];
    const ymax = o.mode === 'exp' ? 8 : 8;
    const px = t => L + (t - ta) / (tb - ta) * size;
    const py = y => B - Math.min(Math.max(y, 0), ymax) / ymax * size;

    // frame + axes
    ctx.strokeStyle = '#e6e6e6'; ctx.lineWidth = 1; ctx.strokeRect(L, T, size, size);
    ctx.strokeStyle = '#eee'; ctx.beginPath(); ctx.moveTo(px(0), T); ctx.lineTo(px(0), B); ctx.stroke();
    ctx.fillStyle = '#bbb'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('t', px(tb) - 8, py(0) - 8); ctx.fillText('M(t)', px(0) + 20, T + 10);
    for (let k = Math.ceil(ta); k <= tb; k++) { ctx.fillStyle = '#ccc'; ctx.fillText(String(k), px(k), B + 15); }
    // M(0)=1 gridline
    ctx.strokeStyle = '#f2f2f2'; ctx.beginPath(); ctx.moveTo(L, py(1)); ctx.lineTo(R, py(1)); ctx.stroke();
    ctx.fillStyle = '#ccc'; ctx.textAlign = 'right'; ctx.fillText('1', L - 5, py(1) + 4);

    const plot = (fn, color, width, dash) => {
      ctx.setLineDash(dash || []); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); let s = false;
      for (let i = 0; i <= 400; i++) { const t = ta + (tb - ta) * i / 400; let y = fn(t); if (!isFinite(y) || y > ymax * 1.6) { s = false; continue; } const X = px(t), Y = py(y); s ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); s = true; }
      ctx.stroke(); ctx.setLineDash([]);
    };

    // pole wall for exp
    if (o.mode === 'exp') { ctx.strokeStyle = '#e7c9b8'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(px(st.lam), T); ctx.lineTo(px(st.lam), B); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle = '#c08457'; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('t = λ  (MGF ends)', px(st.lam) - 2, T + 14); }

    const M = o.mode === 'exp' ? (t => expMgf(t, st.n, st.lam)) : mgf;

    if (o.taylor) plot(t => taylor(t, st.N), GREEN, 2, [5, 4]);
    plot(M, BLUE, 2.8);

    // M(0) dot
    ctx.fillStyle = BLUE; ctx.beginPath(); ctx.arc(px(0), py(M(0)), 4.5, 0, 6.28); ctx.fill();

    if (o.tangent) {
      const y0 = 1, slope = MU1;                         // M(0)=1, M'(0)=E[X]
      ctx.strokeStyle = RED; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(px(ta), py(y0 + slope * (ta))); ctx.lineTo(px(tb), py(y0 + slope * (tb))); ctx.stroke();
      ctx.fillStyle = RED; ctx.font = '600 11px system-ui'; ctx.textAlign = 'left'; ctx.fillText('slope = M′(0) = E[X]', px(0.15), py(1 + slope * 0.15) - 6);
    }

    // ── readout ──
    const rx = R + 34; let ry = T + 20; ctx.textAlign = 'left';
    const line = (a, b, col = '#333') => { ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.fillText(a, rx, ry); ctx.fillStyle = col; ctx.font = '600 14px system-ui'; ctx.fillText(b, rx, ry + 18); ry += 42; };
    const note = ls => { ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ls.forEach((l, i) => ctx.fillText(l, rx, ry + i * 16)); };
    if (o.mode === 'exp') {
      line('n exponentials', `M(t) = (λ/(λ−t))ⁿ,  n=${st.n}`, BLUE);
      line('this IS', `Gamma(${st.n}, λ) 's MGF`, GREEN);
      note(['Independent sum ⇒ product of', 'MGFs. One Exp(λ) has MGF', 'λ/(λ−t); n of them give it to', 'the nth power — the Gamma MGF.', 'The convolution became a', 'multiplication.']);
    } else if (o.tangent) {
      line("M′(0) = E[X]", MU1.toFixed(2), RED);
      line("M″(0) = E[X²]", MU2.toFixed(2));
      line('Var = M″(0) − M′(0)²', VAR.toFixed(2), PURP);
      note(['Differentiate at 0 and read off', 'the moments. The whole', 'distribution is encoded in the', 'behaviour of M near t = 0.']);
    } else if (o.taylor) {
      line('Taylor order', String(st.N), GREEN);
      line('coefficient of tⁿ/n!', 'E[Xⁿ]', BLUE);
      note(['M(t) = Σ E[Xⁿ] tⁿ/n!.', 'Moments ARE the Taylor', 'coefficients. Add terms and the', 'green polynomial hugs M near 0.']);
    } else if (o.fingerprint) {
      line('uniqueness', 'same MGF ⇒ same law', PURP);
      note(['An MGF (near 0) pins down the', 'distribution. So matching a', 'product to a known MGF is a', 'PROOF of identity — and the CLT', 'is just MGF → e^{t²/2}.']);
    } else {
      line('M(t) = E[e^{tX}]', 'M(0) = 1 always', BLUE);
      note(['X ∈ {0,1,2,3} with p =', '0.1, 0.4, 0.3, 0.2, so', 'M(t)=.1+.4eᵗ+.3e²ᵗ+.2e³ᵗ.', 'Its shape near 0 encodes every', 'moment — shown next.']);
    }
  });
}

// ── Controls ──────────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }
function addSlider(st, label, min, max, step, get, set, fmt) {
  const id = 'mgf-' + label.replace(/[^a-z0-9]/gi, '');
  const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  w.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui"><span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(get())}</span></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${get()}" style="width:100%;accent-color:#1565c0">`;
  st._controls.appendChild(w);
  const inp = w.querySelector('input'), v = w.querySelector(`#${id}-v`);
  inp.addEventListener('input', () => { const x = parseFloat(inp.value); v.textContent = fmt(x); set(x); });
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Moment Generating Functions',
  subject: 'Probability',
  initState() { return { N: 1, n: 1, lam: 1.5, _controls: null }; },
  init(c2d, state, panelEl) {
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div'); div.style.cssText = 'display:flex;flex-direction:column;gap:12px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav); state._controls = div;
  },
  steps: [
    {
      title: 'One function for the whole distribution',
      description: 'The moment generating function packs an entire distribution into a single function of a dummy variable $t$: push $X$ through $e^{tX}$ and average. It always passes through $M(0)=1$ (since $e^{0}=1$). It looks abstract — but it is a moment machine and a sum-simplifier, as the next steps show.',
      equation: 'M_X(t) = \\mathbb{E}\\big[e^{tX}\\big]',
      notes: 'Here X takes values 0,1,2,3 with probabilities 0.1, 0.4, 0.3, 0.2, so M(t) = 0.1 + 0.4eᵗ + 0.3e²ᵗ + 0.2e³ᵗ — a weighted sum of exponentials. The whole shape of M near t = 0 secretly encodes every moment of X.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, {}); },
    },
    {
      title: 'Why "moment generating"',
      description: 'Expand $e^{tX} = 1 + tX + \\tfrac{t^2X^2}{2!} + \\dots$ and take expectations term by term. The result: $M(t) = \\sum_n \\mathbb{E}[X^n]\\,\\tfrac{t^n}{n!}$. So the moments $\\mathbb{E}[X^n]$ are exactly the $\\textbf{Taylor coefficients}$ of $M$ at 0. Every moment lives in the wiggle of $M$ near the origin.',
      equation: 'M(t) = \\sum_{n=0}^{\\infty} \\mathbb{E}[X^n]\\,\\frac{t^n}{n!}',
      notes: 'Drag the Taylor order. Order 1 uses only the mean (a straight line through (0,1)); each higher term folds in one more moment, and the green polynomial hugs M ever more tightly near t = 0. A full match near 0 needs all the moments.',
      setup(c2d, st) { st.N = 1; clearControls(st); addSlider(st, 'Taylor order', 1, 6, 1, () => st.N, v => st.N = v, v => String(v)); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { taylor: true }); },
    },
    {
      title: 'Moments = derivatives at 0',
      description: 'Because the moments are the Taylor coefficients, you extract them by $\\textbf{differentiating and setting } t=0$: $M\'(0) = \\mathbb{E}[X]$, $M\'\'(0) = \\mathbb{E}[X^2]$, and in general $M^{(n)}(0) = \\mathbb{E}[X^n]$. The slope of $M$ at the origin is the mean; the curvature gives the second moment, hence the variance.',
      equation: 'M^{(n)}(0) = \\mathbb{E}[X^n], \\qquad \\operatorname{Var}(X) = M\'\'(0) - M\'(0)^2',
      notes: 'The red line is the tangent at t = 0; its slope is E[X] = 1.6, the mean. One function, differentiated repeatedly at a single point, spits out every moment — that is the whole reason MGFs earn their name.',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { tangent: true }); },
    },
    {
      title: 'Sums become products',
      description: 'The payoff. For $\\textbf{independent}$ $X$ and $Y$, the MGF of the sum is the $\\textbf{product}$ of the MGFs: $M_{X+Y} = M_X M_Y$. Adding random variables — a hard convolution — becomes multiplying functions. An $\\text{Exp}(\\lambda)$ has MGF $\\lambda/(\\lambda-t)$; add $n$ of them and you get $(\\lambda/(\\lambda-t))^n$ — exactly $\\text{Gamma}(n,\\lambda)$\'s MGF.',
      equation: 'M_{X+Y}(t) = M_X(t)\\,M_Y(t) \\ \\Rightarrow\\ \\Big(\\tfrac{\\lambda}{\\lambda-t}\\Big)^{n} = M_{\\text{Gamma}(n,\\lambda)}(t)',
      notes: 'Drag n (exponential waits summed). The MGF is just one exponential\'s MGF to the nth power. Recognizing it as Gamma\'s MGF is the proof — visualized in the Gamma lesson — that a sum of n exponentials is Gamma(n, λ). The wall at t = λ is where this MGF stops existing.',
      setup(c2d, st) { st.n = 1; clearControls(st); addSlider(st, 'exponentials n', 1, 8, 1, () => st.n, v => st.n = v, v => String(v)); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'exp' }); },
    },
    {
      title: 'The fingerprint',
      description: 'The last piece: an MGF, when it exists near 0, $\\textbf{determines the distribution uniquely}$ — same MGF, same law. That is what makes the previous step a proof rather than a coincidence: the product matched Gamma\'s MGF, so the sum $\\textbf{must be}$ Gamma. The same argument proves the Central Limit Theorem.',
      equation: 'M_X(t) = M_Y(t)\\ \\text{near }0 \\ \\Rightarrow\\ X \\stackrel{d}{=} Y',
      notes: 'MGFs turn distributional questions into algebra: compute an MGF, then recognize it. Moments from derivatives, sums from products, identity from matching — three reasons this single function runs through the whole moments chapter. (The CLT: the standardized sum\'s MGF converges to e^{t²/2}, the standard Normal\'s.)',
      setup(c2d, st) { clearControls(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { fingerprint: true }); },
    },
  ],
};
