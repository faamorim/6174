
// ─── Helpers ─────────────────────────────────────────────────────────────────

function descAscValues(n) {
  const d = formatDigits(n).split("").map(Number);
  return {
    desc: Number([...d].sort((a, b) => b - a).join("")),
    asc:  Number([...d].sort((a, b) => a - b).join("")),
  };
}

/** Minimum arithmetic distance from n to any cycle member. */
function distToAttractor(n) {
  if (TARGET !== null) return Math.abs(n - TARGET);
  let min = Infinity;
  for (const m of CYCLE_MEMBERS) {
    const d = Math.abs(n - m);
    if (d < min) min = d;
  }
  return min;
}

/**
 * Post-order subtree sizes for the Kaprekar forest rooted at all cycle members.
 * Cycle-to-cycle edges are excluded so the forest has clean trees.
 * sizes[n] = count of nodes in n's subtree (including n itself).
 */
function computeSubtreeSizes() {
  const sizes = new Int32Array(MAX + 1);
  if (CYCLE_MEMBERS.size === 0) return sizes;

  const order = [];
  const stack = [...CYCLE_MEMBERS];
  while (stack.length > 0) {
    const n = stack.pop();
    order.push(n);
    for (const c of children[n]) {
      if (!CYCLE_MEMBERS.has(c)) stack.push(c);
    }
  }
  for (let i = order.length - 1; i >= 0; i--) {
    const n = order[i];
    sizes[n] = 1;
    for (const c of children[n]) {
      if (!CYCLE_MEMBERS.has(c)) sizes[n] += sizes[c];
    }
  }
  return sizes;
}

// ─── Data builder ─────────────────────────────────────────────────────────────

