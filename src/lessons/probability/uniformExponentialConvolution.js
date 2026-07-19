// Worked convolution: X ~ Uniform(0, a), Y ~ Exponential(λ), and the density of
// their sum T = X + Y. Blitzstein & Hwang, Chapter 8 (Transformations).
//
// The flip-and-slide integral produces a clean piecewise closed form:
//   f_T(t) = (1/a)(1 − e^{−λt})              for 0 ≤ t ≤ a   (leading edge)
//   f_T(t) = (1/a)(e^{λa} − 1) e^{−λt}       for t > a        (exponential tail)
// It rises from 0 to a peak at t = a, then decays — a uniform "smears" the
// exponential's hard start at 0 into a gradual rise. Verified in node: the closed
// form matches the numerical convolution, integrates to 1, and is continuous at a.

const fXof = (x, a) => (x >= 0 && x <= a ? 1 / a : 0);
const fYof = (y, lam) => (y >= 0 ? lam * Math.exp(-lam * y) : 0);
const fTof = (t, a, lam) => (t <= 0 ? 0 : t <= a ? (1 / a) * (1 - Math.exp(-lam * t)) : (1 / a) * (Math.exp(lam * a) - 1) * Math.exp(-lam * t));

// ── Colour ──────────────────────────────────────────────────────────────────
const BLUE = [21, 101, 192], ORANGE = [232, 113, 10], GREEN = '#2e7d32';
const rgb = (c, al = 1) => `rgba(${c[0]},${c[1]},${c[2]},${al})`;

function draw(c2d, st, o) {
  c2d.raw((ctx, c) => {
    const a = st.a, lam = st.lam, t = st.t;
    const L = 58, T = 28, size = Math.min(c.height - 100, c.width - 300), R = L + size, B = T + size;
    const xa = -0.6, xb = 5.4;
    const yb = Math.min(2.6, Math.max(1 / a, lam, fTof(a, a, lam)) * 1.28);
    const px = x => L + (x - xa) / (xb - xa) * size;
    const py = y => B - (y - 0) / (yb - 0) * size;

    // frame + baseline
    ctx.strokeStyle = '#e6e6e6'; ctx.lineWidth = 1; ctx.strokeRect(L, T, size, size);
    ctx.strokeStyle = '#eee'; ctx.beginPath(); ctx.moveTo(L, py(0)); ctx.lineTo(R, py(0)); ctx.stroke();
    // x ticks at 0, a
    ctx.fillStyle = '#bbb'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('0', px(0), B + 15); ctx.fillText('a', px(a), B + 15);
    ctx.strokeStyle = '#f0f0f0'; ctx.beginPath(); ctx.moveTo(px(a), T); ctx.lineTo(px(a), B); ctx.stroke();

    const curve = (fn, color, width, x0 = xa, x1 = xb) => {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); let s = false;
      for (let i = 0; i <= 320; i++) { const x = x0 + (x1 - x0) * i / 320; const Y = py(Math.min(yb, fn(x))); const X = px(x); s ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); s = true; }
      ctx.stroke();
    };

    if (o.mode === 'intro') {
      // both densities as themselves
      curve(x => fXof(x, a), rgb(BLUE), 2.6);
      curve(x => fYof(x, lam), rgb(ORANGE), 2.6);
      ctx.font = '600 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillStyle = rgb(BLUE); ctx.fillText('f_X  ~ Uniform(0, a)', px(a) + 10, py(1 / a) - 6);
      ctx.fillStyle = rgb(ORANGE); ctx.fillText('f_Y  ~ Exp(λ)', px(0.35), py(fYof(0.35, lam)) - 8);
    } else {
      // flip-and-slide: f_X fixed, f_Y(t-x) flipped+shifted, overlap shaded, f_T traced
      const lim = Math.min(a, Math.max(0, t));
      // overlap product region [0, min(a,t)]
      if (t > 0) {
        ctx.fillStyle = rgb([46, 125, 50], 0.30); ctx.beginPath(); ctx.moveTo(px(0), py(0));
        for (let i = 0; i <= 200; i++) { const x = (lim) * i / 200; ctx.lineTo(px(x), py(Math.min(yb, fXof(x, a) * fYof(t - x, lam)))); }
        ctx.lineTo(px(lim), py(0)); ctx.closePath(); ctx.fill();
      }
      curve(x => fXof(x, a), rgb(BLUE), 2.4);                 // f_X(x)
      curve(x => fYof(t - x, lam), rgb(ORANGE), 2.4);         // f_Y(t − x): flipped exponential cut at x=t
      // f_T(t) traced
      ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1.6; ctx.setLineDash([4, 4]); ctx.beginPath();
      for (let i = 0; i <= 320; i++) { const tt = xa + (xb - xa) * i / 320; const X = px(tt), Y = py(Math.min(yb, fTof(tt, a, lam))); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); } ctx.stroke(); ctx.setLineDash([]);
      // current t
      ctx.strokeStyle = GREEN; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(px(t), T); ctx.lineTo(px(t), B); ctx.stroke();
      ctx.fillStyle = GREEN; ctx.beginPath(); ctx.arc(px(t), py(fTof(t, a, lam)), 5, 0, 6.28); ctx.fill();
      // upper integration limit marker min(a,t)
      if (o.regimes && t > 0) {
        ctx.fillStyle = '#111'; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
        ctx.fillText('x = ' + (t <= a ? 't' : 'a'), px(lim), B - 6);
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(px(lim), py(0)); ctx.lineTo(px(lim), py(fXof(lim, a) * fYof(t - lim, lam))); ctx.stroke(); ctx.setLineDash([]);
      }
      // labels
      ctx.font = '600 12px system-ui'; ctx.textAlign = 'left';
      ctx.fillStyle = rgb(BLUE); ctx.fillText('f_X(x)', px(a) + 8, py(1 / a) - 4);
      ctx.fillStyle = rgb(ORANGE); ctx.fillText('f_Y(t − x)', px(t) - 74, T + 16);
      ctx.fillStyle = '#999'; ctx.fillText('f_T(t)', px(a) + 4, py(fTof(a, a, lam)) - 8);
      if (o.peak) { ctx.fillStyle = GREEN; ctx.textAlign = 'center'; ctx.fillText('peak at t = a', px(a), py(fTof(a, a, lam)) - 14); }
    }

    // readout
    const rx = R + 30; let ry = T + 18; ctx.textAlign = 'left';
    const line = (lab, val, col = '#333') => { ctx.fillStyle = '#999'; ctx.font = '11.5px system-ui'; ctx.fillText(lab, rx, ry); ctx.fillStyle = col; ctx.font = '600 14px system-ui'; ctx.fillText(val, rx, ry + 18); ry += 42; };
    const note = ls => { ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ls.forEach((l, i) => ctx.fillText(l, rx, ry + i * 16)); };
    line('a  (uniform width)', a.toFixed(2), rgb(BLUE)); ry -= 14;
    line('λ  (exp rate)', lam.toFixed(2), rgb(ORANGE));
    if (o.mode !== 'intro') { line('t', t.toFixed(2)); ry -= 14; line('f_T(t)', fTof(t, a, lam).toFixed(3), GREEN); }
    if (o.formula) {
      ctx.fillStyle = '#555'; ctx.font = '600 12px system-ui'; ctx.fillText('closed form', rx, ry); ry += 18;
      ctx.fillStyle = '#777'; ctx.font = '12px system-ui';
      ['0≤t≤a:  (1/a)(1 − e^{−λt})', 't > a:   (1/a)(e^{λa}−1) e^{−λt}'].forEach((l, i) => ctx.fillText(l, rx, ry + i * 17)); ry += 40;
    }
    if (o.msg) note(o.msg);
  });
}

