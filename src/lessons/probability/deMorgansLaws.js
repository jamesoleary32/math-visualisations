// De Morgan's Laws — Probability
// Visualises (A∪B)ᶜ = Aᶜ∩Bᶜ and (A∩B)ᶜ = Aᶜ∪Bᶜ using Venn diagrams.

// ── Colours ───────────────────────────────────────────────────────────────────

const BLUE = 'rgba(21,101,192,0.28)';
const RED  = 'rgba(198,40,40,0.22)';

// ── Geometry helper ───────────────────────────────────────────────────────────

// Returns pixel geometry for a Venn diagram centred at world (wxc, wyc)
// with scale sc (sc world-units → radius base).
function vennCoords(cam, wxc, wyc, sc = 1.0) {
  const px = cam.wx(wxc), py = cam.wy(wyc);
  const s   = cam.ws(sc);   // sc world-units in pixels
  const r   = s * 1.28;     // circle radius
  const cxA = px - s * 0.82;
  const cxB = px + s * 0.82;
  const cy  = py;
  const rx  = px - s * 2.35, ry = py - s * 1.8;
  const rw  = s * 4.7,       rh = s * 3.6;
  return { px, py, s, r, cxA, cxB, cy, rx, ry, rw, rh };
}

// ── Highlighter functions ──────────────────────────────────────────────────────

