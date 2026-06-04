// Independence of Events — Probability
//
// Builds on the Conditional Probability lesson. Three ideas, in order:
//   1. Definition       — P(A∩B) = P(A)P(B) ⇔ learning B leaves P(A) unchanged.
//   2. Independent ≠ disjoint — mutually exclusive events are (almost) never
//                          independent; in fact they are maximally dependent.
//   3. Conditional independence — independence can appear or vanish once we
//                          condition on a third event C.

// ── Colours ─────────────────────────────────────────────────────────────────
const A_BAND  = 'rgba(21,101,192,0.16)';  // the A column
const B_BAND  = 'rgba(230,126,34,0.20)';  // the B row
const OVERLAP = 'rgba(123,80,150,0.40)';  // A ∩ B (blue × orange)
const A_BLUE  = '#1565c0';
const B_ORANGE = '#d35400';

// ── Geometry helpers (a unit square mapped into world space) ─────────────────
function unitSquare(cam, cx, cy, side) {
  const h = side / 2;
  return {
    px: u => cam.wx(cx - h + u * side),
    py: v => cam.wy(cy - h + v * side),
  };
}
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

// ── The independence diagram ──────────────────────────────────────────────────
// A is the left vertical band of width pA; B is the bottom horizontal band of
// height pB. Independence is the visual fact that the two dividing lines are
// perfectly straight: B claims the SAME fraction pB of the A-column as of the
// Aᶜ-column, so the corner A∩B has area pA·pB exactly.
function indepSquare(ctx, sq, pA, pB, { areas = true, title = null } = {}) {
  uRect(ctx, sq, 0, 0, pA, 1, { fill: A_BAND });   // A column
  uRect(ctx, sq, 0, 0, 1, pB, { fill: B_BAND });   // B row
  uRect(ctx, sq, 0, 0, pA, pB, { fill: OVERLAP }); // A ∩ B corner

  // Straight dividers — the signature of independence.
  ctx.strokeStyle = A_BLUE;  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sq.px(pA), sq.py(0)); ctx.lineTo(sq.px(pA), sq.py(1)); ctx.stroke();
  ctx.strokeStyle = B_ORANGE; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sq.px(0), sq.py(pB)); ctx.lineTo(sq.px(1), sq.py(pB)); ctx.stroke();

  uRect(ctx, sq, 0, 0, 1, 1, { stroke: '#555', width: 1.5 });

  // Edge labels.
  label(ctx, (sq.px(0) + sq.px(pA)) / 2, sq.py(0) + 20, `P(A)=${pA}`,        { color: A_BLUE, size: 12, bold: true });
  label(ctx, (sq.px(pA) + sq.px(1)) / 2, sq.py(0) + 20, `${(1 - pA).toFixed(2)}`, { color: '#999', size: 11 });
  ctx.save();
  ctx.translate(sq.px(0) - 14, (sq.py(0) + sq.py(pB)) / 2);
  ctx.rotate(-Math.PI / 2);
  label(ctx, 0, 0, `P(B)=${pB}`, { color: B_ORANGE, size: 12, bold: true });
  ctx.restore();

  if (areas) {
    label(ctx, (sq.px(0) + sq.px(pA)) / 2, (sq.py(0) + sq.py(pB)) / 2 + 4,
      `${(pA * pB).toFixed(2)}`, { color: '#fff', size: 13, bold: true });
  }
  if (title) label(ctx, (sq.px(0) + sq.px(1)) / 2, sq.py(1) - 10, title, { bold: true, size: 14 });
  label(ctx, sq.px(0) + 6, sq.py(1) + 14, 'S', { color: '#aaa', size: 11, align: 'left' });
}

