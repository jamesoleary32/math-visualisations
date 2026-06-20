// Distribution registry for the tools pages.
//
// Thin, consistent wrapper over jStat (loaded as the UMD global `jStat` by the
// page). Each distribution exposes the same interface so the calculator UI
// never has to special-case a distribution beyond the discrete/continuous split:
//
//   key, name, discrete            identity
//   params: [{key,label,default,min,max,step,integer}]
//   dens(x, p)                     pdf (continuous) or pmf (discrete)
//   cdf(x, p)                      P(X <= x)
//   quantile(q, p)                 inverse cdf  (q in (0,1))
//   mean(p), variance(p)           moments, or null when undefined
//   range(p)                       suggested [lo, hi] plotting window
//   tex                            KaTeX string for the density formula
//
// jStat reference: https://jstat.github.io/distributions.html

const J = () => {
  const j = globalThis.jStat;
  if (!j) throw new Error('jStat is not loaded — include the jStat <script> before this module.');
  return j;
};

// Generic inverse-cdf for a discrete distribution: smallest k with cdf(k) >= q.
function discreteQuantile(dist, q, p, hardCap = 100000) {
  const [lo, hi] = dist.rawSupport ? dist.rawSupport(p) : [0, hardCap];
  let k = lo;
  while (k < hi && dist.cdf(k, p) < q) k++;
  return k;
}

