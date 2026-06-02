// Conditional Probability — Probability
// Introduces P(A|B) = P(A∩B)/P(B) as "restricting the sample space to B", then
// shows visually and numerically why P(A|B) ≠ P(B|A) in general.

// ── A concrete sample space (100 equally-likely outcomes) ───────────────────────
// We use fixed counts so every probability on screen is exact and checkable.
const N        = 100;
const N_ONLY_A = 30;  // in A, not B
const N_AB     = 10;  // in both A and B
const N_ONLY_B = 5;   // in B, not A
const N_NEITHER = N - N_ONLY_A - N_AB - N_ONLY_B; // 55

const P_A   = (N_ONLY_A + N_AB) / N; // 0.40
const P_B   = (N_ONLY_B + N_AB) / N; // 0.15
const P_AB  = N_AB / N;              // 0.10
const P_AgB = P_AB / P_B;            // 0.6667  — P(A | B)
const P_BgA = P_AB / P_A;            // 0.2500  — P(B | A)

// ── Colours ─────────────────────────────────────────────────────────────────
const DENOM  = 'rgba(21,101,192,0.16)'; // the event we condition on (denominator)
const NUMER  = 'rgba(21,101,192,0.48)'; // the favourable overlap A∩B (numerator)
const DIM    = 'rgba(0,0,0,0.05)';      // outcomes ruled out by conditioning

// ── Venn geometry ───────────────────────────────────────────────────────────
// A is deliberately the LARGER circle (more outcomes) than B, so the asymmetry
// between conditioning on A vs B is visible, not just numerical.
function venn(cam, wxc, wyc, sc = 1.0) {
  const s   = cam.ws(sc);
  const cy  = cam.wy(wyc);
  const cxA = cam.wx(wxc) - s * 0.55;
  const cxB = cam.wx(wxc) + s * 0.80;
  const rA  = s * 1.38;
  const rB  = s * 0.92;
  // Bounding rect (the sample space S) with padding around the circles.
  const left  = cxA - rA - s * 0.30;
  const right = cxB + rB + s * 0.30;
  const top   = cy - rA - s * 0.30;
  const bot   = cy + rA + s * 0.30;
  return { cy, cxA, cxB, rA, rB, px: cam.wx(wxc),
           rx: left, ry: top, rw: right - left, rh: bot - top };
}

// ── Fill helpers ──────────────────────────────────────────────────────────────
function fillCircle(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
}

// Fill the lens A∩B by clipping to A and painting B.
function fillOverlap(ctx, v, color) {
  ctx.save();
  ctx.beginPath(); ctx.arc(v.cxA, v.cy, v.rA, 0, Math.PI * 2); ctx.clip();
  fillCircle(ctx, v.cxB, v.cy, v.rB, color);
  ctx.restore();
}

// ── Highlighters ────────────────────────────────────────────────────────────
// Condition on B: B is the new universe (denominator), A∩B is favourable (numerator).
function hlGivenB(ctx, v) {
  fillCircle(ctx, v.cxB, v.cy, v.rB, DENOM);
  fillOverlap(ctx, v, NUMER);
}
// Condition on A: A is the new universe (denominator), A∩B is favourable (numerator).
function hlGivenA(ctx, v) {
  fillCircle(ctx, v.cxA, v.cy, v.rA, DENOM);
  fillOverlap(ctx, v, NUMER);
}

