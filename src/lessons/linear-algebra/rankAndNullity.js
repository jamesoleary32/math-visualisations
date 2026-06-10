// Rank & Nullity — Computing Them for a Given Transformation — Linear Algebra
//
// Companion to kernelAndRange.js: that lesson is geometric (range, kernel, fibers).
// This one is procedural — given a transformation, how do you actually FIND its
// rank and nullity? The recipe is always the same:
//
//   1. Write T as a matrix A (m×n: n = dim domain, m = dim codomain).
//   2. Row-reduce A to row echelon / RREF.
//   3. rank(T)    = number of pivots (= number of nonzero rows).
//   4. nullity(T) = number of free (pivot-free) columns = n − rank.
//   5. Rank–nullity falls out for free:  rank + nullity = n = dim(domain).
//
// Worked examples in the steps:
//   A  3×3, rank 2, nullity 1   (one dependent column)
//   B  2×4 wide, rank 2, nullity 2   (fat matrix ⇒ guaranteed kernel)
//   C  3×2 tall, rank 2, nullity 0   (full column rank ⇒ injective)
//   D  differentiation on P₃ — a transformation given without a number matrix

// ── Matrix drawing helper ─────────────────────────────────────────────────────
// Draws M centred on (cx,cy). Entries may be strings. Returns its left/right x.
function mat(c2d, M, cx, cy, o = {}) {
  const cw    = o.cw   ?? 0.66;      // column spacing (world units)
  const rh    = o.rh   ?? 0.6;       // row spacing
  const size  = o.size ?? 15;
  const color = o.color ?? '#333';
  const rows = M.length, cols = M[0].length;
  const w = (cols - 1) * cw, h = (rows - 1) * rh;
  const x0 = cx - w / 2;             // centre of left column
  const y0 = cy + h / 2;            // centre of top row

  // shaded columns: o.shade = [{ cols:[...], color:'rgba(...)' }]
  for (const s of (o.shade ?? [])) {
    for (const j of s.cols) {
      const colCx = x0 + j * cw;
      c2d.showRaw((ctx, c) => {
        ctx.fillStyle = s.color;
        ctx.fillRect(
          c.wx(colCx - cw / 2), c.wy(y0 + rh / 2 + 0.14),
          c.ws(cw),             c.ws(h + rh + 0.28));
      });
    }
  }

  // entries (vertically centred on each row line)
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < cols; j++)
      c2d.showText(String(M[i][j]), x0 + j * cw, (y0 - i * rh) - (size * 0.34) / c2d.scale,
        { color, size, align: 'center' });

  // brackets
  const left = x0 - cw * 0.6, right = x0 + w + cw * 0.6;
  const top = y0 + rh * 0.62, bot = y0 - h - rh * 0.62, t = 0.15;
  c2d.showLine([[left + t, top], [left, top], [left, bot], [left + t, bot]], { color, width: 1.4 });
  c2d.showLine([[right - t, top], [right, top], [right, bot], [right - t, bot]], { color, width: 1.4 });
  return { left, right, cx, cy };
}

// "A =" style label to the left of a matrix
function label(c2d, text, x, y, o = {}) {
  c2d.showText(text, x, y - 0.12, { size: o.size ?? 16, color: o.color ?? '#333', align: 'right', italic: true });
}

// A reduce-arrow with a caption above it
function reduceArrow(c2d, x0, x1, y, caption) {
  c2d.showArrow(x0, y, x1, y, { color: '#888', width: 2 });
  c2d.showText(caption, (x0 + x1) / 2, y + 0.34, { size: 11, color: '#888', align: 'center' });
}

// pulsing fills for pivot (red) and free (blue) columns
function fills(t) {
  const p = 0.12 + 0.07 * (0.5 + 0.5 * Math.sin(t * 2.2));
  return {
    pivot: `rgba(198,40,40,${p.toFixed(3)})`,
    free:  `rgba(21,101,192,${(p * 0.85).toFixed(3)})`,
  };
}

const RED = '#c62828', BLUE = '#1565c0', GREY = '#888', GREEN = '#2e7d32', INK = '#444';

// ── Lesson ─────────────────────────────────────────────────────────────────────

