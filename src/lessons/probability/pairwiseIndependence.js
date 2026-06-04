// Pairwise vs. Mutual Independence — Probability
//
// Follows the Independence lesson. Pairwise independence (every PAIR factorises)
// is strictly weaker than mutual / total independence (every SUB-COLLECTION
// factorises, the triple included). Three steps:
//   1. The two definitions, and how many conditions each demands.
//   2. The classic counterexample — two fair coins and their parity.
//   3. The triple condition fails, even though all three pairs hold.

// ── Colours ─────────────────────────────────────────────────────────────────
const A_FILL = 'rgba(21,101,192,0.30)';   // A = {X = 1}   (right column)
const B_FILL = 'rgba(39,174,96,0.30)';    // B = {Y = 1}   (top row)
const C_MARK = '#c62828';                  // C = {X⊕Y = 1} (anti-diagonal)
const A_LINE = '#1565c0', B_LINE = '#1e8449';

function label(ctx, x, y, text, { color = '#333', size = 13, align = 'center', bold = false, italic = false } = {}) {
  ctx.fillStyle = color;
  ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
}

// ── The 2×2 outcome grid for two fair coin flips (X, Y) ──────────────────────
// Cell (X,Y) with X ∈ {0,1} across, Y ∈ {0,1} up. Each cell has probability ¼.
//   A = {X = 1}      → right column   (cells with X=1)
//   B = {Y = 1}      → top row        (cells with Y=1)
//   C = {X ⊕ Y = 1}  → anti-diagonal  (exactly one of X,Y equals 1)
function inA(x, y) { return x === 1; }
function inB(x, y) { return y === 1; }
function inC(x, y) { return (x ^ y) === 1; }