function buildCuriosities() {
  const attractorLabel = TARGET !== null ? formatDigits(TARGET) : "the cycle";

  let maxSteps = 0;
  for (let n = MIN; n <= MAX; n++) {
    if (stepsToTarget[n] > maxSteps) maxSteps = stepsToTarget[n];
  }

  // 1. Closest to attractor needing max steps
  let closestMaxN = null, closestDist = Infinity;
  for (let n = MIN; n <= MAX; n++) {
    if (stepsToTarget[n] === maxSteps) {
      const d = distToAttractor(n);
      if (d < closestDist) { closestDist = d; closestMaxN = n; }
    }
  }

  // 2. Farthest needing only 1 step
  let farthestOneN = null, farthestDist = 0;
  for (let n = MIN; n <= MAX; n++) {
    if (stepsToTarget[n] === 1) {
      const d = distToAttractor(n);
      if (d > farthestDist) { farthestDist = d; farthestOneN = n; }
    }
  }

  // 3. Biggest single leap (valid numbers only)
  let bigLeapN = null, bigLeapDist = 0;
  for (let n = MIN; n <= MAX; n++) {
    if (stepsToTarget[n] > 0) {
      const d = Math.abs(nextStep[n] - n);
      if (d > bigLeapDist) { bigLeapDist = d; bigLeapN = n; }
    }
  }

  // 1b. For multi-cycle: also closest to its OWN cycle (the one it actually enters)
  let closestToOwnN = null, closestToOwnDist = Infinity;
  if (TARGET === null) {
    for (let n = MIN; n <= MAX; n++) {
      if (stepsToTarget[n] === maxSteps) {
        const path = pathToTarget(n);
        const entry = path[path.length - 1];
        if (!CYCLE_MEMBERS.has(entry)) continue;
        const ownCycle = CYCLE_OF.get(entry);
        let d = Infinity;
        for (const m of ownCycle) d = Math.min(d, Math.abs(n - m));
        if (d < closestToOwnDist) { closestToOwnDist = d; closestToOwnN = n; }
      }
    }
  }

  // 4. Longest path by total arithmetic distance
  let longPathN = null, longPathTotal = 0;
  for (let n = MIN; n <= MAX; n++) {
    if (stepsToTarget[n] > 0) {
      const path = pathToTarget(n);
      let total = 0;
      for (let i = 0; i < path.length - 1; i++) total += Math.abs(path[i + 1] - path[i]);
      if (total > longPathTotal) { longPathTotal = total; longPathN = n; }
    }
  }
  const longPath = longPathN !== null ? pathToTarget(longPathN) : [];
  const longPathLines = [];
  for (let i = 0; i < longPath.length - 1; i++) {
    const d = Math.abs(longPath[i + 1] - longPath[i]);
    longPathLines.push(`${formatDigits(longPath[i])} → ${formatDigits(longPath[i + 1])}  +${d}`);
  }
  if (longPathLines.length) longPathLines.push(`Total distance: ${longPathTotal}`);

  // 6. Most direct predecessors (excluding all cycle members)
  let mostPredsN = null, mostPredsCount = 0;
  for (let n = MIN; n <= MAX; n++) {
    if (!CYCLE_MEMBERS.has(n) && children[n].length > mostPredsCount) {
      mostPredsCount = children[n].length; mostPredsN = n;
    }
  }

  // 7. Most-visited waypoint — largest subtree, excluding all cycle members
  const subtreeSizes = computeSubtreeSizes();
  let mostVisitedN = null, mostVisitedCount = 0;
  for (let n = MIN; n <= MAX; n++) {
    if (!CYCLE_MEMBERS.has(n) && stepsToTarget[n] > 0 && subtreeSizes[n] > mostVisitedCount) {
      mostVisitedCount = subtreeSizes[n]; mostVisitedN = n;
    }
  }

  // 8. Average & mode steps
  let totalSteps = 0, totalCount = 0;
  const stepFreq = new Map();
  for (let n = MIN; n <= MAX; n++) {
    if (stepsToTarget[n] > 0) {
      totalSteps += stepsToTarget[n]; totalCount++;
      stepFreq.set(stepsToTarget[n], (stepFreq.get(stepsToTarget[n]) ?? 0) + 1);
    }
  }
  const avgSteps = totalCount > 0 ? totalSteps / totalCount : 0;
  let modeSteps = 0, modeCount = 0;
  for (const [s, c] of stepFreq) {
    if (c > modeCount) { modeCount = c; modeSteps = s; }
  }

  // Arithmetic one-liner helper: "AAAA − BBBB = CCCC"
  function arith(n) {
    const { desc, asc } = descAscValues(n);
    return `${formatDigits(desc)} − ${formatDigits(asc)} = ${formatDigits(nextStep[n])}`;
  }

  // ── Assemble items ──────────────────────────────────────────────────────────

  const items = [];

  // Multi-cycle digit counts: info card showing all cycles
  if (TARGET === null) {
    const cycleList = CYCLES.map(c => c.map(formatDigits).join(" → ") + " → …").join("\n\n");
    items.push({
      title: `${CYCLES.length} attractor cycle${CYCLES.length !== 1 ? "s" : ""}`,
      tagline: `${NUM_DIGITS}-digit numbers converge to ${CYCLES.length} distinct cycles instead of a single fixed point.`,
      info: "Some digit counts have no Kaprekar kernel. Instead, all valid numbers converge to a repeating cycle of multiple values — which cycle depends on the starting number.",
      detail: cycleList,
      detailLabel: `Show all cycles`,
      numbers: [], extraNumbers: [], view: "steps",
    });
  }

  const closestLabel = TARGET !== null ? formatDigits(TARGET) : "any cycle";

  if (closestMaxN !== null) items.push({
    title: `Closest to ${closestLabel}, longest journey`,
    tagline: `${formatDigits(closestMaxN)} is only ${closestDist} away yet takes all ${maxSteps} steps.`,
    info: "Arithmetic distance from the attractor and the number of Kaprekar steps needed are completely unrelated — digit arrangement is all that matters.",
    detail: `${formatDigits(closestMaxN)} sits just ${closestDist} from ${closestLabel} numerically, yet its digit arrangement forces the full ${maxSteps}-step journey.`,
    detailLabel: "Why this number?",
    numbers: [closestMaxN], extraNumbers: [], view: "numberline",
  });

  if (TARGET === null && closestToOwnN !== null && closestToOwnN !== closestMaxN) items.push({
    title: "Closest to its own cycle, longest journey",
    tagline: `${formatDigits(closestToOwnN)} is only ${closestToOwnDist} from the cycle it enters, yet takes all ${maxSteps} steps.`,
    info: "Even when a number is close to the cycle it will eventually enter, digit arrangement alone determines how many steps the journey takes.",
    detail: `${formatDigits(closestToOwnN)} ends up only ${closestToOwnDist} from its own attractor cycle, yet its digit arrangement forces the full ${maxSteps}-step journey.`,
    detailLabel: "Why this number?",
    numbers: [closestToOwnN], extraNumbers: [], view: "numberline",
  });

  if (farthestOneN !== null) items.push({
    title: "Farthest away, yet one step",
    tagline: `${formatDigits(farthestOneN)} is ${farthestDist} away from ${attractorLabel} but reaches it in one step.`,
    info: "A number far from the attractor numerically can still reach a cycle member in a single step if its digit arrangement directly produces one.",
    detail: `${arith(farthestOneN)}\nDistance from attractor: ${farthestDist}`,
    detailLabel: "Show arithmetic",
    numbers: [farthestOneN], extraNumbers: [], view: "numberline",
  });

  if (bigLeapN !== null) items.push({
    title: "Biggest single leap",
    tagline: `${formatDigits(bigLeapN)} → ${formatDigits(nextStep[bigLeapN])}: a leap of ${bigLeapDist}.`,
    info: "The largest arithmetic gap between a number and its immediate Kaprekar result. Big leaps happen when digit spread is extreme.",
    detail: `${arith(bigLeapN)}\nLeap: |${formatDigits(nextStep[bigLeapN])} − ${formatDigits(bigLeapN)}| = ${bigLeapDist}`,
    detailLabel: "Show arithmetic",
    numbers: [bigLeapN], extraNumbers: [], view: "numberline",
  });

  if (longPathN !== null) items.push({
    title: "Longest journey by distance",
    tagline: `${formatDigits(longPathN)} covers ${longPathTotal} arithmetic distance across ${stepsToTarget[longPathN]} steps.`,
    info: "Total arithmetic distance traveled — the sum of all step-by-step jumps. More steps doesn't always mean more total distance covered.",
    detail: longPathLines.join("\n"),
    detailLabel: "Show full path",
    numbers: [longPathN], extraNumbers: [], view: "numberline",
  });

  if (mostPredsN !== null) items.push({
    title: "Most direct predecessors",
    tagline: `${formatDigits(mostPredsN)} has ${mostPredsCount} numbers that map directly to it in one step.`,
    info: "Fan-in in the Kaprekar graph: how many distinct numbers produce this value after exactly one step. High fan-in means many paths converge here immediately.",
    // TODO: redirect to graph view once available — fan-in is most visible as a node in the tree
    detail: `${mostPredsCount} numbers lead directly to ${formatDigits(mostPredsN)} in one Kaprekar step:`,
    detailLabel: `See all ${mostPredsCount} predecessors`,
    numbers: [mostPredsN],
    extraNumbers: [...children[mostPredsN]].sort((a, b) => a - b),
    view: "numberline", extraView: "numberline",
  });

  if (mostVisitedN !== null) items.push({
    title: "Most-visited waypoint",
    tagline: `${formatDigits(mostVisitedN)} appears in ${mostVisitedCount} different paths to ${attractorLabel}.`,
    info: "Subtree size in the Kaprekar forest (excluding cycle members themselves): how many starting numbers eventually pass through this node at any step.",
    // TODO: redirect to graph view once available — subtree size is most visible in the tree diagram
    detail: `${mostVisitedCount} starting numbers pass through ${formatDigits(mostVisitedN)} at some step.\nIt has ${children[mostVisitedN].length} direct predecessor(s) and sits ${stepsToTarget[mostVisitedN]} step(s) from ${attractorLabel}.`,
    detailLabel: "Why this number?",
    numbers: [mostVisitedN], extraNumbers: [], view: "numberline",
  });

  // Per-step breakdown for the stats detail
  const stepBreakdown = [];
  for (let s = 1; s <= maxSteps; s++) {
    const count = stepFreq.get(s) ?? 0;
    const pct = totalCount > 0 ? (count / totalCount * 100).toFixed(1) : "0.0";
    stepBreakdown.push(`${s} step${s === 1 ? " " : "s"}: ${count.toLocaleString()} numbers (${pct}%)`);
  }

  items.push({
    title: "Step count statistics",
    tagline: `Mean: ${avgSteps.toFixed(2)} steps  ·  Mode: ${modeSteps} step(s) (${modeCount.toLocaleString()} numbers)`,
    info: "Summary statistics across all valid starting numbers — repdigits are excluded as they never converge.",
    detail: `${totalCount.toLocaleString()} valid starting numbers\n\n${stepBreakdown.join("\n")}`,
    detailLabel: "Show full breakdown",
    numbers: [], extraNumbers: [], view: "steps",
  });

  return items;
}

