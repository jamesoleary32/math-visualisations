// Bayes' Rule & the Law of Total Probability — Probability
//
// Builds on the Conditional Probability lesson. Four ideas, in order:
//   1. Law of total probability — break P(A) into pieces over a partition {Bᵢ}.
//   2. Bayes' rule              — invert the conditional using those pieces.
//   3. Worked example           — the rare-disease test (the base-rate payoff).
//   4. Chain rule               — generalise to the intersection of n events.

// ── Colours ─────────────────────────────────────────────────────────────────
const A_FILL  = 'rgba(21,101,192,0.42)';  // the event A (favourable area)
const HILITE  = 'rgba(198,40,40,0.55)';   // the posterior column we single out
const COL_TINT = 'rgba(0,0,0,0.035)';     // faint column shading

// ── A worked partition (illustrative numbers) ───────────────────────────────
// Sample space split into 3 disjoint causes B1,B2,B3 with widths = P(Bᵢ),
// and within each, A occupies a fraction = P(A|Bᵢ) (the rectangle's height).
const W = [0.50, 0.30, 0.20];            // P(B1), P(B2), P(B3)   (sum to 1)
const H = [0.30, 0.60, 0.50];            // P(A|B1), P(A|B2), P(A|B3)
const PIECE = W.map((w, i) => w * H[i]); // P(A ∩ Bᵢ) = 0.15, 0.18, 0.10
const P_A   = PIECE.reduce((s, p) => s + p, 0); // P(A) = 0.43
const J     = 1; // index of the column we invert for in step 2 (B2)

// ── Rare-disease test numbers (step 3) ──────────────────────────────────────
const P_D    = 0.01;            // prevalence (base rate)
const P_pos_D  = 0.90;          // sensitivity  P(+|D)
const P_pos_Dc = 0.05;          // false-positive rate P(+|Dᶜ)
const J_Dpos = P_pos_D  * P_D;        // P(+ ∩ D)  = 0.009
const J_Dcpos = P_pos_Dc * (1 - P_D); // P(+ ∩ Dᶜ) = 0.0495
const P_pos  = J_Dpos + J_Dcpos;      // P(+)      = 0.0585
const P_D_pos = J_Dpos / P_pos;       // P(D|+)    ≈ 0.1538

// ── Chain-rule cascade numbers (step 4) ─────────────────────────────────────
const CHAIN = [0.60, 0.50, 0.40];          // P(A1), P(A2|A1), P(A3|A1∩A2)
const RUN   = CHAIN.reduce((acc, f) => {    // running products: .6, .3, .12
  acc.push((acc.length ? acc[acc.length - 1] : 1) * f); return acc;
}, []);

// ── Unit-square helper ──────────────────────────────────────────────────────
// Maps (u,v) ∈ [0,1]² onto a world square centred at (cx,cy) of given side.
function unitSquare(cam, cx, cy, side) {
  const h = side / 2;
  return {
    px: u => cam.wx(cx - h + u * side),
    py: v => cam.wy(cy - h + v * side),
  };
}

// Fill / stroke a rectangle given in unit (u,v) coordinates.
function uRect(ctx, sq, u0, v0, u1, v1, { fill = null, stroke = null, width = 1.5 } = {}) {
  const x = sq.px(u0), y = sq.py(v1);
  const w = sq.px(u1) - sq.px(u0), hgt = sq.py(v0) - sq.py(v1);
  if (fill)   { ctx.fillStyle = fill;     ctx.fillRect(x, y, w, hgt); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.strokeRect(x, y, w, hgt); }
}

