// Minimal dependency-free canvas plotting for the tools pages.
//
// render(canvas, {
//   type:   'line' | 'bars',
//   points: [{x, y}],          // for type 'line'
//   bars:   [{x, y}],          // for type 'bars'
//   domain: [x0, x1],          // optional; inferred from data otherwise
//   range:  [y0, y1],          // optional; inferred (y0 defaults to 0)
//   shade:  { from, to },      // optional region to fill under the curve / bars
//   marker: x,                 // optional dashed vertical line
//   color:  '#2563eb',
//   yLabel: 'f(x)',
// })

const AXIS = '#cfcfcf';
const TEXT = '#999';
const GRID = '#f0f0f0';

export function render(canvas, spec) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  const m = { l: 50, r: 16, t: 14, b: 30 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const color = spec.color || '#2563eb';
  const data = spec.type === 'bars' ? spec.bars : spec.points;

  const [x0, x1] = spec.domain || [data[0].x, data[data.length - 1].x];
  let y0 = 0, y1 = spec.range ? spec.range[1] : Math.max(...data.map(d => d.y), 1e-9);
  if (spec.range) [y0, y1] = spec.range;
  if (y1 <= y0) y1 = y0 + 1;
  y1 *= 1.08; // headroom

  const sx = x => m.l + ((x - x0) / (x1 - x0)) * pw;
  const sy = y => m.t + ph - ((y - y0) / (y1 - y0)) * ph;

  // grid + ticks
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const t of niceTicks(x0, x1, 6)) {
    const px = sx(t);
    ctx.strokeStyle = GRID; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, m.t); ctx.lineTo(px, m.t + ph); ctx.stroke();
    ctx.fillText(fmt(t), px, m.t + ph + 7);
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (const t of niceTicks(y0, y1, 4)) {
    const py = sy(t);
    ctx.strokeStyle = GRID; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(m.l, py); ctx.lineTo(m.l + pw, py); ctx.stroke();
    ctx.fillStyle = TEXT; ctx.fillText(fmt(t), m.l - 7, py);
  }

  // axes
  ctx.strokeStyle = AXIS; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(m.l, m.t); ctx.lineTo(m.l, m.t + ph); ctx.lineTo(m.l + pw, m.t + ph);
  ctx.stroke();

  if (spec.type === 'bars') {
    const bw = Math.max(2, Math.min(24, pw / (spec.bars.length * 1.5)));
    for (const b of spec.bars) {
      const inShade = spec.shade && b.x >= spec.shade.from - 1e-9 && b.x <= spec.shade.to + 1e-9;
      ctx.fillStyle = inShade ? color : rgba(color, 0.40);
      const top = sy(b.y), base = sy(y0);
      ctx.fillRect(sx(b.x) - bw / 2, top, bw, Math.max(0, base - top));
    }
  } else {
    if (spec.shade) {
      const { from, to } = spec.shade;
      ctx.fillStyle = rgba(color, 0.20);
      ctx.beginPath();
      ctx.moveTo(sx(clamp(from, x0, x1)), sy(y0));
      let drew = false;
      for (const pt of spec.points) {
        if (pt.x >= from && pt.x <= to) { ctx.lineTo(sx(pt.x), sy(pt.y)); drew = true; }
      }
      if (drew) { ctx.lineTo(sx(clamp(to, x0, x1)), sy(y0)); ctx.closePath(); ctx.fill(); }
    }
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath();
    spec.points.forEach((pt, i) => {
      const X = sx(pt.x), Y = sy(pt.y);
      i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    });
    ctx.stroke();
  }

  if (spec.marker != null && spec.marker >= x0 && spec.marker <= x1) {
    const px = sx(spec.marker);
    ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(px, m.t); ctx.lineTo(px, m.t + ph); ctx.stroke();
    ctx.setLineDash([]);
  }

  if (spec.yLabel) {
    ctx.save();
    ctx.translate(13, m.t + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = TEXT; ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(spec.yLabel, 0, 0);
    ctx.restore();
  }
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function niceTicks(min, max, count) {
  const step = niceNum(niceNum(max - min, false) / (count - 1), true);
  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.5; v += step) {
    if (v >= min - 1e-9 && v <= max + 1e-9) ticks.push(Math.abs(v) < step / 1e6 ? 0 : v);
  }
  return ticks;
}

function niceNum(range, round) {
  if (range <= 0) return 1;
  const exp = Math.floor(Math.log10(range));
  const f = range / 10 ** exp;
  const nf = round
    ? (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10)
    : (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10);
  return nf * 10 ** exp;
}

function fmt(v) {
  if (Math.abs(v) < 1e-9) return '0';
  const a = Math.abs(v);
  if (a >= 10000 || a < 0.001) return v.toExponential(1);
  return String(Math.round(v * 1000) / 1000);
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
