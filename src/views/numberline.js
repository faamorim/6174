// Traffic-light gradient by node distance-to-target (0 = at 6174 = green,
// 7 = farthest possible start = red). Nodes get 8 stops (0..7); arcs reuse
// the color of the node they lead into, so the very first number (which has
// no incoming arc) is the only place the reddest stop (7) ever shows up.
const MAX_DISTANCE = 7;
const STUCK_COLOR = "#999999";
const LABEL_ROW_HEIGHT = 16;
const LABEL_MIN_GAP = 6;

function colorForNodeDistance(d) {
  if (d < 0) return STUCK_COLOR; // repdigit dead end, never reaches 6174
  const hue = (1 - d / MAX_DISTANCE) * 120; // 0 = red, 120 = green
  return `hsl(${hue}, 70%, 45%)`;
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
function renderNumberLineView(canvas, n) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const padding = { left: 30, right: 30, top: 20, bottom: 30 };
  const plotWidth = width - padding.left - padding.right;
  const xFor = (num) => padding.left + (num / MAX) * plotWidth;

  if (!Number.isInteger(n) || n < MIN || n > MAX) {
    return;
  }

  const path = pathToTarget(n);
  const nodeColors = path.map((num) => colorForNodeDistance(stepsToTarget[num]));

  // Work out how many label rows we need before fixing the baseline position,
  // so the canvas grows the bottom margin instead of letting labels overlap.
  ctx.font = "13px ui-monospace, monospace";
  const labelEntries = assignLabelRows(
    ctx,
    path.map((num) => ({ num, x: xFor(num), text: formatDigits(num) }))
  );
  const rowCount = Math.max(...labelEntries.map((e) => e.row)) + 1;
  padding.bottom = 30 + (rowCount - 1) * LABEL_ROW_HEIGHT;

  const lineY = height - padding.bottom;
  const maxArcHeight = height - padding.top - padding.bottom - 10;

  // baseline
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(padding.left, lineY);
  ctx.lineTo(padding.left + plotWidth, lineY);
  ctx.stroke();

  // arcs between consecutive numbers in the path; each arc takes the color
  // of the node it leads into (the number "arrives" already colored).
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to = path[i + 1];
    const fromDistance = Math.max(1, stepsToTarget[from]); // height only; clamp stuck (-1) up
    const arcHeight = (fromDistance / MAX_DISTANCE) * maxArcHeight;

    const x1 = xFor(from);
    const x2 = xFor(to);
    const midX = (x1 + x2) / 2;
    const controlY = lineY - arcHeight * 2; // quadratic control point overshoots so the curve peak is roughly arcHeight

    ctx.strokeStyle = nodeColors[i + 1];
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, lineY);
    ctx.quadraticCurveTo(midX, controlY, x2, lineY);
    ctx.stroke();
  }

  // ticks + labels for every number visited, colored like the arc that led
  // to them (the starting number has no incoming arc, so it gets its own
  // distance-based color instead), stacked into rows to avoid overlap.
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