export const distributions = [
  // ---- Continuous ----------------------------------------------------------
  {
    key: 'normal', name: 'Normal', discrete: false,
    params: [
      { key: 'mu', label: 'μ (mean)', default: 0, min: -10, max: 10, step: 0.1 },
      { key: 'sigma', label: 'σ (std. dev.)', default: 1, min: 0.1, max: 6, step: 0.1 },
    ],
    dens: (x, p) => J().normal.pdf(x, p.mu, p.sigma),
    cdf: (x, p) => J().normal.cdf(x, p.mu, p.sigma),
    quantile: (q, p) => J().normal.inv(q, p.mu, p.sigma),
    mean: p => p.mu,
    variance: p => p.sigma * p.sigma,
    range: p => [p.mu - 4 * p.sigma, p.mu + 4 * p.sigma],
    tex: 'f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}\\,\\exp\\!\\left[-\\tfrac12\\left(\\tfrac{x-\\mu}{\\sigma}\\right)^{2}\\right]',
  },
  {
    key: 'exponential', name: 'Exponential', discrete: false,
    params: [{ key: 'rate', label: 'λ (rate)', default: 1, min: 0.1, max: 5, step: 0.1 }],
    dens: (x, p) => (x < 0 ? 0 : J().exponential.pdf(x, p.rate)),
    cdf: (x, p) => (x < 0 ? 0 : J().exponential.cdf(x, p.rate)),
    quantile: (q, p) => J().exponential.inv(q, p.rate),
    mean: p => 1 / p.rate,
    variance: p => 1 / (p.rate * p.rate),
    range: p => [0, J().exponential.inv(0.999, p.rate)],
    tex: 'f(x)=\\lambda e^{-\\lambda x},\\quad x\\ge 0',
  },
  {
    key: 'uniform', name: 'Uniform', discrete: false,
    params: [
      { key: 'a', label: 'a (min)', default: 0, min: -10, max: 10, step: 0.1 },
      { key: 'b', label: 'b (max)', default: 1, min: -10, max: 10, step: 0.1 },
    ],
    dens: (x, p) => J().uniform.pdf(x, p.a, p.b),
    cdf: (x, p) => J().uniform.cdf(x, p.a, p.b),
    quantile: (q, p) => p.a + q * (p.b - p.a),
    mean: p => (p.a + p.b) / 2,
    variance: p => (p.b - p.a) ** 2 / 12,
    range: p => { const d = (p.b - p.a) || 1; return [p.a - 0.08 * d, p.b + 0.08 * d]; },
    tex: 'f(x)=\\dfrac{1}{b-a},\\quad a\\le x\\le b',
  },
  {
    key: 'studentt', name: "Student's t", discrete: false,
    params: [{ key: 'dof', label: 'ν (deg. freedom)', default: 5, min: 1, max: 40, step: 1, integer: true }],
    dens: (x, p) => J().studentt.pdf(x, p.dof),
    cdf: (x, p) => J().studentt.cdf(x, p.dof),
    quantile: (q, p) => J().studentt.inv(q, p.dof),
    mean: p => (p.dof > 1 ? 0 : null),
    variance: p => (p.dof > 2 ? p.dof / (p.dof - 2) : null),
    range: () => [-6, 6],
    tex: 'f(x)=\\dfrac{\\Gamma\\!\\left(\\frac{\\nu+1}{2}\\right)}{\\sqrt{\\nu\\pi}\\,\\Gamma\\!\\left(\\frac{\\nu}{2}\\right)}\\left(1+\\tfrac{x^{2}}{\\nu}\\right)^{-\\frac{\\nu+1}{2}}',
  },
  {
    key: 'chisquare', name: 'Chi-square', discrete: false,
    params: [{ key: 'k', label: 'k (deg. freedom)', default: 3, min: 1, max: 30, step: 1, integer: true }],
    dens: (x, p) => (x < 0 ? 0 : J().chisquare.pdf(x, p.k)),
    cdf: (x, p) => (x < 0 ? 0 : J().chisquare.cdf(x, p.k)),
    quantile: (q, p) => J().chisquare.inv(q, p.k),
    mean: p => p.k,
    variance: p => 2 * p.k,
    range: p => [0, J().chisquare.inv(0.999, p.k)],
    tex: 'f(x)=\\dfrac{x^{k/2-1}e^{-x/2}}{2^{k/2}\\,\\Gamma(k/2)},\\quad x\\ge 0',
  },
  {
    key: 'gamma', name: 'Gamma', discrete: false,
    params: [
      { key: 'shape', label: 'α (shape)', default: 2, min: 0.5, max: 15, step: 0.5 },
      { key: 'scale', label: 'θ (scale)', default: 1, min: 0.1, max: 6, step: 0.1 },
    ],
    dens: (x, p) => (x < 0 ? 0 : J().gamma.pdf(x, p.shape, p.scale)),
    cdf: (x, p) => (x < 0 ? 0 : J().gamma.cdf(x, p.shape, p.scale)),
    quantile: (q, p) => J().gamma.inv(q, p.shape, p.scale),
    mean: p => p.shape * p.scale,
    variance: p => p.shape * p.scale * p.scale,
    range: p => [0, J().gamma.inv(0.999, p.shape, p.scale)],
    tex: 'f(x)=\\dfrac{x^{\\alpha-1}e^{-x/\\theta}}{\\theta^{\\alpha}\\,\\Gamma(\\alpha)},\\quad x\\ge 0',
  },
  {
    key: 'beta', name: 'Beta', discrete: false,
    params: [
      { key: 'alpha', label: 'α', default: 2, min: 0.5, max: 12, step: 0.5 },
      { key: 'beta', label: 'β', default: 2, min: 0.5, max: 12, step: 0.5 },
    ],
    dens: (x, p) => (x < 0 || x > 1 ? 0 : J().beta.pdf(x, p.alpha, p.beta)),
    cdf: (x, p) => J().beta.cdf(x, p.alpha, p.beta),
    quantile: (q, p) => J().beta.inv(q, p.alpha, p.beta),
    mean: p => p.alpha / (p.alpha + p.beta),
    variance: p => (p.alpha * p.beta) / ((p.alpha + p.beta) ** 2 * (p.alpha + p.beta + 1)),
    range: () => [0, 1],
    tex: 'f(x)=\\dfrac{x^{\\alpha-1}(1-x)^{\\beta-1}}{B(\\alpha,\\beta)},\\quad 0\\le x\\le 1',
  },

  // ---- Discrete ------------------------------------------------------------
  {
    key: 'binomial', name: 'Binomial', discrete: true,
    params: [
      { key: 'n', label: 'n (trials)', default: 20, min: 1, max: 100, step: 1, integer: true },
      { key: 'p', label: 'p (success)', default: 0.5, min: 0, max: 1, step: 0.01 },
    ],
    dens: (k, p) => J().binomial.pdf(k, p.n, p.p),
    cdf: (k, p) => J().binomial.cdf(Math.floor(k), p.n, p.p),
    mean: p => p.n * p.p,
    variance: p => p.n * p.p * (1 - p.p),
    rawSupport: p => [0, p.n],
    range: p => [0, p.n],
    tex: 'P(X=k)=\\binom{n}{k}p^{k}(1-p)^{\\,n-k}',
  },
  {
    key: 'poisson', name: 'Poisson', discrete: true,
    params: [{ key: 'lambda', label: 'λ (rate)', default: 4, min: 0.1, max: 40, step: 0.1 }],
    dens: (k, p) => J().poisson.pdf(k, p.lambda),
    cdf: (k, p) => J().poisson.cdf(Math.floor(k), p.lambda),
    mean: p => p.lambda,
    variance: p => p.lambda,
    rawSupport: p => [0, Math.ceil(p.lambda + 10 * Math.sqrt(p.lambda) + 10)],
    range: p => [0, Math.max(8, Math.ceil(p.lambda + 4 * Math.sqrt(p.lambda)))],
    tex: 'P(X=k)=\\dfrac{\\lambda^{k}e^{-\\lambda}}{k!}',
  },
  {
    key: 'geometric', name: 'Geometric', discrete: true,
    params: [{ key: 'p', label: 'p (success)', default: 0.3, min: 0.01, max: 1, step: 0.01 }],
    // Convention: number of trials until the first success, k = 1, 2, 3, ...
    dens: (k, p) => (k >= 1 ? p.p * (1 - p.p) ** (k - 1) : 0),
    cdf: (k, p) => (k < 1 ? 0 : 1 - (1 - p.p) ** Math.floor(k)),
    mean: p => 1 / p.p,
    variance: p => (1 - p.p) / (p.p * p.p),
    rawSupport: () => [1, 100000],
    range: p => [1, Math.max(5, Math.ceil(Math.log(0.001) / Math.log(1 - p.p)))],
    tex: 'P(X=k)=(1-p)^{\\,k-1}p,\\quad k=1,2,3,\\dots',
  },
];