export default {
  title:   'Rank & Nullity',
  subject: 'Linear Algebra',

  initState: () => ({ t: 0 }),

  init(c2d) { c2d.scale = 46; },

  steps: [

    // ── Step 1: The recipe ────────────────────────────────────────────────────
    {
      title: 'The Recipe — Pivots Decide Everything',
      description: 'To find the **rank** and **nullity** of a transformation $T$, write it as a matrix $A$ and row-reduce. The **pivots** (leading 1s) split the columns into two kinds: a pivot column contributes a dimension to the *output* (rank); a pivot-free column contributes a *free variable*, and so a dimension to the *kernel* (nullity).',
      equation: `\\operatorname{rank} = \\#\\text{pivot columns}, \\quad \\operatorname{nullity} = \\#\\text{free columns} = n - \\operatorname{rank}`,
      notes: 'Here $n$ is the number of **columns** = $\\dim(\\text{domain})$. Because every column is either a pivot column or a free column, the two counts must add to $n$ — that *is* the rank–nullity theorem, read straight off the echelon form. Shaded red = pivot columns (→ rank); blue = free columns (→ nullity). The three steps that follow each run this exact recipe on a different matrix.',
      update(c2d, state, dt) {
        state.t += dt;
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        const f = fills(state.t);

        // A generic echelon form with two pivots and two free columns
        const U = [
          ['1', '∗', '∗', '∗'],
          ['0', '0', '1', '∗'],
          ['0', '0', '0', '0'],
        ];
        mat(c2d, U, -0.2, 1.7, {
          size: 17, cw: 0.8,
          shade: [{ cols: [0, 2], color: f.pivot }, { cols: [1, 3], color: f.free }],
        });
        // pivot markers
        c2d.showText('pivot', -1.0, 3.2, { size: 11, color: RED, align: 'center' });
        c2d.showText('pivot', 0.6, 3.2, { size: 11, color: RED, align: 'center' });
        c2d.showText('free', -0.2, -0.55, { size: 11, color: BLUE, align: 'center' });
        c2d.showText('free', 1.4, -0.55, { size: 11, color: BLUE, align: 'center' });

        c2d.showText('2 pivot columns   →   rank = 2', -6.4, -1.7, { size: 14, color: RED });
        c2d.showText('2 free columns    →   nullity = 2', -6.4, -2.5, { size: 14, color: BLUE });
        c2d.showText('rank + nullity = 2 + 2 = 4 = # columns', -6.4, -3.3, { size: 14, color: INK });
        c2d.showText('a zero row costs rank but never adds columns', -6.4, -4.1, { size: 12, color: GREY });
      },
    },

    // ── Step 2: 3×3, rank 2, nullity 1 ────────────────────────────────────────
    {
      title: 'Example A — A 3×3 With One Dependent Column',
      description: 'Take $T:\\mathbb{R}^3\\to\\mathbb{R}^3$. Column 2 is exactly twice column 1, so it adds nothing new — we expect the rank to drop. Row-reduce and **count the pivots**: two pivots (columns 1 and 3), so $\\operatorname{rank}=2$. The lone free column gives $\\operatorname{nullity}=3-2=1$.',
      equation: `A=\\begin{pmatrix}1&2&1\\\\2&4&3\\\\3&6&4\\end{pmatrix}\\ \\xrightarrow{\\;\\text{RREF}\\;}\\ \\begin{pmatrix}1&2&0\\\\0&0&1\\\\0&0&0\\end{pmatrix}`,
      notes: 'Solve for the kernel from the RREF. Column 2 is free, so set $x_2=t$. The pivot rows give $x_3=0$ and $x_1+2x_2=0\\Rightarrow x_1=-2t$. Hence $\\ker(T)=\\operatorname{span}\\{(-2,1,0)\\}$ — one-dimensional, matching nullity $=1$. Check: $\\operatorname{rank}+\\operatorname{nullity}=2+1=3=\\dim\\mathbb{R}^3$ ✓.',
      update(c2d, state, dt) {
        state.t += dt;
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        const f = fills(state.t);

        const A = [[1, 2, 1], [2, 4, 3], [3, 6, 4]];
        const R = [[1, 2, 0], [0, 0, 1], [0, 0, 0]];

        label(c2d, 'A =', -5.55, 2.9);
        mat(c2d, A, -4.3, 2.9, { cw: 0.62 });
        reduceArrow(c2d, -2.95, -1.6, 2.9, 'row-reduce');
        mat(c2d, R, -0.35, 2.9, {
          cw: 0.62,
          shade: [{ cols: [0, 2], color: f.pivot }, { cols: [1], color: f.free }],
        });

        // row-op log on the right
        c2d.showText('row operations', 1.6, 3.7, { size: 12, color: GREY, italic: true });
        const ops = ['R₂ → R₂ − 2R₁', 'R₃ → R₃ − 3R₁', 'R₃ → R₃ − R₂', 'R₁ → R₁ − R₂'];
        ops.forEach((s, i) => c2d.showText(s, 1.6, 3.0 - i * 0.62, { size: 12, color: GREY }));

        // results
        c2d.showText('pivots in columns 1, 3   →   rank = 2', -6.6, 0.4, { size: 14, color: RED });
        c2d.showText('free column 2            →   nullity = 1', -6.6, -0.4, { size: 14, color: BLUE });
        c2d.showText('rank + nullity = 2 + 1 = 3 = dim ℝ³  ✓', -6.6, -1.2, { size: 13, color: INK });

        // kernel solve + basis vector
        c2d.showText('kernel:  x₂ = t free  →  x₃ = 0,  x₁ = −2t', -6.6, -2.2, { size: 13, color: GREEN });
        c2d.showText('Null(A) = span', -6.6, -3.25, { size: 14, color: GREEN, align: 'left' });
        mat(c2d, [['−2'], ['1'], ['0']], -2.7, -3.1, { cw: 0.5, rh: 0.5, size: 13, color: GREEN });
      },
    },

    // ── Step 3: 2×4 wide, rank 2, nullity 2 ───────────────────────────────────
    {
      title: 'Example B — A Wide Matrix Is Forced To Have a Kernel',
      description: 'Now $T:\\mathbb{R}^4\\to\\mathbb{R}^2$. With only 2 rows there can be **at most 2 pivots**, yet there are 4 columns — so at least $4-2=2$ columns must be free. A wide ("fat") matrix can *never* be injective. This one is already in RREF: pivots in columns 1 and 3, free columns 2 and 4.',
      equation: `A=\\begin{pmatrix}1&2&0&1\\\\0&0&1&3\\end{pmatrix},\\qquad \\operatorname{rank}=2,\\quad \\operatorname{nullity}=4-2=2`,
      notes: 'Two free variables ⇒ a **two-dimensional** kernel, so we read off two basis vectors. Set $x_2=s,\\ x_4=t$. Pivot rows: $x_3=-3t$ and $x_1=-2s-t$. Collecting the $s$- and $t$-parts gives the basis below. General rule: if $T:\\mathbb{R}^n\\to\\mathbb{R}^m$ with $n>m$, then $\\operatorname{nullity}\\ge n-m>0$ — there is always something in the kernel.',
      update(c2d, state, dt) {
        state.t += dt;
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        const f = fills(state.t);

        const A = [[1, 2, 0, 1], [0, 0, 1, 3]];
        label(c2d, 'A =', -4.3, 3.0);
        mat(c2d, A, -2.9, 3.0, {
          cw: 0.7, size: 16,
          shade: [{ cols: [0, 2], color: f.pivot }, { cols: [1, 3], color: f.free }],
        });
        c2d.showText('already in reduced row echelon form', -4.4, 1.9, { size: 12, color: GREY });

        c2d.showText('≤ 2 rows ⇒ ≤ 2 pivots,  but 4 columns', -6.6, 0.7, { size: 13, color: INK });
        c2d.showText('pivots 1, 3   →   rank = 2', -6.6, -0.1, { size: 14, color: RED });
        c2d.showText('free 2, 4     →   nullity = 2', -6.6, -0.9, { size: 14, color: BLUE });
        c2d.showText('rank + nullity = 2 + 2 = 4 = dim ℝ⁴  ✓', -6.6, -1.7, { size: 13, color: INK });

        c2d.showText('set x₂ = s, x₄ = t  →  x₃ = −3t,  x₁ = −2s − t', -6.6, -2.6, { size: 13, color: GREEN });
        c2d.showText('Null(A) = span', -6.6, -3.55, { size: 14, color: GREEN });
        mat(c2d, [['−2'], ['1'], ['0'], ['0']], -2.6, -3.4, { cw: 0.5, rh: 0.46, size: 12, color: GREEN });
        c2d.showText(',', -2.0, -3.7, { size: 16, color: GREEN });
        mat(c2d, [['−1'], ['0'], ['−3'], ['1']], -1.3, -3.4, { cw: 0.5, rh: 0.46, size: 12, color: GREEN });
      },
    },

    // ── Step 4: 3×2 tall, rank 2, nullity 0 ───────────────────────────────────
    {
      title: 'Example C — A Tall Matrix With a Trivial Kernel',
      description: 'Flip it around: $T:\\mathbb{R}^2\\to\\mathbb{R}^3$. Both columns are independent, so both become pivots — **full column rank**, $\\operatorname{rank}=2$. There are no free columns, so $\\operatorname{nullity}=0$: the kernel is just $\\{\\mathbf 0\\}$ and $T$ is **injective**.',
      equation: `A=\\begin{pmatrix}1&0\\\\1&1\\\\0&1\\end{pmatrix}\\ \\xrightarrow{\\;\\text{RREF}\\;}\\ \\begin{pmatrix}1&0\\\\0&1\\\\0&0\\end{pmatrix},\\qquad \\operatorname{nullity}=0`,
      notes: 'Rank is capped by both dimensions: $\\operatorname{rank}\\le\\min(m,n)=\\min(3,2)=2$, and here it hits the cap. Full column rank ⇒ injective, but **not** surjective — the range is a 2-D plane sitting inside $\\mathbb{R}^3$, so it misses most of the codomain. Nullity $0$ means $A\\mathbf x=\\mathbf b$ has *at most one* solution for every $\\mathbf b$.',
      update(c2d, state, dt) {
        state.t += dt;
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        const f = fills(state.t);

        const A = [[1, 0], [1, 1], [0, 1]];
        const R = [[1, 0], [0, 1], [0, 0]];
        label(c2d, 'A =', -5.4, 2.9);
        mat(c2d, A, -4.4, 2.9, { cw: 0.6 });
        reduceArrow(c2d, -3.3, -2.1, 2.9, 'row-reduce');
        mat(c2d, R, -1.0, 2.9, {
          cw: 0.6,
          shade: [{ cols: [0, 1], color: f.pivot }],
        });

        c2d.showText('row operations', 1.0, 3.6, { size: 12, color: GREY, italic: true });
        ['R₂ → R₂ − R₁', 'R₃ → R₃ − R₂'].forEach((s, i) =>
          c2d.showText(s, 1.0, 2.95 - i * 0.62, { size: 12, color: GREY }));

        c2d.showText('both columns are pivots   →   rank = 2', -6.6, 0.5, { size: 14, color: RED });
        c2d.showText('no free columns           →   nullity = 0', -6.6, -0.3, { size: 14, color: BLUE });
        c2d.showText('rank + nullity = 2 + 0 = 2 = dim ℝ²  ✓', -6.6, -1.1, { size: 13, color: INK });
        c2d.showText('rank ≤ min(rows, cols) = min(3, 2) = 2  (cap hit)', -6.6, -2.1, { size: 13, color: GREY });
        c2d.showText('ker(T) = {0}  ⇒  T injective (but not onto ℝ³)', -6.6, -3.0, { size: 13, color: GREEN });
      },
    },

    // ── Step 5: differentiation on P₃ ─────────────────────────────────────────
    {
      title: 'Example D — A Transformation Without a Number Matrix',
      description: 'Rank and nullity belong to *any* linear map, not just ones handed to you as a grid of numbers. Take differentiation $D(p)=p\\,\'$ on polynomials of degree $\\le 3$ (a 4-D space). Pick the basis $\\{1,x,x^2,x^3\\}$, differentiate each, and write the results as columns — that **builds the matrix**, and then it is the same recipe.',
      equation: `D(1)=0,\\ D(x)=1,\\ D(x^2)=2x,\\ D(x^3)=3x^2 \\;\\Rightarrow\\; [D]=\\begin{pmatrix}0&1&0&0\\\\0&0&2&0\\\\0&0&0&3\\\\0&0&0&0\\end{pmatrix}`,
      notes: 'Columns 2, 3, 4 are pivots ⇒ $\\operatorname{rank}=3$ (range = polynomials of degree $\\le 2$). Column 1 is free ⇒ $\\operatorname{nullity}=1$, and the kernel is exactly the **constants** (the things differentiation forgets). $3+1=4=\\dim P_3$ ✓. Same machine, no coordinates required to start — choosing a basis is what turns the transformation into a matrix you can reduce.',
      update(c2d, state, dt) {
        state.t += dt;
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f4f4f4' });
        const f = fills(state.t);

        // the four images, as a build-the-matrix table
        c2d.showText('differentiate each basis polynomial:', -6.6, 3.6, { size: 13, color: INK });
        const cols = [
          'D(1)  = 0',
          "D(x)  = 1",
          'D(x²) = 2x',
          'D(x³) = 3x²',
        ];
        cols.forEach((s, i) => c2d.showText(s, -6.6, 2.9 - i * 0.62, { size: 13, color: GREY }));

        const Dm = [[0, 1, 0, 0], [0, 0, 2, 0], [0, 0, 0, 3], [0, 0, 0, 0]];
        label(c2d, '[D] =', -1.3, 1.0);
        mat(c2d, Dm, 0.4, 1.0, {
          cw: 0.7, size: 15,
          shade: [{ cols: [1, 2, 3], color: f.pivot }, { cols: [0], color: f.free }],
        });

        c2d.showText('pivots 2,3,4  →  rank = 3   (range = deg ≤ 2)', -6.6, -1.7, { size: 13, color: RED });
        c2d.showText('free col 1    →  nullity = 1  (kernel = constants)', -6.6, -2.5, { size: 13, color: BLUE });
        c2d.showText('rank + nullity = 3 + 1 = 4 = dim P₃  ✓', -6.6, -3.3, { size: 13, color: INK });
      },
    },

  ],
};