// ── Controls ──────────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }
function addSlider(st, label, min, max, step, get, set, fmt) {
  const id = 'ue-' + label.replace(/[^a-z0-9]/gi, '');
  const w = document.createElement('div'); w.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  w.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui"><span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(get())}</span></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${get()}" style="width:100%;accent-color:#1565c0">`;
  st._controls.appendChild(w);
  const inp = w.querySelector('input'), v = w.querySelector(`#${id}-v`);
  inp.addEventListener('input', () => { const x = parseFloat(inp.value); v.textContent = fmt(x); set(x); });
}
const f2 = v => v.toFixed(2);

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Convolution: Uniform + Exponential',
  subject: 'Probability',
  initState() { return { a: 1.5, lam: 1.0, t: 1.0, _controls: null }; },
  init(c2d, state, panelEl) {
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div'); div.style.cssText = 'display:flex;flex-direction:column;gap:12px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav); state._controls = div;
  },
  steps: [
    {
      title: 'The setup',
      description: 'Let $X \\sim \\text{Uniform}(0, a)$ — a flat box — and $Y \\sim \\text{Exp}(\\lambda)$ — a spike at 0 with an exponential tail. They are independent, and we want the density of the sum $T = X + Y$. The convolution formula does the work.',
      equation: 'f_T(t) = \\int_{0}^{a} \\tfrac{1}{a}\\,\\lambda e^{-\\lambda(t-x)}\\,\\mathbf{1}_{\\{t-x\\ge 0\\}}\\,dx',
      notes: 'Blue is the uniform density $1/a$ on $[0,a]$; orange is the exponential $\\lambda e^{-\\lambda y}$ on $y\\ge 0$. Sliding one across the other and integrating their overlap will give $f_T$ — that is the next step.\n\nThe indicator $\\mathbf{1}_{\\{t-x\\ge 0\\}}$ is just the exponential\'s support: it contributes only where its argument $t-x$ is non-negative.',
      setup(c2d, st) { clearControls(st); addSlider(st, 'a  (uniform width)', 0.4, 3, 0.05, () => st.a, v => st.a = v, f2); addSlider(st, 'λ  (exp rate)', 0.5, 2.5, 0.05, () => st.lam, v => st.lam = v, f2); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'intro', msg: ['Uniform smears; exponential', 'decays. Their convolution is', 'a blend of the two.'] }); },
    },
    {
      title: 'Flip and slide the exponential',
      description: 'Reflect $f_Y$ and slide it to $t$: the orange curve is $f_Y(t-x)$, an exponential rising up to a hard edge at $x = t$ (its support is $x \\le t$). Multiply by the blue box and integrate — the green overlap area is $f_T(t)$. Drag $t$ and the green dot traces the whole density.',
      equation: 'f_T(t) = \\int f_X(x)\\,f_Y(t-x)\\,dx = \\text{overlap area}',
      notes: 'Because $f_Y(t-x)$ only exists for $x \\le t$, its sharp edge sweeps across the box as $t$ grows. Two things gate the overlap: the box on $[0,a]$ and that moving edge at $x = t$ — which is exactly what splits the answer into two cases.',
      setup(c2d, st) { st.t = 1.0; clearControls(st); addSlider(st, 'slide to t', -0.2, 5, 0.02, () => st.t, v => st.t = v, f2); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'slide' }); },
    },
    {
      title: 'Two regimes',
      description: 'The upper limit of the integral is $\\min(a, t)$. While $t \\le a$ the exponential\'s edge is inside the box, so we integrate only up to $x = t$ — the overlap is still growing. Once $t > a$ the whole box overlaps the decaying tail, and we integrate the full $[0, a]$.',
      equation: '\\int_{0}^{\\min(a,\\,t)} \\tfrac{1}{a}\\,\\lambda e^{-\\lambda(t-x)}\\,dx',
      notes: 'Slide through $t = a$ and watch the black upper limit switch from "$t$" to "$a$". That single change — a moving limit becoming a fixed one — is why $f_T$ is piecewise: a rising leading edge for $t \\le a$, an exponential tail for $t > a$.',
      setup(c2d, st) { st.t = 1.0; clearControls(st); addSlider(st, 'slide to t', -0.2, 5, 0.02, () => st.t, v => st.t = v, f2); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'slide', regimes: true }); },
    },
    {
      title: 'The closed form',
      description: 'Doing the two integrals gives a tidy piecewise density: it rises like $1 - e^{-\\lambda t}$ up to a peak at $t = a$, then decays like $e^{-\\lambda t}$. The two pieces agree at $t = a$, so $f_T$ is continuous — a smooth hill with an exponential tail.',
      equation: 'f_T(t) = \\begin{cases} \\tfrac{1}{a}\\,(1 - e^{-\\lambda t}) & 0 \\le t \\le a \\\\[4pt] \\tfrac{1}{a}\\,(e^{\\lambda a} - 1)\\,e^{-\\lambda t} & t > a \\end{cases}',
      notes: 'The grey curve is this formula; the green dot sits on it at your current $t$. It integrates to 1, and both branches give $(1/a)(1 - e^{-\\lambda a})$ at $t = a$ — the peak.\n\nEverything to the left of $t = a$ is the leading edge being "let in" gradually; everything to the right is the exponential tail shifted along by the width of the box.',
      setup(c2d, st) { st.t = 1.5; clearControls(st); addSlider(st, 'slide to t', -0.2, 5, 0.02, () => st.t, v => st.t = v, f2); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'slide', formula: true, peak: true }); },
    },
    {
      title: 'A smoothed exponential',
      description: 'The uniform\'s only job is to smear the exponential\'s hard jump at 0 into a gradual rise of width $a$. Shrink $a$ and the hill narrows back toward the pure exponential; widen it and the leading edge stretches out. Convolving with a uniform is a moving average — it blurs.',
      equation: 'a \\to 0 \\ \\Rightarrow\\ T \\to Y \\sim \\text{Exp}(\\lambda)',
      notes: 'Drag $a$. As it shrinks the rise on $[0,a]$ gets steeper and the peak climbs toward $\\lambda$; in the limit you recover the exponential itself. Widen $a$ and the density flattens into a long plateau with soft ends.\n\nThis is the same smoothing you saw with uniform ⊛ uniform giving a triangle — a uniform kernel rounds off whatever it is convolved with.',
      setup(c2d, st) { st.t = 1.5; clearControls(st); addSlider(st, 'a  (uniform width)', 0.2, 3, 0.05, () => st.a, v => st.a = v, f2); addSlider(st, 'slide to t', -0.2, 5, 0.02, () => st.t, v => st.t = v, f2); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { mode: 'slide', formula: true }); },
    },
  ],
};