// Fill in quantile for discrete distributions generically.
for (const d of distributions) {
  if (d.discrete && !d.quantile) d.quantile = (q, p) => discreteQuantile(d, q, p);
}

export const byKey = Object.fromEntries(distributions.map(d => [d.key, d]));

// Default parameter object for a distribution.
export function defaults(dist) {
  return Object.fromEntries(dist.params.map(pr => [pr.key, pr.default]));
}

// Sampled data for plotting the density (line points or pmf bars).
export function densityData(dist, p) {
  const [lo, hi] = dist.range(p);
  if (dist.discrete) {
    const bars = [];
    for (let k = Math.ceil(lo); k <= Math.floor(hi); k++) bars.push({ x: k, y: dist.dens(k, p) });
    return { discrete: true, bars, domain: [lo - 0.5, hi + 0.5] };
  }
  const N = 256, points = [];
  for (let i = 0; i <= N; i++) {
    const x = lo + (hi - lo) * i / N;
    points.push({ x, y: dist.dens(x, p) });
  }
  return { discrete: false, points, domain: [lo, hi] };
}

// Sampled data for plotting the cdf.
export function cdfData(dist, p) {
  const [lo, hi] = dist.range(p);
  if (dist.discrete) {
    const pts = [];
    for (let k = Math.ceil(lo); k <= Math.floor(hi); k++) pts.push({ x: k, y: dist.cdf(k, p) });
    return { discrete: true, points: pts, domain: [lo - 0.5, hi + 0.5] };
  }
  const N = 256, points = [];
  for (let i = 0; i <= N; i++) {
    const x = lo + (hi - lo) * i / N;
    points.push({ x, y: dist.cdf(x, p) });
  }
  return { discrete: false, points, domain: [lo, hi] };
}