// ── Core draw ─────────────────────────────────────────────────────────────────
// drawVenn(ctx, v, { title, hl, dimOutside, counts, bg })
//   hl         — highlighter(ctx, v)
//   dimOutside — when set, grey-out the part of S NOT in the conditioning circle
//   counts     — show region counts (30 / 10 / 5 / 55)
function drawVenn(ctx, v, { title = null, hl = null, dimOutside = null,
                            counts = false, bg = '#ffffff' } = {}) {
  // Sample-space rectangle.
  ctx.fillStyle = bg;
  ctx.fillRect(v.rx, v.ry, v.rw, v.rh);

  // Dim everything outside the conditioning event (the ruled-out outcomes).
  if (dimOutside) {
    ctx.save();
    ctx.fillStyle = DIM;
    ctx.fillRect(v.rx, v.ry, v.rw, v.rh);
    // erase the conditioning circle back to bg, then re-apply the highlight on top
    ctx.fillStyle = bg;
    if (dimOutside === 'B') fillCircle(ctx, v.cxB, v.cy, v.rB, bg);
    else                    fillCircle(ctx, v.cxA, v.cy, v.rA, bg);
    ctx.restore();
  }

  if (hl) hl(ctx, v);

  // Circle outlines.
  ctx.strokeStyle = '#333';
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.arc(v.cxA, v.cy, v.rA, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(v.cxB, v.cy, v.rB, 0, Math.PI * 2); ctx.stroke();

  // Rect border.
  ctx.strokeStyle = '#777';
  ctx.lineWidth   = 1;
  ctx.strokeRect(v.rx, v.ry, v.rw, v.rh);

  // A / B labels (italic).
  ctx.fillStyle = '#222';
  ctx.font      = 'italic bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('A', v.cxA - v.rA * 0.55, v.cy - v.rA * 0.55);
  ctx.fillText('B', v.cxB + v.rB * 0.55, v.cy - v.rB * 0.55);

  // S label.
  ctx.fillStyle = '#aaa';
  ctx.font      = '11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('S', v.rx + 5, v.ry + 14);

  // Region counts.
  if (counts) {
    ctx.fillStyle = '#444';
    ctx.font      = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(N_ONLY_A), v.cxA - v.rA * 0.45, v.cy + 5);          // only A
    ctx.fillText(String(N_AB),     (v.cxA + v.cxB) / 2 + v.rB * 0.35, v.cy + 5); // A∩B
    ctx.fillText(String(N_ONLY_B), v.cxB + v.rB * 0.55, v.cy + 5);          // only B
    ctx.fillStyle = '#999';
    ctx.fillText(String(N_NEITHER) + ' outside', v.rx + v.rw - 52, v.ry + v.rh - 8);
  }

  // Title above the rect.
  if (title) {
    ctx.fillStyle = '#333';
    ctx.font      = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, v.px, v.ry - 8);
  }

  ctx.textAlign = 'left';
}

// Horizontal proportion bar: a value in [0,1] drawn as a filled fraction.
function drawBar(ctx, x, y, w, h, frac, label, color) {
  ctx.fillStyle = '#eee';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * frac, h);
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#333';
  ctx.font      = '13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 8);
  ctx.fillText((frac * 100).toFixed(0) + '%', x + w + 10, y + h * 0.72);
}

