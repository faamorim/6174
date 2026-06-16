
const STUCK_LABEL = "stuck";

/** Returns [{ label, steps, count }] for steps 0..7 plus a "stuck" bucket for dead ends. */
function buildHistogram() {
  const counts = new Map(); // steps (-1 for stuck) -> count
  for (let n = MIN; n <= MAX; n++) {
    const s = stepsToTarget[n];
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }

  const maxSteps = Math.max(...[...counts.keys()].filter((s) => s >= 0));
  const buckets = [];
  for (let s = 0; s <= maxSteps; s++) {
    buckets.push({ label: String(s), steps: s, count: counts.get(s) ?? 0 });
  }
  buckets.push({ label: STUCK_LABEL, steps: -1, count: counts.get(-1) ?? 0 });
  return buckets;
}

const histogram = buildHistogram();

/**
 * Draws the step-distance histogram onto canvas.
 * If selectedSteps is given (the stepsToTarget value of a picked number),
 * that bucket's bar is highlighted.
 */
function renderBarsView(canvas, selectedSteps) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 55, right: 20, bottom: 40, left: 20 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(...histogram.map((b) => b.count));
  const barGap = 12;
  const barWidth = (plotWidth - barGap * (histogram.length - 1)) / histogram.length;

  ctx.textAlign = "center";
  ctx.font = "14px ui-monospace, monospace";

  histogram.forEach((bucket, i) => {
    const x = padding.left + i * (barWidth + barGap);
    const barHeight = maxCount === 0 ? 0 : (bucket.count / maxCount) * plotHeight;
    const y = padding.top + plotHeight - barHeight;
    const isSelected = bucket.steps === selectedSteps;

    ctx.fillStyle = isSelected ? "#1a7f37" : bucket.steps === -1 ? "#999" : "#3478c4";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#1a1a1a";
    ctx.fillText(String(bucket.count), x + barWidth / 2, y - 8);

    ctx.fillText(bucket.label, x + barWidth / 2, padding.top + plotHeight + 20);
  });

  ctx.fillStyle = "#666";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(
    "steps to reach 6174 (“stuck” = repdigits)",
    width / 2,
    16
  );
}
