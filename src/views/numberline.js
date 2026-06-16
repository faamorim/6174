// Color/height are relative to THIS path, not absolute distance-to-target:
// the first jump is always max height + red, the last jump always min
// height + green, interpolating in between. A single-jump path is max/red
// (there's no "last jump" distinct from the first one).
const STUCK_COLOR = "#999999";
const MIN_HEIGHT_RATIO = 0.15;
const LABEL_ROW_HEIGHT = 16;
const LABEL_MIN_GAP = 6;

// Fixed layout: the line always sits PADDING_TOP + ARC_AREA_HEIGHT pixels
// from the top, regardless of how many label rows the bottom needs. Only
// the canvas's total height (and the label area) grows downward.
const PADDING_TOP = 20;
const ARC_AREA_HEIGHT = 140;
const ARC_HEIGHT_MARGIN = 10;
const LABEL_BASE_HEIGHT = 30;

/** t=0 is the first jump (red), t=1 is the last jump (green). */
function colorForT(t) {
  return `hsl(${t * 120}, 70%, 45%)`;
}

/** Greedily stacks labels into rows so close-together ones don't overlap. */
function assignLabelRows(ctx, entries) {
  const rowEnds = []; // rightmost x reached so far, per row
  return entries.map((entry) => {
    const halfWidth = ctx.measureText(entry.text).width / 2;
    const left = entry.x - halfWidth;
    const right = entry.x + halfWidth;
    let row = rowEnds.findIndex((end) => end + LABEL_MIN_GAP <= left);
    if (row === -1) {
      row = rowEnds.length;
      rowEnds.push(right);
    } else {
      rowEnds[row] = right;
    }
    return { ...entry, row };
  });
}

/**
 * Draws only the picked number's path to 6174 (or to its dead end) as a
 * series of arcs on a 0..9999 number line. No zoom/LOD: a path is at
 * most 7 hops, so it's always cheap to draw in full.
 */
function renderNumberLineView(canvas, n, { showLabels = true } = {}) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;

  const padding = { left: 30, right: 30 };
  const plotWidth = width - padding.left - padding.right;
  const xFor = (num) => padding.left + (num / MAX) * plotWidth;
  const lineY = PADDING_TOP + ARC_AREA_HEIGHT;
  const maxArcHeight = ARC_AREA_HEIGHT - ARC_HEIGHT_MARGIN;

  if (!Number.isInteger(n) || n < MIN || n > MAX) {
    canvas.style.height = `${lineY + LABEL_BASE_HEIGHT}px`;
    canvas.width = width * dpr;
    canvas.height = (lineY + LABEL_BASE_HEIGHT) * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, lineY + LABEL_BASE_HEIGHT);
    return;
  }

  const path = pathToTarget(n);
  const isDeadEnd = path[path.length - 1] !== TARGET;
  const numArcs = path.length - 1;

  // Per-arc color/height, by position within this path (not absolute
  // distance-to-target): arc 0 is always max height + red, the last arc is
  // always min height + green. Node colors borrow the arc that leads into
  // them; the starting node borrows arc 0's color (also red) since it has
  // no incoming arc of its own.
  const arcStyles = [];
  for (let i = 0; i < numArcs; i++) {
    const t = numArcs > 1 ? i / (numArcs - 1) : 0;
    arcStyles.push({
      color: isDeadEnd ? STUCK_COLOR : colorForT(t),
      height: maxArcHeight * (1 - t * (1 - MIN_HEIGHT_RATIO)),
    });
  }
  const nodeColors = path.map((_, i) =>
    i === 0 ? arcStyles[0]?.color ?? (isDeadEnd ? STUCK_COLOR : colorForT(1)) : arcStyles[i - 1].color
  );

  // Skip label layout entirely when cycling fast: nobody can read flashing
  // numbers anyway, and it saves a measureText pass per frame. The canvas
  // just stays at its single-row height instead.
  let labelEntries = [];
  let height = lineY + LABEL_BASE_HEIGHT;
  if (showLabels) {
    ctx.font = "13px ui-monospace, monospace";
    labelEntries = assignLabelRows(
      ctx,
      path.map((num) => ({ num, x: xFor(num), text: formatDigits(num) }))
    );
    const rowCount = Math.max(...labelEntries.map((e) => e.row)) + 1;
    height = lineY + LABEL_BASE_HEIGHT + (rowCount - 1) * LABEL_ROW_HEIGHT;
  }

  canvas.style.height = `${height}px`;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // baseline
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(padding.left, lineY);
  ctx.lineTo(padding.left + plotWidth, lineY);
  ctx.stroke();

  // arcs between consecutive numbers in the path
  for (let i = 0; i < numArcs; i++) {
    const from = path[i];
    const to = path[i + 1];
    const { color, height: arcHeight } = arcStyles[i];

    const x1 = xFor(from);
    const x2 = xFor(to);
    const midX = (x1 + x2) / 2;
    const controlY = lineY - arcHeight * 2; // quadratic control point overshoots so the curve peak is roughly arcHeight

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, lineY);
    ctx.quadraticCurveTo(midX, controlY, x2, lineY);
    ctx.stroke();
  }

  if (!showLabels) return;

  // ticks + labels for every number visited, colored like the arc that led
  // to them (the starting number has no incoming arc, so it borrows arc 0's
  // color instead), stacked into rows to avoid overlap.
  ctx.textAlign = "center";
  labelEntries.forEach(({ num, x, text, row }, i) => {
    const isEndpoint = i === labelEntries.length - 1;
    const color = nodeColors[i];

    ctx.strokeStyle = color;
    ctx.lineWidth = isEndpoint ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x, lineY - 6);
    ctx.lineTo(x, lineY + 6);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = isEndpoint ? "bold 13px ui-monospace, monospace" : "13px ui-monospace, monospace";
    ctx.fillText(text, x, lineY + 22 + row * LABEL_ROW_HEIGHT);
  });

  // 0 / 9999 range labels
  ctx.fillStyle = "#999";
  ctx.font = "12px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText("0000", padding.left, lineY - 10);
  ctx.textAlign = "right";
  ctx.fillText(String(MAX), padding.left + plotWidth, lineY - 10);
}
