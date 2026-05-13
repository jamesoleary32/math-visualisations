// Inverse Transformation
//
// If A maps every vector v → Av, then A⁻¹ is the unique matrix that undoes it:
//   A⁻¹(Av) = v   for every v.
//
// A⁻¹ exists if and only if det(A) ≠ 0.
// For a 2×2 matrix [[a,b],[c,d]]:
//   A⁻¹ = (1/det) · [[d,−b],[−c,a]]

// ── Matrix helpers ─────────────────────────────────────────────────────────────

function tx(M, x, y) {
  return [M[0]*x + M[1]*y, M[2]*x + M[3]*y];
}

function det(M) {
  return M[0]*M[3] - M[1]*M[2];
}

function inv(M) {
  const d = det(M);
  if (Math.abs(d) < 1e-10) return null;
  return [M[3]/d, -M[1]/d, -M[2]/d, M[0]/d];
}

function drawTransformedGrid(c2d, M, color, width) {
  for (let i = -7; i <= 7; i++) {
    c2d.addLine([tx(M,-7,i), tx(M,7,i)], { color, width });
    c2d.addLine([tx(M,i,-7), tx(M,i,7)], { color, width });
  }
}

function drawFilledQuad(c2d, pts, fillColor, strokeColor, strokeWidth) {
  c2d.raw((ctx, cam) => {
    ctx.beginPath();
    ctx.moveTo(cam.wx(pts[0][0]), cam.wy(pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(cam.wx(pts[i][0]), cam.wy(pts[i][1]));
    ctx.closePath();
    if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
    if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth ?? 2; ctx.stroke(); }
  });
}

// ── Lesson ────────────────────────────────────────────────────────────────────

// Working matrix: shear + scale
const A = [2, 0.8, 0.4, 1.5];

// A triangle to transform — easy to recognise when distorted
const TRI = [[0,0],[2,0],[1,1.5]];

export default {
  title:   'Inverse Transformation',
  subject: 'Linear Algebra',

  initState: () => ({}),

  init(c2d) {
    c2d.scale = 55;
  },

  steps: [

    // ── Step 1: A transforms the plane ───────────────────────────────────────
    {
      title: 'A Transforms Every Vector',
      description: 'The matrix A maps every point (x, y) to a new point A(x, y). The grid and triangle are carried along — each straight line stays straight, but angles and lengths change.',
      equation: 'A = \\begin{pmatrix}2 & 0.8\\\\0.4 & 1.5\\end{pmatrix}',
      notes: 'The grid transforms into a new grid of parallelograms — this is what a linear transformation looks like globally. det(A) = 2×1.5 − 0.8×0.4 = 2.68, so no area is destroyed.',
      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#e0e0e0' });

        // Original grid (faint grey)
        for (let i = -6; i <= 6; i++) {
          c2d.addLine([[-6,i],[6,i]], { color: '#ebebeb', width: 1 });
          c2d.addLine([[i,-6],[i,6]], { color: '#ebebeb', width: 1 });
        }

        // Transformed grid
        drawTransformedGrid(c2d, A, '#bfd7f5', 1);

        // Transformed triangle
        const tTri = TRI.map(([x,y]) => tx(A,x,y));
        drawFilledQuad(c2d, tTri, 'rgba(21,101,192,0.18)', '#1565c0', 2);

        // Original triangle (faint)
        drawFilledQuad(c2d, TRI, 'rgba(0,0,0,0.05)', '#bbb', 1);

        // Origin
        c2d.addPoint(0, 0, { radius: 4, color: '#555' });
        c2d.addText('A maps blue triangle → image (darker)', -5.5, 4.2, { color: '#1565c0', size: 12 });
        c2d.addText(`det(A) = ${det(A).toFixed(2)} ≠ 0`, -5.5, 3.7, { color: '#555', size: 12 });
      },
    },

    // ── Step 2: A⁻¹ undoes the transformation ────────────────────────────────
    {
      title: 'A⁻¹ Undoes the Mapping',
      description: 'The inverse matrix A⁻¹ reverses every step of A. If A sends v to w, then A⁻¹ sends w back to v. Applied to the transformed grid, A⁻¹ restores the original square grid.',
      equation: 'A^{-1} = \\frac{1}{\\det A}\\begin{pmatrix}d & -b \\\\ -c & a\\end{pmatrix}',
      notes: 'A⁻¹ is not the same as "negative A". It is a different matrix that reverses the geometry. Here A⁻¹ ≈ [[0.56, −0.30], [−0.15, 0.75]].',
      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#e0e0e0' });

        const Ai = inv(A);

        // Show the transformed state (A applied) as starting point, then A⁻¹ grid
        drawTransformedGrid(c2d, A, '#ebebeb', 1);

        // A⁻¹ applied to the A-transformed grid = original grid (shown as orange)
        for (let i = -6; i <= 6; i++) {
          const pA = (n, m) => { const [sx,sy] = tx(A,n,m); return tx(Ai,sx,sy); };
          c2d.addLine([pA(-6,i), pA(6,i)], { color: '#f4a620', width: 1 });
          c2d.addLine([pA(i,-6), pA(i,6)], { color: '#f4a620', width: 1 });
        }

        // Transformed triangle then inverse
        const tTri  = TRI.map(([x,y]) => tx(A,x,y));
        const riTri = tTri.map(([x,y]) => tx(Ai,x,y));
        drawFilledQuad(c2d, tTri,  'rgba(21,101,192,0.10)', '#1565c0', 1);
        drawFilledQuad(c2d, riTri, 'rgba(230,120,0,0.20)', '#e07b00', 2);

        c2d.addPoint(0, 0, { radius: 4, color: '#555' });
        c2d.addText('A⁻¹ applied to A-image (orange) → original (square grid)', -5.5, 4.2, { color: '#e07b00', size: 11 });
      },
    },

    // ── Step 3: Round-trip A⁻¹A = I ─────────────────────────────────────────
    {
      title: 'Round Trip: A⁻¹A = I',
      description: 'Applying A then A⁻¹ (or A⁻¹ then A) returns every vector exactly to itself. The composition equals the identity matrix I — the transformation that does nothing.',
      equation: 'A^{-1}A = AA^{-1} = I = \\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}',
      notes: 'Three example vectors each follow A → Av → A⁻¹(Av) = v. The arrowhead lands exactly back at the start.',
      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#e0e0e0' });

        const Ai = inv(A);
        const probes = [[1.5, 0.5], [-1, 1], [0.5, -1.5]];
        const cols   = ['#c62828', '#2e7d32', '#6a1b9a'];

        probes.forEach(([x,y], i) => {
          const [ax, ay]   = tx(A, x, y);
          const [aix, aiy] = tx(Ai, ax, ay);

          // Step 1: v → Av
          c2d.addArrow(x, y, ax, ay, { color: cols[i], width: 1.5 });
          c2d.addPoint(ax, ay, { radius: 5, color: cols[i] });

          // Step 2: Av → A⁻¹(Av) = v
          c2d.addArrow(ax, ay, aix, aiy, { color: cols[i], width: 2 });

          // Original point
          c2d.addPoint(x, y, { radius: 5, color: '#555' });
        });

        c2d.addText('thin arrow: A applied', -5.5, 4.2, { color: '#555', size: 12 });
        c2d.addText('thick arrow: A⁻¹ returns to start', -5.5, 3.7, { color: '#555', size: 12 });
      },
    },

    // ── Step 4: No inverse when det = 0 ─────────────────────────────────────
    {
      title: 'det = 0 — No Inverse Exists',
      description: 'When det(A) = 0, the transformation collapses the plane to a line. Information from an entire direction is destroyed — there is no way to recover the original vectors. A⁻¹ cannot exist.',
      equation: '\\det(A) = 0 \\implies A^{-1} \\text{ does not exist}',
      notes: 'Two different points can map to the same image. Once collapsed, you cannot know which pre-image to return to — the inverse is not well-defined.',
      setup(c2d) {},
      update(c2d) {
        c2d.clearPersistent();
        c2d.addGrid({ spacing: 1, color: '#f5f5f5' });
        c2d.addAxes({ color: '#e0e0e0' });

        // Singular matrix: rank 1 — projects onto the line y = x
        const S = [1, 1, 1, 1];

        // Show several pre-images that land at the same point
        const pairs = [[-1, 1],[-0.5, 0.5],[0.5,-0.5],[1,-1]];
        pairs.forEach(([x,y]) => {
          const [sx,sy] = tx(S,x,y);
          c2d.addArrow(x, y, sx, sy, { color: '#999', width: 1.5 });
        });

        // The collapse target points
        const images = [[-1,1],[0,0],[1,-1],[2,-2]];
        images.forEach(([x,y]) => {
          const [sx,sy] = tx(S,x,y);
          c2d.addPoint(sx,sy,{ radius:5, color:'#c62828' });
        });

        // Image line
        c2d.addLine([[-5,-5],[5,5]], { color: '#c62828', width: 2 });
        c2d.addText('image: all points land on this line', 0.5, -0.4, { color: '#c62828', size: 11 });
        c2d.addText('? → impossible to know original from image', -5.5, 4.2, { color: '#555', size: 11 });
        c2d.addText('det(S) = 1·1 − 1·1 = 0  →  no inverse', -5.5, 3.7, { color: '#c62828', size: 12 });
      },
    },

  ],
};