let curiosities = buildCuriosities();

function rebuildCuriositiesData() {
  curiosities = buildCuriosities();
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

function renderCuriositiesView(container, onNumberClick) {
  container.innerHTML = "";

  for (const c of curiosities) {
    const card = document.createElement("div");
    card.className = "curiosity-card";

    // ── Header: title + ⓘ toggle ──
    const header = document.createElement("div");
    header.className = "curiosity-header";

    const titleEl = document.createElement("h3");
    titleEl.className = "curiosity-title";
    titleEl.textContent = c.title;
    header.appendChild(titleEl);

    const infoBtn = document.createElement("button");
    infoBtn.className = "curiosity-info-btn";
    infoBtn.textContent = "ⓘ";
    infoBtn.title = "What does this mean?";
    header.appendChild(infoBtn);
    card.appendChild(header);

    // ── Info panel (hidden until ⓘ clicked) ──
    const infoPanel = document.createElement("p");
    infoPanel.className = "curiosity-info";
    infoPanel.textContent = c.info;
    infoPanel.hidden = true;
    card.appendChild(infoPanel);
    infoBtn.addEventListener("click", () => {
      infoPanel.hidden = !infoPanel.hidden;
      infoBtn.classList.toggle("is-active", !infoPanel.hidden);
    });

    // ── Tagline ──
    const tagline = document.createElement("p");
    tagline.className = "curiosity-tagline";
    tagline.textContent = c.tagline;
    card.appendChild(tagline);

    // ── Main number button(s) ──
    if (c.numbers.length > 0) {
      const row = document.createElement("div");
      row.className = "curiosity-numbers";
      for (const n of c.numbers) {
        const btn = document.createElement("button");
        btn.className = "curiosity-number-btn";
        btn.textContent = formatDigits(n);
        btn.addEventListener("click", () => onNumberClick(n, c.view));
        row.appendChild(btn);
      }
      card.appendChild(row);
    }

    // ── Expandable details ──
    if (c.detail || c.extraNumbers.length > 0) {
      const details = document.createElement("details");
      details.className = "curiosity-details";

      const summary = document.createElement("summary");
      summary.className = "curiosity-details-summary";
      summary.textContent = c.detailLabel || "Details";
      details.appendChild(summary);

      if (c.detail) {
        const body = document.createElement("p");
        body.className = "curiosity-detail-body";
        body.textContent = c.detail;
        details.appendChild(body);
      }

      if (c.extraNumbers.length > 0) {
        const extraRow = document.createElement("div");
        extraRow.className = "curiosity-numbers curiosity-extra-numbers";
        const ev = c.extraView || c.view;
        for (const n of c.extraNumbers) {
          const btn = document.createElement("button");
          btn.className = "curiosity-number-btn";
          btn.textContent = formatDigits(n);
          btn.addEventListener("click", () => onNumberClick(n, ev));
          extraRow.appendChild(btn);
        }
        details.appendChild(extraRow);
      }

      card.appendChild(details);
    }

    container.appendChild(card);
  }
}