function label(ctx, x, y, text, { color = '#333', size = 13, align = 'center', bold = false, italic = false } = {}) {
  ctx.fillStyle = color;
  ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

// Draws the partitioned unit square. If `hiCol` is set, that column's A-piece
// is painted in HILITE instead of A_FILL (used to show a posterior in step 2).
function drawPartition(ctx, sq, { hiCol = null, showPieces = false } = {}) {
  // Column tints + the A rectangles (anchored at the bottom, height = P(A|Bᵢ)).
  let u = 0;
  for (let i = 0; i < W.length; i++) {
    const u0 = u, u1 = u + W[i];
    if (i % 2 === 1) uRect(ctx, sq, u0, 0, u1, 1, { fill: COL_TINT });
    uRect(ctx, sq, u0, 0, u1, H[i], { fill: i === hiCol ? HILITE : A_FILL });
    // Column divider
    if (i > 0) { ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sq.px(u0), sq.py(0)); ctx.lineTo(sq.px(u0), sq.py(1)); ctx.stroke(); }
    // Header above the square: Bᵢ and its prior width.
    label(ctx, (sq.px(u0) + sq.px(u1)) / 2, sq.py(1) - 8, `B${i + 1}`, { bold: true, size: 14 });
    label(ctx, (sq.px(u0) + sq.px(u1)) / 2, sq.py(1) + 18, `P(B${i + 1})=${W[i]}`, { color: '#888', size: 11 });
    // Conditional height label inside the A-piece.
    label(ctx, (sq.px(u0) + sq.px(u1)) / 2, sq.py(H[i] / 2) + 4, H[i].toFixed(2), { color: '#fff', size: 12, bold: true });
    if (showPieces) label(ctx, (sq.px(u0) + sq.px(u1)) / 2, sq.py(H[i]) - 8,
      `${PIECE[i].toFixed(2)}`, { color: '#0d47a1', size: 11, bold: true });
    u = u1;
  }
  // Outer square border + S label + A label.
  uRect(ctx, sq, 0, 0, 1, 1, { stroke: '#555', width: 1.5 });
  label(ctx, sq.px(0) + 6, sq.py(1) + 14, 'S', { color: '#aaa', size: 11, align: 'left' });
  label(ctx, sq.px(0) - 14, sq.py(0.12), 'A', { color: '#0d47a1', size: 15, bold: true, italic: true, align: 'right' });
}