// Draw the grid centred at (cx,cy) with the given world side. Flags toggle which
// event overlays are shown; `tripleOnly` shades the (empty) A∩B∩C region.
function drawGrid(ctx, cam, cx, cy, side, { showA = true, showB = true, showC = true, dim = false } = {}) {
  const h = side / 2;
  const px = u => cam.wx(cx - h + u * side);   // u,v ∈ [0,1] over the whole grid
  const py = v => cam.wy(cy - h + v * side);
  const half = 0.5;

  // Cell backgrounds + event overlays.
  for (let X = 0; X <= 1; X++) {
    for (let Y = 0; Y <= 1; Y++) {
      const u0 = X * half, v0 = Y * half;
      const x = px(u0), y = py(v0 + half), w = px(u0 + half) - px(u0), ht = py(v0) - py(v0 + half);
      ctx.fillStyle = dim ? '#fafafa' : '#ffffff';
      ctx.fillRect(x, y, w, ht);
      if (!dim) {
        if (showA && inA(X, Y)) { ctx.fillStyle = A_FILL; ctx.fillRect(x, y, w, ht); }
        if (showB && inB(X, Y)) { ctx.fillStyle = B_FILL; ctx.fillRect(x, y, w, ht); }
      }
      // probability + coordinate label
      const ccx = (px(u0) + px(u0 + half)) / 2, ccy = (py(v0) + py(v0 + half)) / 2;
      label(ctx, ccx, ccy - 2, `(${X},${Y})`, { color: '#555', size: 12, bold: true });
      label(ctx, ccx, ccy + 16, '¼', { color: '#999', size: 12 });
      // C is marked with a ring so it reads on top of A/B fills.
      if (showC && inC(X, Y)) {
        ctx.strokeStyle = C_MARK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(ccx, ccy + 6, Math.min(w, ht) * 0.30, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  // Grid lines + border.
  ctx.strokeStyle = '#777'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px(half), py(0)); ctx.lineTo(px(half), py(1));
  ctx.moveTo(px(0), py(half)); ctx.lineTo(px(1), py(half));
  ctx.stroke();
  ctx.strokeStyle = '#444'; ctx.lineWidth = 1.5;
  ctx.strokeRect(px(0), py(1), px(1) - px(0), py(0) - py(1));

  // Axis hints.
  label(ctx, (px(0) + px(half)) / 2, py(0) + 18, 'X=0', { color: '#999', size: 11 });
  label(ctx, (px(half) + px(1)) / 2, py(0) + 18, 'X=1', { color: A_LINE, size: 11, bold: true });
  ctx.save();
  ctx.translate(px(0) - 16, (py(0) + py(half)) / 2); ctx.rotate(-Math.PI / 2);
  label(ctx, 0, 0, 'Y=0', { color: '#999', size: 11 });
  ctx.restore();
  ctx.save();
  ctx.translate(px(0) - 16, (py(half) + py(1)) / 2); ctx.rotate(-Math.PI / 2);
  label(ctx, 0, 0, 'Y=1', { color: B_LINE, size: 11, bold: true });
  ctx.restore();
}

// Counts for the conditions table in step 1.
const choose2 = n => (n * (n - 1)) / 2;
const mutualConds = n => Math.pow(2, n) - n - 1;   // every subset of size ≥ 2

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Pairwise vs. Mutual Independence',
  subject: 'Probability',

  init(c2d) { c2d.scale = 60; },

  steps: [
    // ── Step 1: Two different definitions ───────────────────────────────────
    {
      title:       'Two Strengths of Independence',
      description: 'For three or more events, "independent" splits into two notions. Pairwise independence asks only that every PAIR factorises: P(AᵢAⱼ)=P(Aᵢ)P(Aⱼ). Mutual (total) independence is far stronger — EVERY sub-collection must factorise, including the grand product of all of them. Mutual independence implies pairwise, but the table shows it demands many more equations, so the converse can fail.',
      equation:    '\\text{pairwise:}\\ \\binom{n}{2}\\ \\text{conditions} \\qquad \\text{mutual:}\\ 2^{n}-n-1\\ \\text{conditions}',
      notes:       'A collection is mutually independent when P of any intersection equals the product of the individual probabilities — for pairs, triples, quadruples, all the way up. The count 2ⁿ−n−1 is "all subsets minus the empty set and the n singletons".\n\nFor n=3 you need 3 pair conditions PLUS the triple P(A∩B∩C)=P(A)P(B)P(C) — four in all. Pairwise checks only the first three. The next steps build three events that pass all three pair checks yet fail the triple, proving pairwise ⇏ mutual.',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f8f8f8' });
        c2d.raw((ctx, cam) => {
          label(ctx, cam.wx(0), cam.wy(2.6), 'How many product conditions must hold?',
            { color: '#333', size: 14, bold: true });

          const x0 = -3.2, colN = x0, colP = x0 + 2.4, colM = x0 + 4.9;
          const yTop = 1.9, dy = 0.62;
          label(ctx, cam.wx(colN), cam.wy(yTop), 'events n', { color: '#555', size: 12, bold: true, align: 'left' });
          label(ctx, cam.wx(colP), cam.wy(yTop), 'pairwise  C(n,2)', { color: A_LINE, size: 12, bold: true, align: 'left' });
          label(ctx, cam.wx(colM), cam.wy(yTop), 'mutual  2ⁿ−n−1', { color: C_MARK, size: 12, bold: true, align: 'left' });
          ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(cam.wx(x0 - 0.2), cam.wy(yTop - 0.22)); ctx.lineTo(cam.wx(x0 + 7.2), cam.wy(yTop - 0.22)); ctx.stroke();

          for (let i = 0; i < 5; i++) {
            const n = i + 2, y = yTop - 0.35 - (i + 1) * dy;
            label(ctx, cam.wx(colN), cam.wy(y), `${n}`, { color: '#333', size: 13, align: 'left' });
            label(ctx, cam.wx(colP), cam.wy(y), `${choose2(n)}`, { color: A_LINE, size: 13, align: 'left' });
            label(ctx, cam.wx(colM), cam.wy(y), `${mutualConds(n)}`, { color: C_MARK, size: 13, bold: n >= 3, align: 'left' });
          }
          label(ctx, cam.wx(0), cam.wy(-2.7),
            'mutual ⇒ pairwise   —   but the gap (n ≥ 3) leaves room for pairwise ⇏ mutual',
            { color: '#888', size: 12 });
        });
      },
    },

    // ── Step 2: The counterexample — all three pairs are independent ─────────
    {
      title:       'A Counterexample: Two Coins and Their Parity',
      description: 'Flip two fair coins, X and Y; the four outcomes are equally likely (¼ each). Define A = {X=1} (right column), B = {Y=1} (top row), and C = {X⊕Y=1} = "exactly one coin shows 1" (the two ringed cells). Each event has probability ½. Checking the three pairs, every intersection lands on a single cell of probability ¼ — exactly ½·½. So all three pairs are independent.',
      equation:    'P(A\\cap B)=P(A\\cap C)=P(B\\cap C)=\\tfrac14=\\tfrac12\\cdot\\tfrac12',
      notes:       'Read each pair off the grid:\n  • A∩B = {(1,1)}  → ¼ = P(A)P(B)  ✓\n  • A∩C = {(1,0)}  → ¼ = P(A)P(C)  ✓\n  • B∩C = {(0,1)}  → ¼ = P(B)P(C)  ✓\n\nC is built from X and Y, yet it is still independent of each one separately: told only that X=1, the parity X⊕Y is equally likely 0 or 1, so P(C|A)=½=P(C). The three events are pairwise independent. Step 3 asks the harder question the triple condition poses.',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f8f8f8' });
        c2d.raw((ctx, cam) => {
          drawGrid(ctx, cam, -1.8, 0.2, 3.4, {});
          // Legend.
          const lx = 1.4, ly = 1.7;
          ctx.fillStyle = A_FILL; ctx.fillRect(cam.wx(lx), cam.wy(ly), 18, 18);
          label(ctx, cam.wx(lx) + 26, cam.wy(ly) + 14, 'A = {X = 1}   P=½', { color: '#333', size: 13, align: 'left' });
          ctx.fillStyle = B_FILL; ctx.fillRect(cam.wx(lx), cam.wy(ly - 0.55), 18, 18);
          label(ctx, cam.wx(lx) + 26, cam.wy(ly - 0.55) + 14, 'B = {Y = 1}   P=½', { color: '#333', size: 13, align: 'left' });
          ctx.strokeStyle = C_MARK; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(cam.wx(lx) + 9, cam.wy(ly - 1.10) + 9, 9, 0, Math.PI * 2); ctx.stroke();
          label(ctx, cam.wx(lx) + 26, cam.wy(ly - 1.10) + 14, 'C = {X⊕Y = 1}   P=½', { color: '#333', size: 13, align: 'left' });

          label(ctx, cam.wx(lx), cam.wy(ly - 1.9), 'every pair factorises:', { color: '#555', size: 13, align: 'left', bold: true });
          label(ctx, cam.wx(lx), cam.wy(ly - 2.4), 'P(A∩B) = ¼ = ½·½  ✓', { color: A_LINE, size: 13, align: 'left' });
          label(ctx, cam.wx(lx), cam.wy(ly - 2.85), 'P(A∩C) = ¼ = ½·½  ✓', { color: A_LINE, size: 13, align: 'left' });
          label(ctx, cam.wx(lx), cam.wy(ly - 3.3), 'P(B∩C) = ¼ = ½·½  ✓', { color: A_LINE, size: 13, align: 'left' });
        });
      },
    },

    // ── Step 3: The triple condition fails ──────────────────────────────────
    {
      title:       'Pairwise Holds, Yet the Triple Fails',
      description: 'Mutual independence also demands P(A∩B∩C) = P(A)P(B)P(C) = ⅛. But A∩B∩C asks for X=1, Y=1, and X⊕Y=1 at once — impossible, since X=Y=1 gives parity 0. The triple intersection is empty, so its probability is 0, not ⅛. Three pairwise-independent events are therefore NOT mutually independent.',
      equation:    'P(A\\cap B\\cap C)=0 \\;\\neq\\; \\tfrac18 = P(A)P(B)P(C)',
      notes:       'The deep reason: any two of these events determine the third. Knowing A (X=1) and B (Y=1) fixes the parity C=0 with certainty — no freedom left. So while each event is uninformative about either one of the others alone, the pair together pins it down. That is exactly the structure pairwise independence cannot see.\n\nTakeaways:\n  • Pairwise independence ⇏ mutual independence (this example).\n  • To get mutual independence you must verify the higher-order products too, not just the pairs.\n  • Real-world echo: in cryptography a parity/XOR bit can look independent of each input bit yet be fully determined by them jointly — security must consider joint, not just pairwise, structure.',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f8f8f8' });
        c2d.raw((ctx, cam) => {
          drawGrid(ctx, cam, -1.8, 0.2, 3.4, {});

          // Spotlight the (1,1) cell: it is in A and B but NOT in C.
          const h = 3.4 / 2, side = 3.4, cx = -1.8, cy = 0.2;
          const px = u => cam.wx(cx - h + u * side), py = v => cam.wy(cy - h + v * side);
          ctx.strokeStyle = C_MARK; ctx.lineWidth = 2.5; ctx.setLineDash([5, 4]);
          ctx.strokeRect(px(0.5), py(1), px(1) - px(0.5), py(0.5) - py(1));
          ctx.setLineDash([]);
          label(ctx, (px(0.5) + px(1)) / 2, py(0.5) - 8, 'A∩B here, but C is off', { color: C_MARK, size: 11, bold: true });

          const lx = 1.5, ly = 1.6;
          label(ctx, cam.wx(lx), cam.wy(ly), 'triple condition:', { color: '#555', size: 13, align: 'left', bold: true });
          label(ctx, cam.wx(lx), cam.wy(ly - 0.55), 'A∩B∩C needs', { color: '#333', size: 13, align: 'left' });
          label(ctx, cam.wx(lx), cam.wy(ly - 1.0), 'X=1, Y=1, X⊕Y=1', { color: '#333', size: 13, align: 'left' });
          label(ctx, cam.wx(lx), cam.wy(ly - 1.45), '→ impossible (∅)', { color: C_MARK, size: 13, align: 'left', bold: true });

          label(ctx, cam.wx(lx), cam.wy(ly - 2.25), 'P(A∩B∩C) = 0', { color: C_MARK, size: 15, align: 'left', bold: true });
          label(ctx, cam.wx(lx), cam.wy(ly - 2.8), 'P(A)P(B)P(C) = ⅛', { color: '#888', size: 14, align: 'left' });
          label(ctx, cam.wx(lx), cam.wy(ly - 3.35), '0 ≠ ⅛  ⇒  not mutually indep.', { color: C_MARK, size: 13, align: 'left', bold: true });
        });
      },
    },
  ],
};
