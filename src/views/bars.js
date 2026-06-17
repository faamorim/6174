
const STUCK_LABEL = "stuck";

// ─── Data builders ───────────────────────────────────────────────────────────

function buildHistogram() {
  const counts = new Map();
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

/**
 * imageSets[k] = Set of numbers that appear as the (k+1)-th step output
 * from at least one starting number (i.e. the global image of nextStep^(k+1)).
 *   image_1 = { nextStep(n)        for all n in MIN..MAX }
 *   image_2 = { nextStep(y)        for y in image_1 }
 *   image_k = { nextStep(y)        for y in image_{k-1} }
 * Since every Kaprekar output is divisible by 9, numbers like 0116 (digit-sum
 * 8) are absent from every image set — they are never produced by any step.
 */
function buildImageSets() {
  const maxK = histogram.length >= 2 ? histogram[histogram.length - 2].steps : 7;
  const sets = [];
  let frontier = new Set();
  for (let n = MIN; n <= MAX; n++) frontier.add(nextStep[n]);
  sets.push(frontier); // image_1
  for (let k = 1; k < maxK; k++) {
    const next = new Set();
    for (const y of frontier) next.add(nextStep[y]);
    frontier = next;
    sets.push(frontier); // image_{k+1}
  }
  return sets;
}

/**
 * The union of all image sets: numbers reachable as SOME step from any start.
 * Since image_{k} ⊆ image_1 for all k≥1, this equals imageSets[0].
 */
function buildEverReachable() {
  return new Set(imageSets[0]);
}

let histogram = buildHistogram();
let imageSets = buildImageSets();
let everReachableSet = buildEverReachable();

function rebuildBarsData() {
  histogram = buildHistogram();
  imageSets = buildImageSets();
  everReachableSet = buildEverReachable();
}

// ─── Heatmap helpers ─────────────────────────────────────────────────────────

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

/** RGB for a step count: 0 = green (at kernel), maxSteps = red, stuck = grey. */
function stepsRgb(steps) {
  if (steps < 0) return [153, 153, 153];
  const maxSteps = histogram.length >= 2 ? histogram[histogram.length - 2].steps : 1;
  const t = maxSteps === 0 ? 1 : 1 - steps / maxSteps;
  return hslToRgb(t * 120, 70, 45);
}

/** Paint the steps data canvas at full resolution: one pixel column per number. */
function fillHeatmapData(dataCanvas, rgbFn) {
  dataCanvas.width = MAX + 1;
  dataCanvas.height = 1;
  const ctx = dataCanvas.getContext("2d");
  const imageData = ctx.createImageData(MAX + 1, 1);
  const d = imageData.data;
  for (let n = 0; n <= MAX; n++) {
    const [r, g, b] = rgbFn(n);
    const i = n * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw the below-strip label row: upward triangle at n's position, n's value,
 * and "0000"/"9999" at the edges — suppressing whichever range label would
 * overlap the number label (measured in pixels, not estimated by threshold).
 */
function drawHeatmapLabels(labelCanvas, n) {
  const dpr = window.devicePixelRatio || 1;
  const w = labelCanvas.clientWidth || 640;
  const h = labelCanvas.clientHeight || 30;
  labelCanvas.width = Math.round(w * dpr);
  labelCanvas.height = Math.round(h * dpr);
  const ctx = labelCanvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  ctx.font = "11px ui-monospace, monospace";
  const textY = h - 3;
  const GAP = 4; // minimum pixel gap between adjacent labels

  const minLabel = formatDigits(MIN);
  const maxLabel = formatDigits(MAX);
  const minW = ctx.measureText(minLabel).width;
  const maxW = ctx.measureText(maxLabel).width;

  const hasN = Number.isInteger(n) && n >= MIN && n <= MAX;

  if (!hasN) {
    ctx.fillStyle = "#888";
    ctx.textAlign = "left";
    ctx.fillText(minLabel, 1, textY);
    ctx.textAlign = "right";
    ctx.fillText(maxLabel, w - 1, textY);
    return;
  }

  const nX = Math.round((n / MAX) * w);

  // Upward triangle — tip toward the strip
  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(nX, 2);
  ctx.lineTo(nX - 4, 9);
  ctx.lineTo(nX + 4, 9);
  ctx.closePath();
  ctx.fill();

  // Number label: choose alignment so it stays inside the canvas
  const numLabel = formatDigits(n);
  const numW = ctx.measureText(numLabel).width;
  const align = nX > w - numW / 2 - GAP ? "right"
              : nX < numW / 2 + GAP ? "left"
              : "center";

  // Pixel extent of number label
  const numL = align === "right"  ? nX - numW
             : align === "left"   ? nX
             : nX - numW / 2;
  const numR = numL + numW;

  // Range labels: draw only if they won't overlap the number label
  ctx.fillStyle = "#888";
  if (numL > 1 + minW + GAP) {
    ctx.textAlign = "left";
    ctx.fillText(minLabel, 1, textY);
  }
  if (numR < w - 1 - maxW - GAP) {
    ctx.textAlign = "right";
    ctx.fillText(maxLabel, w - 1, textY);
  }

  ctx.fillStyle = "#333";
  ctx.textAlign = align;
  ctx.fillText(numLabel, nX, textY);
}

function renderStepsHeatmap(dataCanvas, labelCanvas, n) {
  fillHeatmapData(dataCanvas, (px) => stepsRgb(stepsToTarget[px]));
  drawHeatmapLabels(labelCanvas, n);
}

/**
 * Level filter heatmap: rendered at DISPLAY resolution with "any-match"
 * aggregation so that even sparse image sets (steps 3-7) show correctly.
 *
 * Slider = 0  → level -1: dark pixel if no number in range is ever produced
 *                          by any step; light grey otherwise.
 * Slider = N  → level N:  colored if any number in range is in image_N
 *                          (colored by its stepsToTarget); grey otherwise.
 */
function renderLevelHeatmap(dataCanvas, labelCanvas, n, level) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = dataCanvas.clientWidth || 640;
  const pixW = Math.round(cssW * dpr);
  const range = MAX - MIN + 1;

  dataCanvas.width = pixW;
  dataCanvas.height = 1;
  const ctx = dataCanvas.getContext("2d");
  const imageData = ctx.createImageData(pixW, 1);
  const d = imageData.data;

  const imageSet = level >= 1 && level <= imageSets.length ? imageSets[level - 1] : null;

  for (let px = 0; px < pixW; px++) {
    // Map this display pixel to a range of numbers
    const nLo = MIN + Math.floor((px / pixW) * range);
    const nHi = MIN + Math.min(range - 1, Math.ceil(((px + 1) / pixW) * range) - 1);

    let r, g, b;

    if (level < 0) {
      // "Never produced": dark if nothing in this pixel range is ever reachable
      let anyReachable = false;
      for (let num = nLo; num <= nHi && !anyReachable; num++) {
        if (everReachableSet.has(num)) anyReachable = true;
      }
      [r, g, b] = anyReachable ? [220, 220, 220] : [70, 70, 70];
    } else {
      // Level N: highlight any number in range that is in image_N
      let matchSteps = null;
      if (imageSet) {
        for (let num = nLo; num <= nHi; num++) {
          if (imageSet.has(num)) { matchSteps = stepsToTarget[num]; break; }
        }
      }
      [r, g, b] = matchSteps !== null ? stepsRgb(matchSteps) : [235, 235, 235];
    }

    const i = px * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  drawHeatmapLabels(labelCanvas, n);
}

// ─── Bar charts ──────────────────────────────────────────────────────────────

/** How many distinct numbers appear as the N-th step output across all starts. */
function renderImageSetsChart(canvas) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.clientHeight || canvas.height;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const padding = { top: 45, right: 20, bottom: 40, left: 20 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(...imageSets.map((s) => s.size));
  const barGap = 12;
  const barWidth = (plotWidth - barGap * (imageSets.length - 1)) / imageSets.length;

  ctx.textAlign = "center";
  ctx.font = "14px ui-monospace, monospace";

  imageSets.forEach((s, i) => {
    const x = padding.left + i * (barWidth + barGap);
    const barHeight = maxCount === 0 ? 0 : (s.size / maxCount) * plotHeight;
    const y = padding.top + plotHeight - barHeight;

    const [r, g, b] = stepsRgb(i + 1);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = "#1a1a1a";
    ctx.fillText(String(s.size), x + barWidth / 2, y - 6);
    ctx.fillText(String(i + 1), x + barWidth / 2, padding.top + plotHeight + 20);
  });

  ctx.fillStyle = "#666";
  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("distinct numbers produced at step N", width / 2, 16);
}

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

  const targetLabel = TARGET !== null ? formatDigits(TARGET) : "kernel";
  ctx.fillStyle = "#666";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(
    `steps to reach ${targetLabel} ("stuck" = repdigits)`,
    width / 2,
    16
  );
}
