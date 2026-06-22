// Eigenspaces as Subspaces — Linear Algebra
//
// Companion to eigenvectors.js. That lesson finds the special directions Av = λv.
// This one zooms out: for a fixed eigenvalue λ, ALL vectors with Av = λv (plus 0)
// form a subspace — the eigenspace E_λ. The key identity is
//
//   Av = λv  ⇔  (A − λI)v = 0  ⇒  E_λ = Null(A − λI)
//
// Being a null space, E_λ is automatically a subspace (contains 0, closed under
// + and scaling). Its dimension is the GEOMETRIC multiplicity of λ.
//
// Worked matrices:
//   A = [[3,1],[0,2]]  — two distinct λ, each eigenspace a line  (dim 1, dim 1)
//   B = 2I = [[2,0],[0,2]] — λ=2 repeated, E₂ = whole plane      (geom = alg = 2)
//   C = [[2,1],[0,2]]  — shear, λ=2 repeated but E₂ a line       (geom 1 < alg 2 → defective)

// ── Helpers ─────────────────────────────────────────────────────────────────────

function tx(M, x, y) {
  return [M[0]*x + M[1]*y, M[2]*x + M[3]*y];
}

const RED = '#c62828', GREEN = '#2e7d32', BLUE = '#1565c0', GREY = '#888', INK = '#444';

// Draws the full line through the origin in direction d (extended to the edges).
function eigenline(c2d, d, color, opts = {}) {
  const n = Math.hypot(d[0], d[1]);
  const u = [d[0]/n, d[1]/n];
  c2d.showLine([[-9*u[0], -9*u[1]], [9*u[0], 9*u[1]]],
    { color, width: opts.width ?? 2, dash: opts.dash ?? [7, 5] });
}

function addSlider(container, label, min, max, step, value, fmt, onChange) {
  const id = `es-${Math.random().toString(36).slice(2)}`;
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

function clearControls(state) { if (state._controls) state._controls.innerHTML = ''; }

// Translucent fill of the whole visible plane (for E_λ = ℝ²).
function fillPlane(c2d, color) {
  c2d.showRaw((ctx, c) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, c.width, c.height);
  });
}

// ── Lesson ──────────────────────────────────────────────────────────────────────