// ── Lesson ────────────────────────────────────────────────────────────────────
export default {
  title:   'Conditional Probability',
  subject: 'Probability',

  init(c2d) { c2d.scale = 60; },

  steps: [
    // ── Step 1: Conditioning shrinks the sample space ───────────────────────
    {
      title:       'Conditioning Shrinks the World',
      description: 'P(A | B) reads "the probability of A given B". The bar | means we already KNOW that B has happened. Once B is certain, every outcome outside B is impossible — so B becomes our new, smaller sample space. The only question left is: of the outcomes still in play (those in B), what share are also in A?',
      equation:    'P(A \\mid B) = \\text{within } B,\\ \\text{how much is also } A?',
      notes:       'Greyed-out region = outcomes ruled out the moment we learn B occurred.\n  • Light blue  — B, the new universe we have zoomed into.\n  • Dark blue   — A ∩ B, the part of that universe that is also A.\n\nConditioning is a change of perspective: we are no longer measuring against all of S, only against B.',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f6f6f6' });
        c2d.raw((ctx, cam) => {
          const v = venn(cam, 0, 0.2, 1.5);
          drawVenn(ctx, v, { hl: hlGivenB, dimOutside: 'B' });
          // annotate the lens
          ctx.fillStyle = '#0d47a1';
          ctx.font      = '12px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('A ∩ B', (v.cxA + v.cxB) / 2 + v.rB * 0.35, v.cy + 5);
        });
      },
    },

    // ── Step 2: The definition ──────────────────────────────────────────────
    {
      title:       'The Definition',
      description: 'Make "what share of B is also A" precise: take the size of the overlap A∩B and divide by the size of B. In probabilities, P(A | B) = P(A∩B) / P(B). With the counts shown, B holds 5 + 10 = 15 outcomes, of which 10 are also in A, so P(A | B) = 10/15 ≈ 0.67.',
      equation:    'P(A \\mid B) = \\dfrac{P(A \\cap B)}{P(B)} = \\dfrac{10/100}{15/100} = \\dfrac{10}{15} \\approx 0.67',
      notes:       'Dividing by P(B) is what re-normalises the shrunken world: it rescales B so its own probability becomes 1 (certain), because we already know B happened.\n\nThe formula is only defined when P(B) > 0 — you cannot condition on something that never occurs.',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f6f6f6' });
        c2d.raw((ctx, cam) => {
          const v = venn(cam, 0, 0.2, 1.5);
          drawVenn(ctx, v, { hl: hlGivenB, dimOutside: 'B', counts: true });
        });
      },
    },

    // ── Step 3: Why P(A|B) ≠ P(B|A) ─────────────────────────────────────────
    {
      title:       'Why P(A | B) ≠ P(B | A)',
      description: 'Swapping A and B swaps the denominator, not the numerator. Both conditionals share the SAME overlap P(A∩B) on top, but P(A|B) divides it by P(B) while P(B|A) divides it by P(A). Different denominators ⇒ different answers. Left conditions on B (small circle); right conditions on A (large circle).',
      equation:    'P(A\\mid B)=\\dfrac{P(A\\cap B)}{P(B)}=\\dfrac{10}{15}\\approx0.67 \\quad\\neq\\quad P(B\\mid A)=\\dfrac{P(A\\cap B)}{P(A)}=\\dfrac{10}{40}=0.25',
      notes:       'Same blue lens (numerator) in both pictures — only the light-blue "universe" differs.\n  Left  — universe is B (15 outcomes): the lens fills two-thirds of it.\n  Right — universe is A (40 outcomes): the same lens fills only a quarter.\n\nThey are equal only in the special case P(A) = P(B). Confusing the two is the base-rate fallacy: P(positive test | disease) is high, yet P(disease | positive test) can be low when the disease is rare (P(disease) ≪ P(positive)).',

      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f6f6f6' });
        c2d.raw((ctx, cam) => {
          const vL = venn(cam, -3.3, 0.6, 0.92);
          drawVenn(ctx, vL, { title: 'given B  →  divide by B', hl: hlGivenB, dimOutside: 'B' });

          const vR = venn(cam, 3.3, 0.6, 0.92);
          drawVenn(ctx, vR, { title: 'given A  →  divide by A', hl: hlGivenA, dimOutside: 'A' });

          // "≠" between the two diagrams
          ctx.fillStyle    = '#c62828';
          ctx.font         = 'bold 26px Georgia, serif';
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('≠', cam.wx(0), cam.wy(0.6));
          ctx.textBaseline = 'alphabetic';

          // Comparison bars below.
          const bx = cam.wx(-3.6);
          const bw = cam.ws(7.2);
          drawBar(ctx, bx, cam.wy(-2.1), bw, 22, P_AgB, 'P(A | B) = 10 / 15', NUMER);
          drawBar(ctx, bx, cam.wy(-3.0), bw, 22, P_BgA, 'P(B | A) = 10 / 40', 'rgba(198,40,40,0.5)');
        });
      },
    },
  ],
};
