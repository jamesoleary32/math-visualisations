// Canvas2D wraps a CanvasRenderingContext2D with world-space helpers.
//
// World space: origin at centre, y-axis up, units ~1 = 80px at default scale.
// Call clear() at the start of each frame, then use the draw* methods.

export class Canvas2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    this.scale  = 80; // pixels per world unit
    this._persistent = []; // draw calls that survive step changes
    this._live = [];        // draw calls cleared each frame
  }

  get width()  { return this.canvas.width; }
  get height() { return this.canvas.height; }
  get cx()     { return this.width  / 2; }
  get cy()     { return this.height / 2; }

  // World → screen
  wx(x) { return this.cx + x * this.scale; }
  wy(y) { return this.cy - y * this.scale; }
  ws(s) { return s * this.scale; }

  // ── Frame lifecycle ───────────────────────────────────────────────────────

  clearLive() { this._live = []; }

  clearPersistent() { this._persistent = []; }

  // Redraw everything (persistent + live). Called each frame by main2d.
  flush() {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);
    for (const fn of this._persistent) fn(ctx);
    for (const fn of this._live)       fn(ctx);
  }

  // ── Registration helpers ──────────────────────────────────────────────────

  _add(fn, live) {
    (live ? this._live : this._persistent).push(fn);
  }

  // ── Persistent layer (call from step.setup) ───────────────────────────────

  addGrid(opts = {}) {
    const spacing = opts.spacing ?? 1;
    const color   = opts.color   ?? '#ececec';
    this._add(ctx => _drawGrid(ctx, this, spacing, color), false);
  }

  addAxes(opts = {}) {
    const color = opts.color ?? '#cccccc';
    this._add(ctx => _drawAxes(ctx, this, color), false);
  }

  addPoint(x, y, opts = {}) {
    const r     = opts.radius ?? 6;
    const color = opts.color  ?? '#1565c0';
    const label = opts.label  ?? null;
    this._add(ctx => _drawPoint(ctx, this, x, y, r, color, label), false);
  }

  addLine(pts, opts = {}) {
    const color = opts.color ?? '#555555';
    const width = opts.width ?? 1.5;
    const dash  = opts.dash  ?? [];
    this._add(ctx => _drawLine(ctx, this, pts, color, width, dash), false);
  }

  addArrow(x0, y0, x1, y1, opts = {}) {
    const color = opts.color ?? '#333333';
    const width = opts.width ?? 1.5;
    this._add(ctx => _drawArrow(ctx, this, x0, y0, x1, y1, color, width), false);
  }

  addText(text, x, y, opts = {}) {
    const color  = opts.color  ?? '#333333';
    const size   = opts.size   ?? 13;
    const italic = opts.italic ?? false;
    const align  = opts.align  ?? 'left';
    this._add(ctx => _drawText(ctx, this, text, x, y, color, size, italic, align), false);
  }

  // ── Live layer (call from step.update — cleared each frame) ───────────────

  showPoint(x, y, opts = {}) {
    const r     = opts.radius ?? 6;
    const color = opts.color  ?? '#1565c0';
    const label = opts.label  ?? null;
    this._add(ctx => _drawPoint(ctx, this, x, y, r, color, label), true);
  }

  showLine(pts, opts = {}) {
    const color = opts.color ?? '#555555';
    const width = opts.width ?? 1.5;
    const dash  = opts.dash  ?? [];
    this._add(ctx => _drawLine(ctx, this, pts, color, width, dash), true);
  }

  showArrow(x0, y0, x1, y1, opts = {}) {
    const color = opts.color ?? '#333333';
    const width = opts.width ?? 1.5;
    this._add(ctx => _drawArrow(ctx, this, x0, y0, x1, y1, color, width), true);
  }

  showText(text, x, y, opts = {}) {
    const color  = opts.color  ?? '#333333';
    const size   = opts.size   ?? 13;
    const italic = opts.italic ?? false;
    const align  = opts.align  ?? 'left';
    this._add(ctx => _drawText(ctx, this, text, x, y, color, size, italic, align), true);
  }

  // Raw canvas draw function — for complex lesson-specific geometry.
  // fn receives (ctx, c2d) where c2d exposes wx/wy/ws for coordinate conversion.
  raw(fn)     { this._add(ctx => fn(ctx, this), false); }
  showRaw(fn) { this._add(ctx => fn(ctx, this), true);  }
}

// ── Internal draw functions ───────────────────────────────────────────────────

function _drawGrid(ctx, c, spacing, color) {
  const cols = Math.ceil(c.width  / (c.scale * spacing)) + 2;
  const rows = Math.ceil(c.height / (c.scale * spacing)) + 2;
  const ox   = ((c.cx / c.scale) % spacing);
  const oy   = ((c.cy / c.scale) % spacing);

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1;

  for (let i = -cols; i <= cols; i++) {
    const sx = c.wx((i - ox % spacing) * spacing);
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, c.height);
  }
  for (let j = -rows; j <= rows; j++) {
    const sy = c.wy((j - oy % spacing) * spacing);
    ctx.moveTo(0, sy);
    ctx.lineTo(c.width, sy);
  }
  ctx.stroke();
}

function _drawAxes(ctx, c, color) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = 1.5;
  ctx.moveTo(0, c.wy(0));
  ctx.lineTo(c.width, c.wy(0));
  ctx.moveTo(c.wx(0), 0);
  ctx.lineTo(c.wx(0), c.height);
  ctx.stroke();
}

function _drawPoint(ctx, c, x, y, r, color, label) {
  const sx = c.wx(x), sy = c.wy(y);
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  if (label) {
    ctx.fillStyle = color;
    ctx.font      = `italic bold 13px Georgia, serif`;
    ctx.fillText(label, sx + r + 5, sy + 4);
  }
}

function _drawLine(ctx, c, pts, color, width, dash) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  ctx.setLineDash(dash);
  ctx.moveTo(c.wx(pts[0][0]), c.wy(pts[0][1]));
  for (let i = 1; i < pts.length; i++) ctx.lineTo(c.wx(pts[i][0]), c.wy(pts[i][1]));
  ctx.stroke();
  ctx.setLineDash([]);
}

function _drawArrow(ctx, c, x0, y0, x1, y1, color, width) {
  const sx0 = c.wx(x0), sy0 = c.wy(y0);
  const sx1 = c.wx(x1), sy1 = c.wy(y1);
  const dx = sx1 - sx0, dy = sy1 - sy0;
  const len = Math.sqrt(dx*dx + dy*dy);
  if (len < 1) return;
  const ux = dx/len, uy = dy/len;
  const headLen = Math.min(14, len * 0.35);

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  ctx.moveTo(sx0, sy0);
  ctx.lineTo(sx1, sy1);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = color;
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(sx1 - ux*headLen - uy*headLen*0.4, sy1 - uy*headLen + ux*headLen*0.4);
  ctx.lineTo(sx1 - ux*headLen + uy*headLen*0.4, sy1 - uy*headLen - ux*headLen*0.4);
  ctx.closePath();
  ctx.fill();
}

function _drawText(ctx, c, text, x, y, color, size, italic, align) {
  ctx.fillStyle  = color;
  ctx.font       = `${italic ? 'italic ' : ''}${size}px Georgia, serif`;
  ctx.textAlign  = align;
  ctx.fillText(text, c.wx(x), c.wy(y));
}