// ── Tree helper (step 3) ──────────────────────────────────────────────────────
function node(ctx, cam, wx, wy, r = 5, color = '#333') {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cam.wx(wx), cam.wy(wy), r, 0, Math.PI * 2); ctx.fill();
}
function edge(ctx, cam, x0, y0, x1, y1, text, { color = '#777', leaf = null } = {}) {
  ctx.strokeStyle = color; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cam.wx(x0), cam.wy(y0)); ctx.lineTo(cam.wx(x1), cam.wy(y1)); ctx.stroke();
  label(ctx, (cam.wx(x0) + cam.wx(x1)) / 2, (cam.wy(y0) + cam.wy(y1)) / 2 - 6, text, { color: '#555', size: 12 });
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   "Bayes' Rule & Total Probability",
  subject: 'Probability',

  init(c2d) { c2d.scale = 60; },

  steps: [
    // ── Step 1: Law of total probability ────────────────────────────────────
    {
      title:       'Law of Total Probability',
      description: 'Split the sample space into disjoint "causes" B₁, B₂, B₃ that cover all of S (a partition). Any event A is sliced into pieces, one per cause: A∩Bᵢ. Since the pieces never overlap and together make up all of A, P(A) is just their sum. Each piece is a rectangle of width P(Bᵢ) and height P(A|Bᵢ), so its area is P(A|Bᵢ)·P(Bᵢ).',
      equation:    'P(A) = \\sum_{i} P(A \\cap B_i) = \\sum_{i} P(A \\mid B_i)\\,P(B_i)',
      notes:       'Read the blue area as P(A), assembled column by column:\n  • column width  = P(Bᵢ), the prior weight of that cause.\n  • column height = P(A|Bᵢ), how likely A is once that cause is fixed.\n  • blue area     = P(A∩Bᵢ) = height × width.\n\nHere P(A) = 0.50·0.30 + 0.30·0.60 + 0.20·0.50 = 0.15 + 0.18 + 0.10 = 0.43. A partition turns one hard probability into a weighted average of easy conditional ones.',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f6f6f6' });
        c2d.raw((ctx, cam) => {
          const sq = unitSquare(cam, 0, 0, 3.6);
          drawPartition(ctx, sq, { showPieces: true });
        });
      },
    },

    // ── Step 2: Bayes' rule ──────────────────────────────────────────────────
    {
      title:       "Bayes' Rule",
      description: 'Now run the question backwards. Given that A happened, which cause was responsible? That is the posterior P(Bⱼ|A). Geometrically it is one shaded rectangle divided by the whole shaded area: P(Bⱼ|A) = P(A∩Bⱼ)/P(A). Writing the top as P(A|Bⱼ)P(Bⱼ) and the bottom by total probability gives Bayes’ rule. Highlighted: B₂, with P(B₂|A) = 0.18/0.43 ≈ 0.42.',
      equation:    "P(B_j \\mid A) = \\dfrac{P(A \\mid B_j)\\,P(B_j)}{\\sum_i P(A \\mid B_i)\\,P(B_i)}",
      notes:       'Bayes just relabels the picture from step 1:\n  • numerator   — the red rectangle, the slice of A coming from cause B₂.\n  • denominator — every shaded rectangle, i.e. all of A (total probability).\n\nThis is exactly how the previous lesson’s asymmetry is repaired: to flip P(A|B) into P(B|A) you reweight by the priors P(Bⱼ) and renormalise by P(A). The posterior is the share of A’s area sitting in column j.',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f6f6f6' });
        c2d.raw((ctx, cam) => {
          const sq = unitSquare(cam, 0, 0, 3.6);
          drawPartition(ctx, sq, { hiCol: J, showPieces: true });
          // Posterior readout.
          label(ctx, cam.wx(0), sq.py(0) + 34,
            `P(B${J + 1} | A) = ${PIECE[J].toFixed(2)} / ${P_A.toFixed(2)} ≈ ${(PIECE[J] / P_A).toFixed(2)}`,
            { color: '#c62828', size: 14, bold: true });
        });
      },
    },

    // ── Step 3: The rare-disease test ────────────────────────────────────────
    {
      title:       'Worked Example — A Rare-Disease Test',
      description: 'A disease affects 1% of people. The test catches 90% of true cases (P(+|D)=0.90) but also flags 5% of healthy people (P(+|Dᶜ)=0.05). You test positive — what is P(D|+)? The tree multiplies along each path to get joint probabilities; the two "+" leaves are the only ways to test positive, so their sum is P(+). Bayes divides the true-positive path by that total.',
      equation:    "P(D \\mid +) = \\dfrac{P(+\\mid D)P(D)}{P(+\\mid D)P(D) + P(+\\mid D^c)P(D^c)} = \\dfrac{0.009}{0.0585} \\approx 0.154",
      notes:       'Despite a "90% accurate" test, a positive result means only a ~15% chance of disease. The base rate dominates: healthy people are so much more numerous that their 5% false positives (0.0495) swamp the true positives (0.009).\n\nThis is the base-rate fallacy from the last lesson, now resolved: P(+|D)=0.90 is large, yet P(D|+)≈0.15 is small. They differ because P(D) ≪ P(+).',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f8f8f8' });
        c2d.raw((ctx, cam) => {
          const root = [-4.2, 0];
          const D = [-1.6, 1.7], Dc = [-1.6, -1.7];
          const Dp = [1.0, 2.5], Dm = [1.0, 1.0], Dcp = [1.0, -1.0], Dcm = [1.0, -2.5];

          edge(ctx, cam, root[0], root[1], D[0],  D[1],  'P(D)=0.01');
          edge(ctx, cam, root[0], root[1], Dc[0], Dc[1], 'P(Dᶜ)=0.99');
          edge(ctx, cam, D[0],  D[1],  Dp[0],  Dp[1],  '+ : 0.90', { });
          edge(ctx, cam, D[0],  D[1],  Dm[0],  Dm[1],  '− : 0.10');
          edge(ctx, cam, Dc[0], Dc[1], Dcp[0], Dcp[1], '+ : 0.05');
          edge(ctx, cam, Dc[0], Dc[1], Dcm[0], Dcm[1], '− : 0.95');

          node(ctx, cam, root[0], root[1], 5, '#333');
          node(ctx, cam, D[0],  D[1],  5, '#1565c0');
          node(ctx, cam, Dc[0], Dc[1], 5, '#777');
          // Highlight the two "+" leaves.
          node(ctx, cam, Dp[0],  Dp[1],  6, '#c62828');
          node(ctx, cam, Dm[0],  Dm[1],  4, '#bbb');
          node(ctx, cam, Dcp[0], Dcp[1], 6, '#c62828');
          node(ctx, cam, Dcm[0], Dcm[1], 4, '#bbb');

          // Leaf joint-probability annotations.
          label(ctx, cam.wx(Dp[0]) + 14,  cam.wy(Dp[1]) + 4,  `D , +   →  ${J_Dpos.toFixed(4)}`,  { color: '#c62828', size: 12, align: 'left', bold: true });
          label(ctx, cam.wx(Dm[0]) + 14,  cam.wy(Dm[1]) + 4,  `D , −   →  ${(P_D - J_Dpos).toFixed(4)}`, { color: '#aaa', size: 11, align: 'left' });
          label(ctx, cam.wx(Dcp[0]) + 14, cam.wy(Dcp[1]) + 4, `Dᶜ, +  →  ${J_Dcpos.toFixed(4)}`, { color: '#c62828', size: 12, align: 'left', bold: true });
          label(ctx, cam.wx(Dcm[0]) + 14, cam.wy(Dcm[1]) + 4, `Dᶜ, −  →  ${((1 - P_D) - J_Dcpos).toFixed(4)}`, { color: '#aaa', size: 11, align: 'left' });

          // Result box on the right.
          label(ctx, cam.wx(3.9), cam.wy(0.7),  `P(+) = ${J_Dpos.toFixed(4)} + ${J_Dcpos.toFixed(4)} = ${P_pos.toFixed(4)}`, { color: '#333', size: 13, align: 'center' });
          label(ctx, cam.wx(3.9), cam.wy(0.0),  `P(D | +) = ${J_Dpos.toFixed(4)} / ${P_pos.toFixed(4)}`, { color: '#c62828', size: 14, align: 'center', bold: true });
          label(ctx, cam.wx(3.9), cam.wy(-0.6), `≈ ${(P_D_pos * 100).toFixed(1)} %`, { color: '#c62828', size: 18, align: 'center', bold: true });
        });
      },
    },

    // ── Step 4: Chain rule for n events ─────────────────────────────────────
    {
      title:       'Generalising — The Chain Rule for n Events',
      description: 'The definition P(A∩B) = P(A)·P(B|A) extends to any number of events. Build the intersection one event at a time: each new event is conditioned on everything assumed so far, and the joint probability is the product of those conditionals. Geometrically, every factor shrinks the surviving region — the nested boxes show P(A₁) = 0.6, then ×0.5, then ×0.4, leaving P(A₁∩A₂∩A₃) = 0.12.',
      equation:    "P\\!\\left(\\bigcap_{i=1}^{n} A_i\\right) = P(A_1)\\,P(A_2\\mid A_1)\\,P(A_3\\mid A_1\\cap A_2)\\cdots = \\prod_{i=1}^{n} P\\!\\left(A_i \\,\\middle|\\, \\textstyle\\bigcap_{k<i} A_k\\right)",
      notes:       'The chain rule is the engine under everything in this lesson:\n  • n = 2 gives P(A∩B) = P(A)P(B|A) — the definition of conditioning.\n  • summing that over a partition gives the law of total probability.\n  • rearranging it gives Bayes’ rule.\n\nOrder is free: you may peel the events off in any sequence and the product is the same. Each nested box is the running intersection; the conditional factor on each arrow is its area relative to the box enclosing it.',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f6f6f6' });
        c2d.raw((ctx, cam) => {
          const sq = unitSquare(cam, -1.4, 0, 3.6);
          // Nested boxes sharing the bottom-left corner; heights = running product.
          uRect(ctx, sq, 0, 0, 1, 1, { stroke: '#555' });
          label(ctx, sq.px(0) + 6, sq.py(1) + 14, 'S  (P = 1)', { color: '#aaa', size: 11, align: 'left' });

          const fills = ['rgba(21,101,192,0.20)', 'rgba(21,101,192,0.34)', 'rgba(21,101,192,0.52)'];
          const lbls  = ['A₁', 'A₁∩A₂', 'A₁∩A₂∩A₃'];
          for (let i = 0; i < RUN.length; i++) {
            uRect(ctx, sq, 0, 0, 0.82, RUN[i], { fill: fills[i], stroke: '#1565c0', width: 1 });
            label(ctx, sq.px(0.41), sq.py(RUN[i]) - 9, `${lbls[i]} = ${RUN[i].toFixed(2)}`,
              { color: '#0d47a1', size: 12, bold: true });
          }

          // Cascade of conditional factors to the right.
          const fx = 2.4;
          label(ctx, cam.wx(fx), cam.wy(1.7), 'each step multiplies by', { color: '#555', size: 12, align: 'left' });
          const names = ['P(A₁)        = 0.60', 'P(A₂ | A₁)    = 0.50', 'P(A₃ | A₁∩A₂) = 0.40'];
          for (let i = 0; i < names.length; i++) {
            label(ctx, cam.wx(fx), cam.wy(1.0 - i * 0.7), `× ${names[i]}`, { color: '#1565c0', size: 13, align: 'left' });
            label(ctx, cam.wx(fx + 3.3), cam.wy(1.0 - i * 0.7), `→ ${RUN[i].toFixed(2)}`, { color: '#0d47a1', size: 13, align: 'left', bold: true });
          }
          label(ctx, cam.wx(fx), cam.wy(-1.6), `P(A₁∩A₂∩A₃) = ${RUN[RUN.length - 1].toFixed(2)}`,
            { color: '#0d47a1', size: 15, align: 'left', bold: true });
        });
      },
    },
  ],
};
