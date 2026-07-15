// Covariance & Correlation — how two random variables move together.
// Blitzstein & Hwang, Chapter 7 (Joint Distributions).
//
// The arc: covariance as averaged co-deviation (the shaded rectangles), its fatal
// flaw (it depends on units), correlation as the unit-free fix bounded in [-1,1],
// and the two traps everyone falls into — correlation only sees LINEAR structure,
// and uncorrelated does not mean independent.
//
// Everything is computed from a live sample. Verified: empirical correlation
// recovers the target rho and stays in [-1,1]; Y = X^2 gives correlation ~0 while
// being fully dependent; scaling X leaves correlation unchanged.

// ── RNG ───────────────────────────────────────────────────────────────────────
function mul32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = r => {
  let u = 0, v = 0;
  while (!u) u = r(); while (!v) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const N = 220;

// Build a sample with known sd's and correlation from an independent basis.
// relation: 'linear' | 'quadratic' — quadratic is fully dependent but uncorrelated.
function makeSample(st) {
  const r = mul32(st.seed);
  const xs = [], ys = [];
  const { sx, sy, rho, relation } = st;
  if (relation === 'quadratic') {
    // Y = X^2 (with a little vertical scatter). Add each point AND its mirror
    // (+x, y) and (-x, y): antithetic pairs force the sample mean of X to be
    // exactly 0 and the covariance to be exactly 0 — so the "uncorrelated yet
    // fully dependent" claim is exact, not a lucky seed.
    for (let i = 0; i < N / 2; i++) {
      const z1 = gauss(r), z2 = gauss(r);
      const y = sy * (0.9 * (z1 * z1 - 1) + 0.15 * z2);
      xs.push(sx * z1);  ys.push(y);
      xs.push(-sx * z1); ys.push(y);
    }
  } else {
    for (let i = 0; i < N; i++) {
      const z1 = gauss(r), z2 = gauss(r);
      xs.push(sx * z1);
      ys.push(sy * (rho * z1 + Math.sqrt(1 - rho * rho) * z2));
    }
  }
  return { xs, ys };
}

function moments(xs, ys) {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let cov = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) {
    cov += (xs[i] - mx) * (ys[i] - my);
    vx += (xs[i] - mx) ** 2;
    vy += (ys[i] - my) ** 2;
  }
  cov /= n; vx /= n; vy /= n;
  const sx = Math.sqrt(vx), sy = Math.sqrt(vy);
  return { mx, my, sx, sy, cov, corr: cov / (sx * sy) };
}

// ── Colours ───────────────────────────────────────────────────────────────────
const POS = '#1565c0', NEG = '#e8710a', PT = '#455a64', MEAN = '#c62828', LINE = '#2e7d32';