// ── A circle Venn pair for the disjoint-vs-independent contrast ────────────────
function venn2(cam, cx, cy, sc, { overlap = true } = {}) {
  const s  = cam.ws(sc);
  const yc = cam.wy(cy);
  const dx = overlap ? s * 0.55 : s * 0.95;   // closer when overlapping
  return { yc, cxA: cam.wx(cx) - dx, cxB: cam.wx(cx) + dx, rA: s * 0.62, rB: s * 0.52, px: cam.wx(cx) };
}
function drawVenn2(ctx, v, { overlap = true } = {}) {
  // overlap lens (clip A, paint B) only when the circles meet
  if (overlap) {
    ctx.save();
    ctx.beginPath(); ctx.arc(v.cxA, v.yc, v.rA, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = OVERLAP;
    ctx.beginPath(); ctx.arc(v.cxB, v.yc, v.rB, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = A_BAND;
  ctx.beginPath(); ctx.arc(v.cxA, v.yc, v.rA, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = B_BAND;
  ctx.beginPath(); ctx.arc(v.cxB, v.yc, v.rB, 0, Math.PI * 2); ctx.fill();
  if (overlap) {  // repaint lens on top of the solid circles
    ctx.save();
    ctx.beginPath(); ctx.arc(v.cxA, v.yc, v.rA, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = OVERLAP;
    ctx.beginPath(); ctx.arc(v.cxB, v.yc, v.rB, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(v.cxA, v.yc, v.rA, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(v.cxB, v.yc, v.rB, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#222'; ctx.font = 'italic bold 15px Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText('A', v.cxA - v.rA * 0.5, v.yc - v.rA * 0.55);
  ctx.fillText('B', v.cxB + v.rB * 0.5, v.yc - v.rB * 0.55);
}

// ── Conditional-independence numbers (the common-cause "flu" example) ────────
// C = flu. A = fever, B = cough. Given flu-status, A and B are INDEPENDENT,
// but pooled over the population they are correlated (the flu drives both).
const P_C   = 0.30;
const A_gC  = 0.80, B_gC  = 0.70;   // P(A|C),  P(B|C)
const A_gCc = 0.10, B_gCc = 0.20;   // P(A|Cᶜ), P(B|Cᶜ)
const P_A   = P_C * A_gC + (1 - P_C) * A_gCc;                       // 0.31
const P_B   = P_C * B_gC + (1 - P_C) * B_gCc;                       // 0.35
const P_AB  = P_C * (A_gC * B_gC) + (1 - P_C) * (A_gCc * B_gCc);    // 0.182
const P_AxB = P_A * P_B;                                            // 0.1085

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Independence of Events',
  subject: 'Probability',

  init(c2d) { c2d.scale = 60; },

  steps: [
    // ── Step 1: The definition ──────────────────────────────────────────────
    {
      title:       'What Independence Means',
      description: 'A and B are independent when learning that one happened tells you nothing about the other: P(A|B) = P(A). Multiply both sides of the conditional definition by P(B) and this becomes the symmetric product rule P(A∩B) = P(A)P(B). In the picture, A is the blue column of width P(A) and B is the orange band of height P(B). Independence is the fact that both dividing lines run perfectly straight across.',
      equation:    'P(A \\cap B) = P(A)\\,P(B) \\quad\\Longleftrightarrow\\quad P(A \\mid B) = P(A)',
      notes:       'Why "straight lines" = independence:\n  • B fills the bottom 40% of the A-column AND the bottom 40% of the Aᶜ-column — its share is the same whether or not A occurred. That is precisely P(B|A) = P(B|Aᶜ) = P(B).\n  • The corner A∩B is then a clean rectangle of area P(A)·P(B) = 0.5 × 0.4 = 0.20.\n\nIf the orange line had a step in it (B claiming more of A than of Aᶜ), knowing A would shift P(B) — that is dependence. Independence is the absence of any such step.',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f6f6f6' });
        c2d.raw((ctx, cam) => {
          const sq = unitSquare(cam, 0, 0.1, 3.8);
          indepSquare(ctx, sq, 0.5, 0.4);
          label(ctx, cam.wx(0), sq.py(0) - 30, '0.20  =  0.5 × 0.4   →   P(A∩B) = P(A)P(B)',
            { color: '#7b5096', size: 14, bold: true });
        });
      },
    },

    // ── Step 2: Independent ≠ disjoint ───────────────────────────────────────
    {
      title:       'Independent is NOT the Same as Disjoint',
      description: 'These two words are the most-confused pair in probability — and they are nearly opposites. Disjoint (mutually exclusive) means A and B cannot both happen: their circles do not touch, so P(A∩B) = 0. Independent means A∩B has area exactly P(A)P(B). If P(A) and P(B) are both positive, those demands clash: 0 ≠ P(A)P(B). So disjoint events with positive probability are always DEPENDENT.',
      equation:    'A,B\\ \\text{disjoint}:\\ P(A\\cap B)=0 \\;\\neq\\; P(A)P(B) \\quad(\\text{when } P(A),P(B)>0)',
      notes:       'Disjoint events are in fact maximally dependent: the moment B occurs, A is impossible, so P(A|B) = 0 — about as far from P(A) as you can get. Knowing one tells you everything about the other.\n\n  • Left  — disjoint circles: no overlap, P(A∩B)=0. Highly dependent.\n  • Right — independent: the circles MUST overlap, and the overlap is sized to P(A)P(B).\n\nRule of thumb: "disjoint" is about whether events can co-occur (a set-overlap fact); "independent" is about whether one shifts the odds of the other (a probability fact). Independent events overlap; they just overlap by exactly the right amount.',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f6f6f6' });
        c2d.raw((ctx, cam) => {
          // Left: disjoint
          const vL = venn2(cam, -3.2, 0.5, 1.5, { overlap: false });
          drawVenn2(ctx, vL, { overlap: false });
          label(ctx, vL.px, vL.yc - cam.ws(1.5) * 0.62 - 18, 'disjoint', { bold: true, size: 14, color: '#c62828' });
          label(ctx, vL.px, cam.wy(-1.9), 'P(A∩B) = 0', { color: '#c62828', size: 13, bold: true });
          label(ctx, vL.px, cam.wy(-2.5), 'but P(A)P(B) > 0  ⇒  dependent', { color: '#888', size: 12 });

          // Right: independent
          const vR = venn2(cam, 3.2, 0.5, 1.5, { overlap: true });
          drawVenn2(ctx, vR, { overlap: true });
          label(ctx, vR.px, vR.yc - cam.ws(1.5) * 0.62 - 18, 'independent', { bold: true, size: 14, color: '#1565c0' });
          label(ctx, vR.px, cam.wy(-1.9), 'P(A∩B) = P(A)P(B)', { color: '#1565c0', size: 13, bold: true });
          label(ctx, vR.px, cam.wy(-2.5), 'overlap sized to the product', { color: '#888', size: 12 });

          // vs divider
          ctx.fillStyle = '#aaa'; ctx.font = 'bold 22px Georgia, serif'; ctx.textAlign = 'center';
          ctx.fillText('vs', cam.wx(0), cam.wy(0.5));
        });
      },
    },

    // ── Step 3: Conditional independence ────────────────────────────────────
    {
      title:       'Conditional Independence',
      description: 'Independence can hold inside one "world" yet fail in the world as a whole. A and B are conditionally independent given C when, once C is fixed, the product rule holds: P(A∩B|C) = P(A|C)P(B|C). Example: C = having the flu, A = fever, B = cough. Among people with a known flu-status the two symptoms are independent (straight lines in each square). But pooled over everyone they are correlated, because the flu drives both.',
      equation:    'P(A \\cap B \\mid C) = P(A \\mid C)\\,P(B \\mid C)',
      notes:       'Each square is its own independence diagram with straight dividers — so A ⫫ B holds given C and given Cᶜ. Yet marginally:\n  • P(A) = 0.31,  P(B) = 0.35,  so P(A)P(B) = 0.1085\n  • P(A∩B) = 0.30·(0.8·0.7) + 0.70·(0.1·0.2) = 0.182\n  • 0.182 ≠ 0.1085  →  A and B are NOT independent overall.\n\nConditional independence and ordinary (marginal) independence are different properties; neither implies the other. The flu is a common cause: it makes fever and cough move together, so seeing a fever raises the chance of a cough — until you already know the flu status, after which the symptoms decouple. This is the engine behind naïve-Bayes classifiers and graphical models.',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f6f6f6' });
        c2d.raw((ctx, cam) => {
          const sqL = unitSquare(cam, -2.5, 0.7, 2.7);
          indepSquare(ctx, sqL, A_gC, B_gC, { areas: false, title: 'given C  (flu)' });
          const sqR = unitSquare(cam, 2.5, 0.7, 2.7);
          indepSquare(ctx, sqR, A_gCc, B_gCc, { areas: false, title: 'given Cᶜ  (no flu)' });

          label(ctx, cam.wx(-2.5), sqL.py(0) - 18, 'A ⫫ B  here', { color: '#1565c0', size: 12, bold: true });
          label(ctx, cam.wx(2.5),  sqR.py(0) - 18, 'A ⫫ B  here', { color: '#1565c0', size: 12, bold: true });

          // Marginal verdict.
          label(ctx, cam.wx(0), cam.wy(-2.2), '…but pooled over everyone:', { color: '#555', size: 13 });
          label(ctx, cam.wx(0), cam.wy(-2.8),
            `P(A∩B)=${P_AB.toFixed(3)}   ≠   P(A)P(B)=${P_AxB.toFixed(3)}`,
            { color: '#c62828', size: 14, bold: true });
          label(ctx, cam.wx(0), cam.wy(-3.4), 'conditionally independent, marginally dependent',
            { color: '#888', size: 12 });
        });
      },
    },
  ],
};