// A∪B: fill both circles with BLUE
function hlAunionB(ctx, v, _bg) {
  ctx.save();
  ctx.fillStyle = BLUE;
  ctx.beginPath(); ctx.arc(v.cxA, v.cy, v.r, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(v.cxB, v.cy, v.r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// (A∪B)ᶜ: fill rect RED, then erase both circles with bg colour
function hlAunionBc(ctx, v, bg) {
  ctx.save();
  ctx.fillStyle = RED;
  ctx.fillRect(v.rx, v.ry, v.rw, v.rh);
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(v.cxA, v.cy, v.r, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(v.cxB, v.cy, v.r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// A∩B: clip to circle A, fill circle B with BLUE
function hlAintersectB(ctx, v, _bg) {
  ctx.save();
  ctx.beginPath(); ctx.arc(v.cxA, v.cy, v.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = BLUE;
  ctx.beginPath(); ctx.arc(v.cxB, v.cy, v.r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// (A∩B)ᶜ: fill rect RED, then clip to circle A and erase the overlap with bg
function hlAintersectBc(ctx, v, bg) {
  ctx.save();
  ctx.fillStyle = RED;
  ctx.fillRect(v.rx, v.ry, v.rw, v.rh);
  ctx.beginPath(); ctx.arc(v.cxA, v.cy, v.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(v.cxB, v.cy, v.r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ── Core draw function ────────────────────────────────────────────────────────

// drawVenn(ctx, v, { title, hl, bg })
//   v   — geometry from vennCoords()
//   hl  — optional highlighter fn(ctx, v, bg)
//   bg  — background colour (default '#ffffff')
//   title — centred above the rect
function drawVenn(ctx, v, { title = null, hl = null, bg = '#ffffff' } = {}) {
  // Background
  ctx.fillStyle = bg;
  ctx.fillRect(v.rx, v.ry, v.rw, v.rh);

  // Highlight region
  if (hl) hl(ctx, v, bg);

  // Circle outlines
  ctx.strokeStyle = '#333';
  ctx.lineWidth   = 1.5;
  ctx.beginPath(); ctx.arc(v.cxA, v.cy, v.r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(v.cxB, v.cy, v.r, 0, Math.PI * 2); ctx.stroke();

  // Rect border
  ctx.strokeStyle = '#777';
  ctx.lineWidth   = 1;
  ctx.strokeRect(v.rx, v.ry, v.rw, v.rh);

  // Labels A and B (italic)
  ctx.fillStyle = '#222';
  ctx.font      = 'italic bold 15px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('A', v.cxA - v.r * 0.5, v.cy - v.r * 0.35);
  ctx.fillText('B', v.cxB + v.r * 0.5, v.cy - v.r * 0.35);

  // S label (small, gray) near rect top-left
  ctx.fillStyle = '#aaa';
  ctx.font      = '11px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('S', v.rx + 5, v.ry + 14);

  // Title centred above rect
  if (title) {
    ctx.fillStyle = '#333';
    ctx.font      = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, v.px, v.ry - 8);
  }

  ctx.textAlign = 'left'; // reset
}

// ── Controls helpers ──────────────────────────────────────────────────────────

function clearControls(state) {
  if (state._controls) state._controls.innerHTML = '';
}

// ── Lesson ────────────────────────────────────────────────────────────────────

export default {
  title:   "De Morgan's Laws",
  subject: 'Probability',

  initState: () => ({ _controls: null }),

  init(c2d, state, panelEl) {
    c2d.scale = 60;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [
    // ── Step 1: Sample Space and Events ──────────────────────────────────────
    {
      title:       'Sample Space and Events',
      description: 'The sample space S contains every possible outcome. Events A and B are subsets of S — sets of outcomes. Their overlap A∩B is the set of outcomes in both. The complement Aᶜ is everything in S that is not in A.',
      equation:    "A \\cup B = \\text{at least one} \\qquad A \\cap B = \\text{both} \\qquad A^c = \\text{not }A",
      notes:       'The four disjoint regions of the Venn diagram partition S:\n  • "only A"  — outcomes in A but not B\n  • "A ∩ B"  — outcomes in both\n  • "only B"  — outcomes in B but not A\n  • "neither" — outcomes in neither A nor B (i.e. (A∪B)ᶜ)',

      setup(c2d, state) { clearControls(state); },

      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        c2d.raw((ctx, cam) => {
          // One large Venn diagram centred at world (0, 0.3), scale 1.5
          const v = vennCoords(cam, 0, 0.3, 1.5);
          drawVenn(ctx, v, { bg: '#ffffff' });

          // Region labels
          ctx.fillStyle = '#555';
          ctx.font      = '12px system-ui, sans-serif';
          ctx.textAlign = 'center';

          // "only A" — left crescent
          ctx.fillText('only A', v.cxA - v.r * 0.55, v.cy + 5);
          // "A ∩ B" — centre overlap
          ctx.fillText('A ∩ B', v.px, v.cy + 5);
          // "only B" — right crescent
          ctx.fillText('only B', v.cxB + v.r * 0.55, v.cy + 5);
          // "neither" — corner (bottom-right of rect)
          ctx.fillText('neither', v.rx + v.rw - 34, v.ry + v.rh - 8);

          ctx.textAlign = 'left';
        });
      },
    },

    // ── Step 2: (A∪B)ᶜ = Aᶜ ∩ Bᶜ ───────────────────────────────────────────
    {
      title:       '(A ∪ B)ᶜ = Aᶜ ∩ Bᶜ',
      description: 'The complement of "at least one of A or B" is "neither A nor B". That is the same as being outside A (i.e. in Aᶜ) AND outside B (i.e. in Bᶜ). So (A∪B)ᶜ = Aᶜ ∩ Bᶜ.',
      equation:    "(A \\cup B)^c = A^c \\cap B^c",
      notes:       'Read the diagrams left-to-right:\n  Left  — A∪B is shaded blue: every outcome in at least one circle.\n  Right — (A∪B)ᶜ is shaded red: the "box corners" untouched by either circle.\n\nThe first De Morgan law says: failing to be in A∪B is the same as being absent from both A and B simultaneously.',

      setup(c2d, state) { clearControls(state); },

      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        c2d.raw((ctx, cam) => {
          const bg = '#ffffff';

          // Left diagram: A∪B highlighted blue, centred at world (-3.1, 0.3)
          const vL = vennCoords(cam, -3.1, 0.3, 1.0);
          drawVenn(ctx, vL, { title: 'A ∪ B', hl: hlAunionB, bg });

          // Right diagram: (A∪B)ᶜ highlighted red, centred at world (3.1, 0.3)
          const vR = vennCoords(cam, 3.1, 0.3, 1.0);
          drawVenn(ctx, vR, { title: '(A ∪ B)ᶜ', hl: hlAunionBc, bg });

          // "⟹" arrow between diagrams
          const midX = cam.wx(0);
          const midY = cam.wy(0.3);
          ctx.fillStyle   = '#444';
          ctx.font        = '22px Georgia, serif';
          ctx.textAlign   = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⟹', midX, midY);
          ctx.textBaseline = 'alphabetic';
          ctx.textAlign   = 'left';

          // Colour legend below the left diagram (world y ≈ -2.4 and -2.8)
          const lx = cam.wx(-3.1 - 1.5); // align with left rect edge

          // Blue swatch
          const blueY = cam.wy(-2.4);
          ctx.fillStyle = BLUE.replace('0.28', '0.7');
          ctx.fillRect(lx, blueY - 10, 14, 14);
          ctx.strokeStyle = '#1565c0';
          ctx.lineWidth   = 1;
          ctx.strokeRect(lx, blueY - 10, 14, 14);
          ctx.fillStyle = '#555';
          ctx.font      = '11px system-ui, sans-serif';
          ctx.fillText(' = the set', lx + 16, blueY + 2);

          // Red swatch
          const redY = cam.wy(-2.8);
          ctx.fillStyle = RED.replace('0.22', '0.65');
          ctx.fillRect(lx, redY - 10, 14, 14);
          ctx.strokeStyle = '#c62828';
          ctx.lineWidth   = 1;
          ctx.strokeRect(lx, redY - 10, 14, 14);
          ctx.fillStyle = '#555';
          ctx.font      = '11px system-ui, sans-serif';
          ctx.fillText(' = its complement', lx + 16, redY + 2);
        });
      },
    },

    // ── Step 3: (A∩B)ᶜ = Aᶜ ∪ Bᶜ ───────────────────────────────────────────
    {
      title:       '(A ∩ B)ᶜ = Aᶜ ∪ Bᶜ',
      description: 'The complement of "both A and B" is "not A, or not B (or neither)". That is the same as being outside A OR outside B — i.e. in Aᶜ or Bᶜ. So (A∩B)ᶜ = Aᶜ ∪ Bᶜ.',
      equation:    "(A \\cap B)^c = A^c \\cup B^c",
      notes:       'Read the diagrams left-to-right:\n  Left  — A∩B is shaded blue: only the central overlap.\n  Right — (A∩B)ᶜ is shaded red: everything EXCEPT the central overlap.\n\nThe second De Morgan law says: failing to be in both A and B simultaneously is the same as being absent from at least one of them.',

      setup(c2d, state) { clearControls(state); },

      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });

        c2d.raw((ctx, cam) => {
          const bg = '#ffffff';

          // Left diagram: A∩B highlighted blue
          const vL = vennCoords(cam, -3.1, 0.3, 1.0);
          drawVenn(ctx, vL, { title: 'A ∩ B', hl: hlAintersectB, bg });

          // Right diagram: (A∩B)ᶜ highlighted red
          const vR = vennCoords(cam, 3.1, 0.3, 1.0);
          drawVenn(ctx, vR, { title: '(A ∩ B)ᶜ', hl: hlAintersectBc, bg });

          // "⟹" between diagrams
          const midX = cam.wx(0);
          const midY = cam.wy(0.3);
          ctx.fillStyle    = '#444';
          ctx.font         = '22px Georgia, serif';
          ctx.textAlign    = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⟹', midX, midY);
          ctx.textBaseline = 'alphabetic';
          ctx.textAlign    = 'left';

          // Colour legend (same position as step 2)
          const lx = cam.wx(-3.1 - 1.5);

          const blueY = cam.wy(-2.4);
          ctx.fillStyle = BLUE.replace('0.28', '0.7');
          ctx.fillRect(lx, blueY - 10, 14, 14);
          ctx.strokeStyle = '#1565c0';
          ctx.lineWidth   = 1;
          ctx.strokeRect(lx, blueY - 10, 14, 14);
          ctx.fillStyle = '#555';
          ctx.font      = '11px system-ui, sans-serif';
          ctx.fillText(' = the set', lx + 16, blueY + 2);

          const redY = cam.wy(-2.8);
          ctx.fillStyle = RED.replace('0.22', '0.65');
          ctx.fillRect(lx, redY - 10, 14, 14);
          ctx.strokeStyle = '#c62828';
          ctx.lineWidth   = 1;
          ctx.strokeRect(lx, redY - 10, 14, 14);
          ctx.fillStyle = '#555';
          ctx.font      = '11px system-ui, sans-serif';
          ctx.fillText(' = its complement', lx + 16, redY + 2);
        });
      },
    },
  ],
};
