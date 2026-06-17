let NUM_DIGITS = 4;
let MIN = 0;
let MAX = 9999;
let TARGET = 6174;

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

  // Auto-discover TARGET: the unique fixed point that isn't a repdigit
  // (e.g. 495 for 3-digit, 6174 for 4-digit). Null if none exists (e.g. 5-digit).
  TARGET = null;
  for (let n = 1; n <= MAX; n++) {
    if (nextStep[n] === n) {
      const s = formatDigits(n);
      if (!s.split("").every((c) => c === s[0])) {
        TARGET = n;
        break;
      }
    }
  }

  stepsToTarget = new Int32Array(MAX + 1).fill(-2); // -2 = unvisited
  if (TARGET !== null) stepsToTarget[TARGET] = 0;

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

/** Full sequence from n to TARGET (inclusive), or to the fixed-point dead end. */
function pathToTarget(n) {
  const path = [n];
  let cur = n;
  while (cur !== TARGET && nextStep[cur] !== cur) {
    cur = nextStep[cur];
    path.push(cur);
    if (path.length > MAX + 2) break; // safety for digit counts with cycles
  }
  return path;
}

rebuildKaprekarData(4);
