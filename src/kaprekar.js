const MIN = 0;
const MAX = 9999;
const TARGET = 6174;

function digits(n) {
  return n.toString().padStart(4, "0").split("").map(Number);
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

/**
 * nextStep[n] = result of applying one Kaprekar step to n.
 * Repdigits (1111, 2222, ...) naturally map to 0000 since their
 * descending and ascending digit-sorts are identical; 0000 is a
 * fixed point (0000 -> 0000), so both end up in a dead-end loop.
 */
const nextStep = (() => {
  const arr = new Int32Array(MAX + 1);
  for (let n = MIN; n <= MAX; n++) {
    arr[n] = step(n);
  }
  return arr;
})();

/**
 * stepsToTarget[n] = number of steps to reach TARGET, or -1 if n
 * never reaches it (the 11 repdigits, which loop on themselves).
 */
const stepsToTarget = (() => {
  const arr = new Int32Array(MAX + 1).fill(-2); // -2 = unvisited
  arr[TARGET] = 0;

  for (let n = MIN; n <= MAX; n++) {
    if (arr[n] !== -2) continue;

    const path = [];
    let cur = n;
    while (arr[cur] === -2 && !path.includes(cur)) {
      path.push(cur);
      cur = nextStep[cur];
    }

    const resolved = arr[cur] === -2 ? -1 : arr[cur]; // cur is a repdigit loop if still -2
    let dist = resolved === -1 ? -1 : resolved;
    for (let i = path.length - 1; i >= 0; i--) {
      dist = dist === -1 ? -1 : dist + 1;
      arr[path[i]] = dist;
    }
  }
  return arr;
})();

/** children[n] = all numbers whose next step is n. */
const children = (() => {
  const arr = Array.from({ length: MAX + 1 }, () => []);
  for (let n = MIN; n <= MAX; n++) {
    if (nextStep[n] !== n) arr[nextStep[n]].push(n);
  }
  return arr;
})();

/** Full sequence of numbers from n down to TARGET (inclusive), or just [n] if n is a repdigit. */
function pathToTarget(n) {
  const path = [n];
  let cur = n;
  while (cur !== TARGET && nextStep[cur] !== cur) {
    cur = nextStep[cur];
    path.push(cur);
  }
  return path;
}

function formatDigits(n) {
  return n.toString().padStart(4, "0");
}
