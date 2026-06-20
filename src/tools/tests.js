// Classical hypothesis tests for the statistical-tests tool page.
//
// p-values come from jStat's t and chi-square CDFs. Each function returns a
// uniform shape: { stat, df, p, extra } so the UI can render results generically.
//   - stat:  the test statistic
//   - df:    degrees of freedom (may be fractional for Welch)
//   - p:     two-sided p-value unless noted
//   - rows:  [[label, value], ...] of supporting quantities to display

const J = () => {
  const j = globalThis.jStat;
  if (!j) throw new Error('jStat is not loaded.');
  return j;
};

export function parseData(text) {
  return text
    .split(/[\s,;]+/)
    .map(s => s.trim())
    .filter(s => s.length)
    .map(Number)
    .filter(v => Number.isFinite(v));
}

const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const variance = a => { const m = mean(a); return a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1); };

function tTwoSided(t, df) {
  return 2 * (1 - J().studentt.cdf(Math.abs(t), df));
}

// One-sample t-test: is the population mean equal to mu0?
export function oneSampleT(data, mu0) {
  const n = data.length;
  if (n < 2) throw new Error('Need at least 2 observations.');
  const m = mean(data), s = Math.sqrt(variance(data));
  const se = s / Math.sqrt(n);
  const t = (m - mu0) / se;
  const df = n - 1;
  return {
    title: 'One-sample t-test',
    stat: t, df, p: tTwoSided(t, df),
    rows: [
      ['n', n], ['sample mean', m], ['sample sd', s],
      ['standard error', se], ['μ₀', mu0],
    ],
  };
}

// Welch's two-sample t-test (does not assume equal variances).
export function welchT(a, b) {
  if (a.length < 2 || b.length < 2) throw new Error('Each sample needs at least 2 observations.');
  const ma = mean(a), mb = mean(b);
  const va = variance(a), vb = variance(b);
  const na = a.length, nb = b.length;
  const se = Math.sqrt(va / na + vb / nb);
  const t = (ma - mb) / se;
  const df = (va / na + vb / nb) ** 2 /
    ((va / na) ** 2 / (na - 1) + (vb / nb) ** 2 / (nb - 1));
  return {
    title: "Welch's two-sample t-test",
    stat: t, df, p: tTwoSided(t, df),
    rows: [
      ['n₁, n₂', `${na}, ${nb}`],
      ['mean₁, mean₂', `${fmt(ma)}, ${fmt(mb)}`],
      ['sd₁, sd₂', `${fmt(Math.sqrt(va))}, ${fmt(Math.sqrt(vb))}`],
      ['difference', ma - mb], ['standard error', se],
    ],
  };
}

// Paired t-test: one-sample t-test on the within-pair differences.
export function pairedT(a, b) {
  if (a.length !== b.length) throw new Error('Paired samples must be the same length.');
  const diff = a.map((v, i) => v - b[i]);
  const res = oneSampleT(diff, 0);
  res.title = 'Paired t-test';
  res.rows.unshift(['mean difference', mean(diff)]);
  return res;
}

// Chi-square goodness-of-fit. expected may be omitted (uniform) or counts that
// are normalised to the observed total.
export function chiSquareGoF(observed, expected) {
  const k = observed.length;
  if (k < 2) throw new Error('Need at least 2 categories.');
  const total = observed.reduce((s, v) => s + v, 0);
  let exp;
  if (!expected || expected.length === 0) {
    exp = observed.map(() => total / k);
  } else {
    if (expected.length !== k) throw new Error('Expected and observed must have the same number of categories.');
    const es = expected.reduce((s, v) => s + v, 0);
    exp = expected.map(v => (v / es) * total); // scale expected to observed total
  }
  if (exp.some(e => e <= 0)) throw new Error('Expected counts must be positive.');
  const chi2 = observed.reduce((s, o, i) => s + (o - exp[i]) ** 2 / exp[i], 0);
  const df = k - 1;
  return {
    title: 'Chi-square goodness-of-fit',
    stat: chi2, df, p: 1 - J().chisquare.cdf(chi2, df),
    rows: [
      ['categories', k], ['total observed', total],
      ['expected (per cat.)', exp.map(fmt).join(', ')],
    ],
  };
}

function fmt(v) {
  if (typeof v !== 'number') return v;
  return Math.abs(v) >= 1000 || (Math.abs(v) < 0.001 && v !== 0)
    ? v.toExponential(2)
    : String(Math.round(v * 10000) / 10000);
}