export default {
  title:   'Eigenspaces',
  subject: 'Linear Algebra',

  initState: () => ({ c: 1.6, t: 0, _controls: null }),

  init(c2d, state, panelEl) {
    c2d.scale = 52;
    const nav = panelEl.querySelector('#nav');
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;gap:10px;border-top:1px solid #eee;padding-top:16px;';
    panelEl.insertBefore(div, nav);
    state._controls = div;
  },

  steps: [

    // ── Step 1: An eigenline is a whole set of vectors ────────────────────────
    {
      title: 'One Eigenvalue, Many Eigenvectors',
      description: 'The eigenvector lesson found single directions where $A\\mathbf v=\\lambda\\mathbf v$. But if $\\mathbf v$ works, so does every scalar multiple $c\\mathbf v$: $A(c\\mathbf v)=cA\\mathbf v=c\\lambda\\mathbf v=\\lambda(c\\mathbf v)$. So a single eigenvalue owns an entire line of eigenvectors. Drag the slider — every red arrow is an eigenvector for $\\lambda_1=3$.',
      equation: 'A=\\begin{pmatrix}3&1\\\\0&2\\end{pmatrix},\\qquad A(c\\mathbf v)=\\lambda(c\\mathbf v)',
      notes: 'For $A=[[3,1],[0,2]]$ the direction $(1,0)$ has $\\lambda_1=3$. Scaling it never breaks the equation, so the whole $x$-axis is eigenvectors for $\\lambda=3$. Collecting them all (and the zero vector) is what the next steps turn into a subspace.',
      setup(c2d, state) {
        clearControls(state);
        addSlider(state._controls, 'scalar  c', -2.5, 2.5, 0.1, state.c,
          v => `c = ${v.toFixed(1)}`, v => state.c = v);
      },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f2f2f2' });
        c2d.addAxes({ color: '#d0d0d0' });

        const A = [3, 1, 0, 2];
        eigenline(c2d, [1, 0], RED + '55');

        // a few fixed sample multiples, faint
        [-2, -1, 0.5, 2].forEach(k => {
          c2d.showArrow(0, 0, k, 0, { color: RED + '40', width: 1.5 });
        });

        // the live, slider-controlled eigenvector and its image
        const c = state.c;
        const [ix, iy] = tx(A, c, 0); // = (3c, 0)
        c2d.showArrow(0, 0, c, 0, { color: RED, width: 2.5 });
        c2d.showText('c v', c + 0.12 * Math.sign(c || 1), 0.32, { color: RED, size: 13, italic: true });
        c2d.showArrow(0, 0, ix, iy, { color: BLUE, width: 2.5 });
        c2d.showText('A(c v) = 3·(c v)', ix + 0.15, -0.35, { color: BLUE, size: 12 });

        c2d.showText('every point on this line is an eigenvector for λ = 3', -6.2, 4.2, { color: INK, size: 13 });
      },
    },

    // ── Step 2: Eigenspace = Null(A − λI), so it is a subspace ─────────────────
    {
      title: 'The Eigenspace Is a Subspace',
      description: 'Rearrange $A\\mathbf v=\\lambda\\mathbf v$ into $(A-\\lambda I)\\mathbf v=\\mathbf 0$. So the eigenvectors of $\\lambda$ are exactly the null space of $A-\\lambda I$ — and every null space is a subspace. It contains $\\mathbf 0$, and is closed under addition and scaling: add two $\\lambda$-eigenvectors and the sum is still a $\\lambda$-eigenvector.',
      equation: 'E_\\lambda=\\{\\mathbf v: A\\mathbf v=\\lambda\\mathbf v\\}=\\operatorname{Null}(A-\\lambda I)',
      notes: 'Closure check: if $A\\mathbf u=\\lambda\\mathbf u$ and $A\\mathbf w=\\lambda\\mathbf w$ then $A(\\mathbf u+\\mathbf w)=\\lambda(\\mathbf u+\\mathbf w)$, so $\\mathbf u+\\mathbf w\\in E_\\lambda$ too. Both vectors below sit on the eigenline, and so does their sum — the line is closed, which is exactly what makes $E_\\lambda$ a subspace rather than just a set of arrows.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f2f2f2' });
        c2d.addAxes({ color: '#d0d0d0' });

        eigenline(c2d, [1, 0], RED + '55');

        // two eigenvectors u, w on the line and their sum (still on the line)
        const u = 1.4, w = 2.3;
        c2d.showArrow(0, 0, u, 0, { color: RED, width: 2.5 });
        c2d.showText('u', u, 0.32, { color: RED, size: 13, italic: true });
        c2d.showArrow(0, 0, w, 0, { color: GREEN, width: 2.5 });
        c2d.showText('w', w, -0.38, { color: GREEN, size: 13, italic: true });
        c2d.showArrow(0, 0, u + w, 0, { color: BLUE, width: 2.5 });
        c2d.showText('u + w  ∈ E₃', u + w + 0.15, 0.34, { color: BLUE, size: 12, italic: true });

        c2d.showText('(A − λI) v = 0  ⇒  E_λ = Null(A − λI)', -6.2, 4.3, { color: INK, size: 13 });
        c2d.showText('contains 0  ·  closed under +  ·  closed under scaling', -6.2, 3.7, { color: GREY, size: 12 });
      },
    },

    // ── Step 3: Geometric multiplicity = dim E_λ ──────────────────────────────
    {
      title: 'Dimension = Geometric Multiplicity',
      description: 'Because $E_\\lambda$ is a subspace it has a dimension, and that number has a name: the geometric multiplicity of $\\lambda$ — how many independent eigenvectors $\\lambda$ supplies. For $A=[[3,1],[0,2]]$ the two distinct eigenvalues give two different eigen-lines, each one-dimensional. Independent, they span the whole plane — an eigenbasis.',
      equation: '\\dim E_\\lambda = \\text{geometric multiplicity of }\\lambda',
      notes: 'Here $E_3=\\operatorname{span}\\{(1,0)\\}$ and $E_2=\\operatorname{span}\\{(1,1)\\}$, each of dimension 1. Distinct eigenvalues always give independent eigenvectors, so two 1-D eigenspaces combine into a 2-D eigenbasis and $A$ is diagonalisable. The remaining question — answered next — is what happens when an eigenvalue repeats.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f2f2f2' });
        c2d.addAxes({ color: '#d0d0d0' });

        eigenline(c2d, [1, 0], RED + '55');
        eigenline(c2d, [1, 1], GREEN + '55');

        c2d.showArrow(0, 0, 1.8, 0, { color: RED, width: 2.5 });
        c2d.showText('E₃ = span{(1,0)}   dim 1', 2.0, 0.36, { color: RED, size: 12 });
        c2d.showArrow(0, 0, 1.5, 1.5, { color: GREEN, width: 2.5 });
        c2d.showText('E₂ = span{(1,1)}   dim 1', 1.6, 1.85, { color: GREEN, size: 12 });

        c2d.showText('two independent eigen-lines  →  eigenbasis of ℝ²', -6.2, -3.6, { color: INK, size: 13 });
        c2d.showText('dim E₃ + dim E₂ = 1 + 1 = 2  ⇒  diagonalisable', -6.2, -4.2, { color: GREY, size: 12 });
      },
    },

    // ── Step 4: Repeated eigenvalue filling the plane ─────────────────────────
    {
      title: 'A Repeated Eigenvalue Can Fill the Plane',
      description: 'Take $B=2I$. Its characteristic polynomial is $(2-\\lambda)^2$, so $\\lambda=2$ has algebraic multiplicity 2 (a double root). And $B-2I$ is the zero matrix, whose null space is *everything*: $E_2=\\mathbb R^2$. Every nonzero vector is an eigenvector — the eigenspace is the whole plane, dimension 2.',
      equation: 'B=\\begin{pmatrix}2&0\\\\0&2\\end{pmatrix},\\quad B-2I=0,\\quad E_2=\\operatorname{Null}(0)=\\mathbb R^2',
      notes: 'Geometric multiplicity $\\dim E_2 = 2$ equals the algebraic multiplicity $2$. When they match for every eigenvalue, the matrix is diagonalisable — here trivially, since $B$ is already diagonal. Pure scaling treats all directions identically, so there is no preferred eigen-line: the entire plane is shaded because all of it is $E_2$.',
      setup(c2d, state) { clearControls(state); },
      update(c2d, state) {
        c2d.clearPersistent();
        fillPlane(c2d, BLUE + '12');
        c2d.addGrid({ spacing: 1, color: '#eaeaea' });
        c2d.addAxes({ color: '#cccccc' });

        const B = [2, 0, 0, 2];
        // arrows in many directions, each scaled by 2 along its own line
        for (let a = 0; a < 360; a += 45) {
          const r = a * Math.PI / 180;
          const vx = Math.cos(r), vy = Math.sin(r);
          const [ix, iy] = tx(B, vx, vy);
          c2d.showArrow(0, 0, ix * 1.4, iy * 1.4, { color: BLUE, width: 2 });
        }

        c2d.showText('E₂ = entire plane  (dim 2)', -6.2, 4.2, { color: BLUE, size: 14 });
        c2d.showText('geometric mult = algebraic mult = 2  ⇒  diagonalisable', -6.2, -4.2, { color: GREY, size: 12 });
      },
    },

    // ── Step 5: Defective — eigenspace too small ──────────────────────────────
    {
      title: 'Defective: When the Eigenspace Is Too Small',
      description: 'The shear $C=[[2,1],[0,2]]$ has the *same* characteristic polynomial $(2-\\lambda)^2$ — algebraic multiplicity 2 again. But now $C-2I=[[0,1],[0,0]]$, whose null space is only the $x$-axis. So $\\dim E_2=1 < 2$: there is just one independent eigendirection. Geometric multiplicity falls short of algebraic — the matrix is defective and cannot be diagonalised.',
      equation: 'C-2I=\\begin{pmatrix}0&1\\\\0&0\\end{pmatrix},\\quad \\dim E_2 = 1 < 2 = \\text{alg.\\,mult}',
      notes: 'Always $1\\le \\text{geometric}\\le \\text{algebraic}$. When equality fails there are too few eigenvectors to build a basis, so no $P$ diagonalises $C$ (you fall back to Jordan form). The grey vector off the $x$-axis gets sheared — knocked off its own line — proving it is not an eigenvector; only the red $x$-axis survives as $E_2$.',
      setup(c2d, state) { clearControls(state); state.t = 0; },
      update(c2d, state, dt) {
        state.t += dt;
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f2f2f2' });
        c2d.addAxes({ color: '#d0d0d0' });

        const C = [2, 1, 0, 2];
        eigenline(c2d, [1, 0], RED + '55');

        // the lone eigendirection
        c2d.showArrow(0, 0, 2, 0, { color: RED, width: 2.5 });
        c2d.showText('E₂ = span{(1,0)}   dim 1', 2.1, 0.36, { color: RED, size: 12 });

        // a non-eigenvector being knocked off its line by the shear
        const v = [1.6, 1.8];
        const [ix, iy] = tx(C, v[0], v[1]);
        c2d.showArrow(0, 0, v[0], v[1], { color: GREY, width: 2 });
        c2d.showText('v', v[0] - 0.35, v[1], { color: GREY, size: 13, italic: true });
        c2d.showArrow(0, 0, ix, iy, { color: BLUE, width: 2.5, dash: [5, 4] });
        c2d.showText('Cv  (off its line)', ix + 0.15, iy, { color: BLUE, size: 12 });

        c2d.showText('only one independent eigenvector  ⇒  not diagonalisable (defective)', -6.2, -4.2, { color: INK, size: 12 });
      },
    },

  ],
};