// ── Drawing ───────────────────────────────────────────────────────────────────
function draw(c2d, st, o) {
  const { xs, ys } = makeSample(st);
  const m = moments(xs, ys);

  c2d.raw((ctx, c) => {
    const S = Math.min(c.height - 150, c.width - 420);
    const L = 90, T = 40, B = T + S, R = L + S;
    // fixed world window so scaling X is visible as the cloud stretching
    const XR = 7, YR = 5;
    const sx = x => L + (x + XR) / (2 * XR) * (R - L);
    const sy = y => B - (y + YR) / (2 * YR) * (B - T);
    const mxp = sx(m.mx), myp = sy(m.my);

    // frame + mean lines
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1; ctx.strokeRect(L, T, S, S);
    ctx.strokeStyle = '#f0d9d4'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(L, myp); ctx.lineTo(R, myp); ctx.moveTo(mxp, T); ctx.lineTo(mxp, B); ctx.stroke();
    ctx.setLineDash([]);

    // co-deviation rectangles: (x-mx)(y-my). blue = agree (positive), orange = disagree
    if (o.rects) {
      ctx.globalAlpha = 0.16;
      xs.forEach((x, i) => {
        const y = ys[i];
        const px = sx(x), py = sy(y);
        ctx.fillStyle = (x - m.mx) * (y - m.my) >= 0 ? POS : NEG;
        ctx.fillRect(Math.min(px, mxp), Math.min(py, myp), Math.abs(px - mxp), Math.abs(py - myp));
      });
      ctx.globalAlpha = 1;
    }

    // best-fit line (slope = cov/varX) — the linear structure correlation measures
    if (o.line) {
      const slope = m.cov / (m.sx * m.sx);
      const yAt = x => m.my + slope * (x - m.mx);
      ctx.strokeStyle = LINE; ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(sx(-XR), sy(Math.max(-YR, Math.min(YR, yAt(-XR)))));
      ctx.lineTo(sx(XR),  sy(Math.max(-YR, Math.min(YR, yAt(XR)))));
      ctx.stroke();
    }

    // points
    xs.forEach((x, i) => {
      ctx.beginPath();
      ctx.fillStyle = o.rects
        ? ((x - m.mx) * (ys[i] - m.my) >= 0 ? POS : NEG)
        : PT;
      ctx.globalAlpha = 0.72;
      ctx.arc(sx(x), sy(ys[i]), 3.2, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // mean marker + axis labels
    ctx.beginPath(); ctx.fillStyle = MEAN; ctx.arc(mxp, myp, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('X', (L + R) / 2, B + 26);
    ctx.save(); ctx.translate(L - 30, (T + B) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('Y', 0, 0); ctx.restore();
    ctx.fillStyle = MEAN; ctx.font = '11px system-ui'; ctx.textAlign = 'left';
    ctx.fillText('(μₓ, μᵧ)', mxp + 7, myp - 7);

    // ── readout panel on the right ──
    const px = R + 46;
    let py = T + 16;
    const row = (label, val, color = '#333', big = false) => {
      ctx.fillStyle = '#888'; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText(label, px, py);
      ctx.fillStyle = color; ctx.font = `${big ? 'bold 20px' : '600 14px'} system-ui`;
      ctx.fillText(val, px, py + (big ? 24 : 20));
      py += big ? 52 : 44;
    };
    if (o.showCov) row('Cov(X, Y)  =  E[(X−μₓ)(Y−μᵧ)]', m.cov.toFixed(2), m.cov >= 0 ? POS : NEG, true);
    if (o.showSd) { row('sd(X)', m.sx.toFixed(2)); py -= 24; row('sd(Y)', m.sy.toFixed(2)); }
    if (o.showCorr) {
      const col = m.corr >= 0 ? POS : NEG;
      row('Corr(X, Y)  =  Cov / (sdₓ · sdᵧ)', m.corr.toFixed(3), col, true);
      // a little [-1, 1] gauge
      const gx = px, gw = 210, gy = py + 2;
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gw, gy); ctx.stroke();
      ['−1', '0', '+1'].forEach((t, i) => {
        const x = gx + gw * i / 2;
        ctx.strokeStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(x, gy - 4); ctx.lineTo(x, gy + 4); ctx.stroke();
        ctx.fillStyle = '#aaa'; ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(t, x, gy + 18);
      });
      ctx.beginPath(); ctx.fillStyle = col;
      ctx.arc(gx + gw * (m.corr + 1) / 2, gy, 5, 0, Math.PI * 2); ctx.fill();
      py += 34;
    }
    if (o.note) {
      ctx.fillStyle = '#999'; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
      o.note.split('\n').forEach((ln, i) => ctx.fillText(ln, px, py + 6 + i * 18));
    }
  });
}

// ── Panel controls ────────────────────────────────────────────────────────────
function clearControls(st) { if (st._controls) st._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, on) {
  const id = 'cc-' + label.replace(/[^a-z0-9]/gi, '');
  const w = document.createElement('div');
  w.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  w.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(value)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
      style="width:100%;accent-color:#1565c0">`;
  container.appendChild(w);
  const inp = w.querySelector('input'), v = w.querySelector(`#${id}-v`);
  inp.addEventListener('input', () => { const x = parseFloat(inp.value); v.textContent = fmt(x); on(x); });
}

const rhoSlider = st => addSlider(st._controls, 'correlation ρ', -0.98, 0.98, 0.02, st.rho, v => v.toFixed(2), v => st.rho = v);
const sxSlider  = st => addSlider(st._controls, 'scale of X (sdₓ)', 0.5, 3, 0.1, st.sx, v => v.toFixed(1), v => st.sx = v);

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Covariance & Correlation',
  subject: 'Probability',

  initState() {
    return { sx: 2, sy: 1, rho: 0.7, relation: 'linear', seed: 42, _controls: null };
  },

  init(c2d, state, panelEl) {
    c2d.scale = 60;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.id = 'ml-controls';
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    {
      title: 'Do they move together?',
      description: 'A joint distribution of two random variables $X$ and $Y$ is a cloud of paired outcomes. The question covariance answers: when $X$ is above its mean, does $Y$ tend to be above its mean too? Drag $\\rho$ and watch the cloud tilt from a rising line, through a shapeless blob, to a falling one.',
      equation: '(X, Y) \\sim \\text{some joint distribution}',
      notes: 'The red dot is the pair of means $(\\mu_X, \\mu_Y)$; the dashed lines split the plane into four quadrants around it.\n\nUpper-right and lower-left: X and Y agree (both above, or both below, their means). Upper-left and lower-right: they disagree. The balance of those quadrants is the whole idea.',
      setup(c2d, st) { st.relation = 'linear'; clearControls(st); rhoSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, {}); },
    },
    {
      title: 'Covariance: averaged co-deviation',
      description: 'For each point draw the rectangle to the mean. Its signed area is $(X-\\mu_X)(Y-\\mu_Y)$ — positive (blue) when the two agree, negative (orange) when they disagree. Covariance is the average of these signed areas.',
      equation: '\\operatorname{Cov}(X, Y) = \\mathbb{E}\\big[(X - \\mu_X)(Y - \\mu_Y)\\big]',
      notes: 'When the cloud rises, blue rectangles dominate and covariance is positive. When it falls, orange wins and it is negative. For a shapeless blob the two cancel and it sits near zero.\n\nDrag ρ from + through 0 to −. Covariance tells you the SIGN and rough strength of the linear relationship — but look at its actual value, because the next step exposes its fatal flaw.',
      setup(c2d, st) { st.relation = 'linear'; clearControls(st); rhoSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { rects: true, showCov: true }); },
    },
    {
      title: 'The flaw: covariance depends on units',
      description: 'Covariance has no fixed scale. Stretch $X$ — measure it in centimetres instead of metres — and the relationship has not changed at all, yet the covariance balloons. A covariance of 500 might be a weak relationship in big units or a strong one in small units. The number alone is meaningless.',
      equation: '\\operatorname{Cov}(aX, Y) = a\\,\\operatorname{Cov}(X, Y)',
      notes: 'Drag "scale of X" and watch the covariance grow with it while the cloud keeps the exact same shape.\n\nThis is why you can never compare covariances across different pairs of variables, or judge strength from a covariance in isolation. We need to divide the units out.',
      setup(c2d, st) { st.relation = 'linear'; st.rho = 0.7; clearControls(st); sxSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { showCov: true, showSd: true }); },
    },
    {
      title: 'Correlation: covariance made unit-free',
      description: 'Divide covariance by each standard deviation. The units cancel top and bottom, leaving a pure number that is guaranteed to lie in $[-1, +1]$ — by the Cauchy–Schwarz inequality. Now $+1$ is a perfect rising line, $-1$ a perfect falling line, and $0$ no linear relationship, whatever the units.',
      equation: '\\rho = \\operatorname{Corr}(X, Y) = \\frac{\\operatorname{Cov}(X, Y)}{\\operatorname{sd}(X)\\,\\operatorname{sd}(Y)} \\in [-1, 1]',
      notes: 'Now drag "scale of X" again: the covariance still moves, but correlation does not budge. It is scale-invariant — exactly what we wanted.\n\nCorrelation is the standardised covariance: the covariance of X and Y after rescaling both to have standard deviation 1. That is why it can be compared across any pair of variables.',
      setup(c2d, st) { st.relation = 'linear'; st.rho = 0.7; clearControls(st); sxSlider(st); rhoSlider(st); },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { showCov: true, showCorr: true }); },
    },
    {
      title: 'Trap 1: it only sees straight lines',
      description: 'Correlation measures linear association and nothing else. Here $Y = X^2$: knowing $X$ tells you $Y$ exactly — total dependence — yet the correlation is essentially zero. The upward and downward arms cancel, so the best straight line through the cloud is flat.',
      equation: 'Y = X^2 \\;\\Rightarrow\\; \\text{fully dependent, yet } \\rho \\approx 0',
      notes: 'A correlation of 0 does not mean "no relationship". It means "no LINEAR relationship". The parabola is a strong relationship that correlation is simply blind to.\n\nThe green line is the best-fit line correlation is really reporting on — flat here, despite the obvious structure.',
      setup(c2d, st) {
        st.relation = 'quadratic'; clearControls(st);
        const b = document.createElement('button');
        b.textContent = 'resample'; b.style.cssText = 'padding:7px 12px;font-size:13px;border:1px solid #1565c0;color:#1565c0;background:#fff;border-radius:6px;cursor:pointer;';
        b.addEventListener('click', () => st.seed++);
        st._controls.appendChild(b);
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { line: true, showCorr: true, note: 'strong dependence,\nzero correlation' }); },
    },
    {
      title: 'Trap 2: uncorrelated is not independent',
      description: 'That $Y = X^2$ cloud is the counterexample to the most common mistake in probability. Independence means $X$ carries no information about $Y$. Uncorrelated means only that their covariance is zero. Independence implies uncorrelated — but the reverse fails, exactly as here.',
      equation: 'X \\perp Y \\;\\Rightarrow\\; \\rho = 0, \\qquad \\text{but} \\qquad \\rho = 0 \\;\\not\\Rightarrow\\; X \\perp Y',
      notes: 'The one important exception: for a MULTIVARIATE NORMAL, uncorrelated does imply independent. That special case is why the confusion is so widespread — in the Gaussian world the two really coincide, and a lot of intuition is built there.\n\nEverywhere else, zero correlation only rules out a straight-line trend. It says nothing about curves, and nothing about independence.',
      setup(c2d, st) {
        st.relation = 'quadratic'; clearControls(st);
        const b = document.createElement('button');
        b.textContent = 'resample'; b.style.cssText = 'padding:7px 12px;font-size:13px;border:1px solid #1565c0;color:#1565c0;background:#fff;border-radius:6px;cursor:pointer;';
        b.addEventListener('click', () => st.seed++);
        st._controls.appendChild(b);
      },
      update(c2d, st) { c2d.clearPersistent(); draw(c2d, st, { line: true, showCorr: true, note: 'ρ = 0, yet X fixes Y\n→ not independent' }); },
    },
  ],
};
