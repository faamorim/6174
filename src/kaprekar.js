
let NUM_DIGITS = 4;
let MIN = 0;
let MAX = 9999;
let TARGET = 6174;
let CYCLES = [];
let CYCLE_MEMBERS = new Set();
let CYCLE_OF = new Map();

function digits(n) {
  return n.toString().padStart(NUM_DIGITS, "0").split("").map(Number);
}

function fromDigits(d) {
  return Number(d.join(""));
}

/** One Kaprekar step: descending digits minus ascending digits. */
function step(n) {
  const d = digits(n);
  const desc = fromDigits([...d].sort((a, b) => b - a));
  const asc = fromDigits([...d].sort((a, b) => a - b));
  return desc - asc;
}

function formatDigits(n) {
  return n.toString().padStart(NUM_DIGITS, "0");
}

let nextStep;
let stepsToTarget;
let children;

function rebuildKaprekarData(numDigits) {
  NUM_DIGITS = numDigits;
  MIN = 0;
  MAX = 10 ** numDigits - 1;

  nextStep = new Int32Array(MAX + 1);
  for (let n = MIN; n <= MAX; n++) {
    nextStep[n] = step(n);
  }

  // Detect all attractor cycles; exclude repdigit-only cycles (e.g. {0000}).
  CYCLES = [];
  CYCLE_MEMBERS = new Set();
  CYCLE_OF = new Map();

  const state = new Uint8Array(MAX + 1); // 0=unvisited, 1=in-walk, 2=resolved
  for (let n = MIN; n <= MAX; n++) {
    if (state[n] === 2) continue;
    const chain = [];
    const posInChain = new Map();
    let cur = n;
    while (state[cur] === 0) {
      state[cur] = 1;
      posInChain.set(cur, chain.length);
      chain.push(cur);
      cur = nextStep[cur];
    }
    if (state[cur] === 1 && posInChain.has(cur)) {
      const cycle = chain.slice(posInChain.get(cur));
      const allRepdigits = cycle.every(m => {
        const s = formatDigits(m);
        return s.split("").every(c => c === s[0]);
      });
      if (!allRepdigits) {
        CYCLES.push(cycle);
        for (const m of cycle) {
          CYCLE_MEMBERS.add(m);
          CYCLE_OF.set(m, cycle);
        }
      }
    }
    for (const m of chain) state[m] = 2;
  }

  // TARGET: single fixed point if exactly one 1-element cycle, null otherwise.
  TARGET = (CYCLES.length === 1 && CYCLES[0].length === 1) ? CYCLES[0][0] : null;

  // stepsToTarget: 0 for all cycle members, -1 for dead ends, else step count.
  stepsToTarget = new Int32Array(MAX + 1).fill(-2); // -2 = unvisited
  for (const m of CYCLE_MEMBERS) stepsToTarget[m] = 0;

  for (let n = MIN; n <= MAX; n++) {
    if (stepsToTarget[n] !== -2) continue;
    const path = [];
    let cur = n;
    while (stepsToTarget[cur] === -2 && !path.includes(cur)) {
      path.push(cur);
      cur = nextStep[cur];
    }
    const resolved = stepsToTarget[cur] === -2 ? -1 : stepsToTarget[cur];
    let dist = resolved;
    for (let i = path.length - 1; i >= 0; i--) {
      dist = dist === -1 ? -1 : dist + 1;
      stepsToTarget[path[i]] = dist;
    }
  }

  children = Array.from({ length: MAX + 1 }, () => []);
  for (let n = MIN; n <= MAX; n++) {
    if (nextStep[n] !== n) children[nextStep[n]].push(n);
  }
}

/** Path from n to its attractor cycle entry point (inclusive). */
function pathToTarget(n) {
  const path = [n];
  const seen = new Set([n]);
  let cur = n;
  while (!CYCLE_MEMBERS.has(cur)) {
    cur = nextStep[cur];
    if (seen.has(cur)) break; // repdigit dead-end loop
    seen.add(cur);
    path.push(cur);
    if (path.length > 1000) break; // safety
  }
  return path;
}

rebuildKaprekarData(4);
