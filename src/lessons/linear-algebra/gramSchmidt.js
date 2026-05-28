// Gram-Schmidt Orthogonalisation — Linear Algebra
//
// Given linearly independent vectors v₁, v₂, …, Gram-Schmidt produces an
// orthonormal basis e₁, e₂, … for the same subspace.
//
// u₁ = v₁,  e₁ = u₁/‖u₁‖
// u₂ = v₂ − ⟨v₂, e₁⟩e₁,  e₂ = u₂/‖u₂‖
// The subtraction strips each previously-found direction so ⟨uₖ, eⱼ⟩ = 0 ∀ j < k.

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `gs-${Math.random().toString(36).slice(2)}`;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:3px;';
  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;font-family:system-ui">
      <span>${label}</span><span id="${id}-v" style="font-family:Georgia,serif;font-style:italic">${fmt(value)}</span>
    </div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"
           style="width:100%;accent-color:#1565c0">
  `;
  container.appendChild(wrap);
  const inp = wrap.querySelector('input');
  const vel = wrap.querySelector(`[id="${id}-v"]`);
  inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    vel.textContent = fmt(v);
    onChange(v);
  });
}

// ── Vector helpers ─────────────────────────────────────────────────────────────
function dot(a, b)   { return a[0]*b[0] + a[1]*b[1]; }
function norm(v)     { return Math.sqrt(dot(v, v)); }
function scl(v, s)   { return [v[0]*s, v[1]*s]; }
function sub(a, b)   { return [a[0]-b[0], a[1]-b[1]]; }
function unit(v)     { const n = norm(v); return n < 1e-10 ? [0, 0] : [v[0]/n, v[1]/n]; }
function proj(v, u)  { const nn = dot(u, u); return nn < 1e-10 ? [0,0] : scl(u, dot(v, u)/nn); }

function rightAngleMark(c2d, corner, dir1, dir2, size = 0.19) {
  const d1 = unit(dir1), d2 = unit(dir2);
  c2d.addLine([
    [corner[0] + d1[0]*size,              corner[1] + d1[1]*size             ],
    [corner[0] + d1[0]*size + d2[0]*size, corner[1] + d1[1]*size + d2[1]*size],
    [corner[0] + d2[0]*size,              corner[1] + d2[1]*size             ],
  ], { color: '#999', width: 1 });
}

// ── Gram-Schmidt for two fixed inputs (v1 always fixed, v2 from angle) ────────
function gs2(v1, v2) {
  const e1 = unit(v1);
  const u2 = sub(v2, scl(e1, dot(v2, e1)));
  const u2n = norm(u2);
  const e2 = unit(u2);
  return { e1, e2, u2, u2n };
}

// ── Shared fixed v₁ used in steps 4-7 ─────────────────────────────────────────
const V1 = [2.5, 0.8];

export default {
  title:   'Gram-Schmidt Orthogonalisation',
  subject: 'Linear Algebra',

  initState: () => ({
    v2Angle: 110,
    _controls: null,
  }),

  init(c2d, state, panelEl) {
    c2d.scale = 55;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [

    // ── Step 1: Orthogonal vectors ─────────────────────────────────────────────
    {
      title: 'Orthogonal Vectors',
      description: 'Two vectors are orthogonal when their dot product is zero. They meet at a right angle and carry no information about each other — each points in a direction that is completely invisible to the other.',
      equation: '\\mathbf{u} \\perp \\mathbf{v} \\iff \\langle \\mathbf{u},\\,\\mathbf{v}\\rangle = 0',
      notes: 'Here u = (3, 1) and v = (−1, 3):\n⟨u, v⟩ = 3·(−1) + 1·3 = 0  ✓\n\nNote that v is obtained by rotating u by 90°: for any vector (a, b) the perpendicular is (−b, a). This is a special property of ℝ² — in higher dimensions, orthogonality is defined purely by the inner product, not by visible angles.',
      setup(c2d, state) {
        clearControls(state);
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const u = [3, 1], v = [-1, 3];
        const un = unit(u), vn = unit(v);
        const ms = 0.22;

        c2d.addArrow(0, 0, u[0], u[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('u = (3, 1)', u[0] + 0.15, u[1] + 0.22, { color: '#1565c0', size: 13 });

        c2d.addArrow(0, 0, v[0], v[1], { color: '#c62828', width: 2.5 });
        c2d.addText('v = (−1, 3)', v[0] - 1.9, v[1] + 0.22, { color: '#c62828', size: 13 });

        c2d.addLine([
          [un[0]*ms,           un[1]*ms          ],
          [un[0]*ms + vn[0]*ms, un[1]*ms + vn[1]*ms],
          [vn[0]*ms,           vn[1]*ms          ],
        ], { color: '#888', width: 1.2 });

        c2d.addText('⟨u, v⟩ = 3·(−1) + 1·3 = 0  ✓', -5.5, -3.5, { color: '#2e7d32', size: 12 });
        c2d.addText('u ⊥ v', -5.5, -4.1, { color: '#2e7d32', size: 13 });
      },
    },

    // ── Step 2: Orthonormal basis ──────────────────────────────────────────────
    {
      title: 'Orthonormal Basis',
      description: 'An orthonormal set is mutually orthogonal AND every vector has unit length. The standard basis {e₁, e₂} is orthonormal, but infinitely many rotated frames are too. The Gram-Schmidt goal is to build one from any independent set.',
      equation: '\\langle \\mathbf{e}_i,\\,\\mathbf{e}_j \\rangle = \\delta_{ij} = \\begin{cases} 1 & i=j \\\\ 0 & i\\ne j \\end{cases}',
      notes: 'δᵢⱼ is the Kronecker delta — it packages both conditions (unit length and mutual orthogonality) into one formula.\n\nThe payoff: in an orthonormal basis, coordinates are free — the coefficient of eᵢ in any expansion is simply ⟨v, eᵢ⟩, one inner product per component, no matrix inversion.',
      setup(c2d, state) {
        clearControls(state);
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // standard basis (grey)
        c2d.addArrow(0, 0, 1, 0, { color: '#ccc', width: 2 });
        c2d.addText('e₁', 1.1, 0.15, { color: '#bbb', size: 13, italic: true });
        c2d.addArrow(0, 0, 0, 1, { color: '#ccc', width: 2 });
        c2d.addText('e₂', 0.1, 1.18, { color: '#bbb', size: 13, italic: true });

        // rotated orthonormal frame at 35°
        const th = 35 * Math.PI / 180;
        const f1 = [Math.cos(th), Math.sin(th)];
        const f2 = [-Math.sin(th), Math.cos(th)];
        const r  = 2.5;

        c2d.addArrow(0, 0, f1[0]*r, f1[1]*r, { color: '#1565c0', width: 2.5 });
        c2d.addText('f₁', f1[0]*r + 0.15, f1[1]*r + 0.15, { color: '#1565c0', size: 13, italic: true });
        c2d.addArrow(0, 0, f2[0]*r, f2[1]*r, { color: '#c62828', width: 2.5 });
        c2d.addText('f₂', f2[0]*r - 0.55, f2[1]*r + 0.1, { color: '#c62828', size: 13, italic: true });

        const ms = 0.22;
        c2d.addLine([
          [f1[0]*ms,           f1[1]*ms          ],
          [f1[0]*ms + f2[0]*ms, f1[1]*ms + f2[1]*ms],
          [f2[0]*ms,           f2[1]*ms          ],
        ], { color: '#1565c080', width: 1 });

        c2d.addText('‖f₁‖ = ‖f₂‖ = 1', -5.5, 4.2, { color: '#555', size: 12 });
        c2d.addText('⟨f₁, f₂⟩ = 0  — any rotation angle works', -5.5, 3.7, { color: '#555', size: 12 });
      },
    },

    // ── Step 3: Projection — the key tool ─────────────────────────────────────
    {
      title: 'Projection — the Key Tool',
      description: 'The projection of v onto u extracts the component of v in the u direction. Subtracting it leaves only the part of v that is perpendicular to u. This subtract-the-projection trick is the entire mechanism of Gram-Schmidt.',
      equation: '\\operatorname{proj}_{\\mathbf{u}}\\mathbf{v} = \\frac{\\langle\\mathbf{v},\\,\\mathbf{u}\\rangle}{\\langle\\mathbf{u},\\,\\mathbf{u}\\rangle}\\,\\mathbf{u} \\qquad \\mathbf{v} - \\operatorname{proj}_{\\mathbf{u}}\\mathbf{v}\\;\\perp\\;\\mathbf{u}',
      notes: 'Why does the remainder equal zero against u?\n⟨v − proj_u(v), u⟩\n= ⟨v, u⟩ − (⟨v,u⟩/‖u‖²)·‖u‖²\n= 0  ✓\n\nThis algebraic identity holds in any inner product space — the same projection formula works for polynomials, matrices, or functions.',
      setup(c2d, state) {
        clearControls(state);
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const u = [3, 1], v = [1.5, 2.8];
        const p = proj(v, u);
        const r = sub(v, p);
        const un = unit(u);
        const rn = unit(r);

        // faint u-direction line
        c2d.addLine([scl(un, -5.5), scl(un, 5.5)], { color: '#1565c015', width: 1.5, dash: [6, 4] });

        // u
        c2d.addArrow(0, 0, u[0], u[1], { color: '#1565c0', width: 2.5 });
        c2d.addText('u', u[0] + 0.15, u[1] + 0.22, { color: '#1565c0', size: 14, italic: true });

        // v
        c2d.addArrow(0, 0, v[0], v[1], { color: '#555', width: 2.5 });
        c2d.addText('v', v[0] + 0.15, v[1] + 0.22, { color: '#555', size: 14, italic: true });

        // projection (orange)
        c2d.addArrow(0, 0, p[0], p[1], { color: '#e65100', width: 2.5 });
        c2d.addText('proj', p[0] + 0.1, p[1] - 0.38, { color: '#e65100', size: 12 });

        // perpendicular remainder (green, from projection tip to v)
        c2d.addArrow(p[0], p[1], v[0], v[1], { color: '#2e7d32', width: 2.5 });
        c2d.addText('v − proj  ⊥  u', v[0] + 0.15, (v[1] + p[1]) / 2, { color: '#2e7d32', size: 12 });

        // right-angle marker at foot of perpendicular
        const ms = 0.18;
        c2d.addLine([
          [p[0] + un[0]*ms,          p[1] + un[1]*ms         ],
          [p[0] + un[0]*ms + rn[0]*ms, p[1] + un[1]*ms + rn[1]*ms],
          [p[0] + rn[0]*ms,          p[1] + rn[1]*ms         ],
        ], { color: '#999', width: 1 });

        const ipv = dot(v, u).toFixed(2);
        const uuv = dot(u, u).toFixed(2);
        c2d.addText(`⟨v, u⟩ = ${ipv},  ‖u‖² = ${uuv}`, -5.5, -3.5, { color: '#555', size: 12 });
        c2d.addText(`proj = (${ipv}/${uuv})·u = (${p[0].toFixed(2)}, ${p[1].toFixed(2)})`, -5.5, -4.1, { color: '#e65100', size: 12 });
      },
    },

    // ── Step 4: Gram-Schmidt — the algorithm (interactive) ────────────────────
    {
      title: 'Gram-Schmidt — Step by Step',
      description: 'Given independent vectors v₁ and v₂, the algorithm produces an orthonormal basis {e₁, e₂} for the same span. Step 1 takes e₁ = v₁/‖v₁‖. Step 2 strips the e₁ component from v₂ and normalises. Drag the slider to try different v₂ directions.',
      equation: `\\begin{aligned}
        \\mathbf{e}_1 &= \\tfrac{\\mathbf{v}_1}{\\|\\mathbf{v}_1\\|}\\\\[4pt]
        \\mathbf{u}_2 &= \\mathbf{v}_2 - \\langle\\mathbf{v}_2,\\mathbf{e}_1\\rangle\\,\\mathbf{e}_1,
        \\quad \\mathbf{e}_2 = \\tfrac{\\mathbf{u}_2}{\\|\\mathbf{u}_2\\|}
      \\end{aligned}`,
      notes: 'The dashed vectors are the original inputs. Orange shows proj_{e₁}(v₂) — the component being stripped. After stripping, the green arrow shows what remains (u₂), pointing perpendicular to e₁. Normalising gives e₂ (red). The small square marks the 90° angle between e₁ and e₂.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'angle of v₂ (degrees)', 10, 170, 1, state.v2Angle,
          v => `${v}°`, v => state.v2Angle = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const v1 = V1;
        const ang = state.v2Angle * Math.PI / 180;
        const v2 = [Math.cos(ang) * 2.5, Math.sin(ang) * 2.5];
        const { e1, e2, u2, u2n } = gs2(v1, v2);

        // faint e₁ direction line
        c2d.addLine([scl(e1, -5.5), scl(e1, 5.5)], { color: '#1565c015', width: 1.5, dash: [6, 4] });

        // original inputs (grey dashed)
        c2d.addArrow(0, 0, v1[0], v1[1], { color: '#aaa', width: 2, dash: [4, 3] });
        c2d.addText('v₁', v1[0] + 0.15, v1[1] + 0.22, { color: '#aaa', size: 13, italic: true });
        c2d.addArrow(0, 0, v2[0], v2[1], { color: '#aaa', width: 2, dash: [4, 3] });
        c2d.addText('v₂', v2[0] + 0.15, v2[1] + 0.22, { color: '#aaa', size: 13, italic: true });

        // e₁ (blue)
        c2d.addArrow(0, 0, e1[0]*2.5, e1[1]*2.5, { color: '#1565c0', width: 3 });
        c2d.addText('e₁', e1[0]*2.5 + 0.15, e1[1]*2.5 + 0.22, { color: '#1565c0', size: 14, italic: true });

        // projection of v₂ onto e₁ (orange)
        const pv2 = scl(e1, dot(v2, e1));
        c2d.addArrow(0, 0, pv2[0], pv2[1], { color: '#e65100', width: 2 });
        c2d.addText('proj', pv2[0] + 0.1, pv2[1] - 0.38, { color: '#e65100', size: 11 });

        if (u2n > 0.05) {
          // u₂ remainder arrow (green, from projection tip to v₂)
          c2d.addArrow(pv2[0], pv2[1], v2[0], v2[1], { color: '#2e7d3280', width: 2, dash: [4, 3] });

          // e₂ (red) from origin
          c2d.addArrow(0, 0, e2[0]*2.5, e2[1]*2.5, { color: '#c62828', width: 3 });
          c2d.addText('e₂', e2[0]*2.5 - 0.45, e2[1]*2.5 + 0.22, { color: '#c62828', size: 14, italic: true });

          // right-angle marker between e₁ and e₂
          const ms = 0.22;
          c2d.addLine([
            [e1[0]*ms,            e1[1]*ms           ],
            [e1[0]*ms + e2[0]*ms,  e1[1]*ms + e2[1]*ms],
            [e2[0]*ms,            e2[1]*ms           ],
          ], { color: '#888', width: 1.2 });
        }

        const ipCheck = Math.abs(dot(e1, e2));
        c2d.addText(`⟨e₁, e₂⟩ = ${ipCheck.toFixed(5)}  (target: 0)`, -5.5, -3.5,
          { color: ipCheck < 0.001 ? '#2e7d32' : '#c62828', size: 12 });
        c2d.addText(`‖e₁‖ = ${norm(e1).toFixed(3)},  ‖e₂‖ = ${(u2n > 0.05 ? norm(e2) : 0).toFixed(3)}  (target: 1)`,
          -5.5, -4.1, { color: '#555', size: 12 });
      },
    },

    // ── Step 5: Why it always works ────────────────────────────────────────────
    {
      title: 'Why it Always Works',
      description: 'The subtraction u₂ = v₂ − ⟨v₂, e₁⟩e₁ forces ⟨u₂, e₁⟩ = 0 as an algebraic identity. The key ingredient is ⟨e₁, e₁⟩ = 1 — exactly because e₁ was normalised. Without unit length, the cancellation would be incomplete.',
      equation: `\\langle\\mathbf{u}_2,\\,\\mathbf{e}_1\\rangle
        = \\langle\\mathbf{v}_2,\\mathbf{e}_1\\rangle
        - \\langle\\mathbf{v}_2,\\mathbf{e}_1\\rangle
          \\underbrace{\\langle\\mathbf{e}_1,\\mathbf{e}_1\\rangle}_{=\\,1}
        = 0`,
      notes: 'The canvas decomposes v₂ into its e₁ component (orange) and its e₂ component (green). The subtraction removes the orange part entirely. Whatever length v₂ has in the e₁ direction — ⟨v₂, e₁⟩ — that exact amount is subtracted.\n\nThe same argument extends: at step k, subtract projections onto e₁, …, eₖ₋₁. Each previous basis vector is already a unit vector, so each cancellation is exact.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'angle of v₂ (degrees)', 10, 170, 1, state.v2Angle,
          v => `${v}°`, v => state.v2Angle = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const v1 = V1;
        const ang = state.v2Angle * Math.PI / 180;
        const v2 = [Math.cos(ang) * 2.5, Math.sin(ang) * 2.5];
        const { e1, e2, u2n } = gs2(v1, v2);

        const coeff = dot(v2, e1);    // ⟨v₂, e₁⟩
        const pv2   = scl(e1, coeff); // projection component
        const rem   = sub(v2, pv2);   // e₂ component of v₂

        // e₁ direction line (faint)
        c2d.addLine([scl(e1, -5.5), scl(e1, 5.5)], { color: '#1565c015', width: 1.5, dash: [6, 4] });

        // v₂ input (grey)
        c2d.addArrow(0, 0, v2[0], v2[1], { color: '#aaa', width: 2, dash: [4, 3] });
        c2d.addText('v₂', v2[0] + 0.15, v2[1] + 0.22, { color: '#aaa', size: 13, italic: true });

        // e₁ component (orange) — the part being stripped
        c2d.addArrow(0, 0, pv2[0], pv2[1], { color: '#e65100', width: 3 });
        c2d.addText(`⟨v₂,e₁⟩·e₁`, pv2[0] + 0.1, pv2[1] - 0.4, { color: '#e65100', size: 11 });

        if (u2n > 0.05) {
          // e₂ component (green) — what survives the subtraction
          c2d.addArrow(pv2[0], pv2[1], v2[0], v2[1], { color: '#2e7d32', width: 3 });
          c2d.addText('u₂ ⊥ e₁', v2[0] + 0.15, (v2[1] + pv2[1]) / 2, { color: '#2e7d32', size: 12 });

          // e₁ and e₂ (normalised, full vectors)
          c2d.addArrow(0, 0, e1[0]*2.5, e1[1]*2.5, { color: '#1565c0', width: 3 });
          c2d.addText('e₁', e1[0]*2.5 + 0.15, e1[1]*2.5 + 0.22, { color: '#1565c0', size: 14, italic: true });
          c2d.addArrow(0, 0, e2[0]*2.5, e2[1]*2.5, { color: '#c62828', width: 3 });
          c2d.addText('e₂', e2[0]*2.5 - 0.45, e2[1]*2.5 + 0.22, { color: '#c62828', size: 14, italic: true });

          const ms = 0.22;
          c2d.addLine([
            [e1[0]*ms,            e1[1]*ms           ],
            [e1[0]*ms + e2[0]*ms,  e1[1]*ms + e2[1]*ms],
            [e2[0]*ms,            e2[1]*ms           ],
          ], { color: '#888', width: 1.2 });
        }

        c2d.addText(`⟨v₂, e₁⟩ = ${coeff.toFixed(3)}  — this exact amount is stripped`, -5.5, -3.5,
          { color: '#e65100', size: 12 });
        c2d.addText(`⟨u₂, e₁⟩ = ${Math.abs(dot(sub(v2, pv2), e1)).toFixed(5)}  (= 0 ✓)`, -5.5, -4.1,
          { color: '#2e7d32', size: 12 });
      },
    },

    // ── Step 6: Extending to three vectors ────────────────────────────────────
    {
      title: 'Extending to Three Vectors',
      description: 'At each new step, subtract the projections onto all previously computed orthonormal vectors. The result is orthogonal to every preceding direction by the same identity. After normalising, the set grows by one orthonormal vector.',
      equation: `\\mathbf{u}_k = \\mathbf{v}_k - \\sum_{j=1}^{k-1}\\langle\\mathbf{v}_k,\\,\\mathbf{e}_j\\rangle\\,\\mathbf{e}_j
        \\qquad \\mathbf{e}_k = \\frac{\\mathbf{u}_k}{\\|\\mathbf{u}_k\\|}`,
      notes: 'In ℝ², two independent vectors already span the whole plane. A third vector v₃ = (1, 2.8) produces u₃ ≈ 0 after stripping e₁ and e₂ — nothing new to contribute. This is the algorithm\'s built-in check: ‖uₖ‖ = 0 signals that vₖ was a linear combination of the previous inputs and can be discarded.\n\nIn ℝ³, three independent vectors produce a full orthonormal frame: {e₁, e₂, e₃} replace the standard basis.',
      setup(c2d, state) {
        clearControls(state);
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        // Use fixed vectors for a clean illustration
        const v1 = [2.5, 0.8];
        const v2 = [Math.cos(110 * Math.PI / 180) * 2.5, Math.sin(110 * Math.PI / 180) * 2.5];
        const v3 = [1.0, 2.8];

        const { e1, e2 } = gs2(v1, v2);

        // Gram-Schmidt step 3
        const u3 = sub(sub(v3, scl(e1, dot(v3, e1))), scl(e2, dot(v3, e2)));
        const u3n = norm(u3);

        // orthonormal output vectors
        c2d.addArrow(0, 0, e1[0]*2.5, e1[1]*2.5, { color: '#1565c0', width: 3 });
        c2d.addText('e₁', e1[0]*2.5 + 0.15, e1[1]*2.5 + 0.22, { color: '#1565c0', size: 14, italic: true });

        c2d.addArrow(0, 0, e2[0]*2.5, e2[1]*2.5, { color: '#c62828', width: 3 });
        c2d.addText('e₂', e2[0]*2.5 - 0.45, e2[1]*2.5 + 0.22, { color: '#c62828', size: 14, italic: true });

        const ms = 0.22;
        c2d.addLine([
          [e1[0]*ms,            e1[1]*ms           ],
          [e1[0]*ms + e2[0]*ms,  e1[1]*ms + e2[1]*ms],
          [e2[0]*ms,            e2[1]*ms           ],
        ], { color: '#888', width: 1.2 });

        // v₃ input (grey dashed)
        c2d.addArrow(0, 0, v3[0], v3[1], { color: '#aaa', width: 2, dash: [4, 3] });
        c2d.addText('v₃ = (1, 2.8)', v3[0] + 0.15, v3[1] + 0.22, { color: '#aaa', size: 12, italic: true });

        if (u3n > 0.05) {
          const e3 = unit(u3);
          c2d.addArrow(0, 0, e3[0]*2.5, e3[1]*2.5, { color: '#6a1b9a', width: 3 });
          c2d.addText('e₃', e3[0]*2.5 + 0.15, e3[1]*2.5 + 0.22, { color: '#6a1b9a', size: 14, italic: true });
          c2d.addText(`‖u₃‖ = ${u3n.toFixed(4)} — new direction found`, -5.5, -3.5, { color: '#6a1b9a', size: 12 });
        } else {
          c2d.addText(`‖u₃‖ ≈ ${u3n.toExponential(2)} ≈ 0  — v₃ already in span(e₁, e₂)`, -5.5, -3.5, { color: '#c62828', size: 12 });
          c2d.addText('Two vectors span all of ℝ²; v₃ adds nothing new', -5.5, -4.1, { color: '#888', size: 12 });
        }
      },
    },

    // ── Step 7: QR decomposition ───────────────────────────────────────────────
    {
      title: 'The QR Decomposition',
      description: 'Gram-Schmidt is equivalent to factoring A = QR. Q has the orthonormal vectors as columns, R is upper triangular with the projection coefficients. This is one of the most important decompositions in numerical linear algebra.',
      equation: `A = \\begin{pmatrix}\\mathbf{v}_1&\\mathbf{v}_2\\end{pmatrix}
        = \\underbrace{\\begin{pmatrix}\\mathbf{e}_1&\\mathbf{e}_2\\end{pmatrix}}_{Q}
          \\underbrace{\\begin{pmatrix}\\|\\mathbf{v}_1\\| & \\langle\\mathbf{v}_2,\\mathbf{e}_1\\rangle \\\\ 0 & \\|\\mathbf{u}_2\\|\\end{pmatrix}}_{R}`,
      notes: 'R is upper triangular because e₁ was built from v₁ alone, so ⟨v₁, e₂⟩ = 0 — the lower-left entry vanishes by construction. The diagonal entries ‖v₁‖ and ‖u₂‖ are the normalisation factors used in the algorithm.\n\nApplications: QR is the basis of the QR eigenvalue algorithm, Householder reflections for stable least-squares, and the Gram-Schmidt step in iterative Krylov solvers.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'angle of v₂ (degrees)', 10, 170, 1, state.v2Angle,
          v => `${v}°`, v => state.v2Angle = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f0f0f0' });
        c2d.addAxes({ color: '#d0d0d0' });

        const v1  = V1;
        const ang = state.v2Angle * Math.PI / 180;
        const v2  = [Math.cos(ang) * 2.5, Math.sin(ang) * 2.5];
        const { e1, e2, u2n } = gs2(v1, v2);

        // R entries
        const r11 = norm(v1);
        const r12 = dot(v2, e1);
        const r22 = u2n;

        // original inputs (grey)
        c2d.addArrow(0, 0, v1[0], v1[1], { color: '#aaa', width: 2, dash: [4, 3] });
        c2d.addText('v₁', v1[0] + 0.15, v1[1] + 0.22, { color: '#aaa', size: 13, italic: true });
        c2d.addArrow(0, 0, v2[0], v2[1], { color: '#aaa', width: 2, dash: [4, 3] });
        c2d.addText('v₂', v2[0] + 0.15, v2[1] + 0.22, { color: '#aaa', size: 13, italic: true });

        // orthonormal output
        c2d.addArrow(0, 0, e1[0]*2.5, e1[1]*2.5, { color: '#1565c0', width: 3 });
        c2d.addText('e₁', e1[0]*2.5 + 0.15, e1[1]*2.5 + 0.22, { color: '#1565c0', size: 14, italic: true });
        c2d.addArrow(0, 0, e2[0]*2.5, e2[1]*2.5, { color: '#c62828', width: 3 });
        c2d.addText('e₂', e2[0]*2.5 - 0.45, e2[1]*2.5 + 0.22, { color: '#c62828', size: 14, italic: true });

        const ms = 0.22;
        c2d.addLine([
          [e1[0]*ms,            e1[1]*ms           ],
          [e1[0]*ms + e2[0]*ms,  e1[1]*ms + e2[1]*ms],
          [e2[0]*ms,            e2[1]*ms           ],
        ], { color: '#888', width: 1.2 });

        c2d.addText('R entries (upper triangular):', -5.5, 4.2, { color: '#555', size: 12 });
        c2d.addText(`r₁₁ = ‖v₁‖ = ${r11.toFixed(3)}`, -5.5, 3.7, { color: '#555', size: 12 });
        c2d.addText(`r₁₂ = ⟨v₂, e₁⟩ = ${r12.toFixed(3)}`, -5.5, 3.2, { color: '#555', size: 12 });
        c2d.addText(`r₂₂ = ‖u₂‖ = ${r22.toFixed(3)}`, -5.5, 2.7, { color: '#555', size: 12 });
        c2d.addText('r₂₁ = 0  (by construction)', -5.5, 2.2, { color: '#2e7d32', size: 12 });
      },
    },

  ],
};
