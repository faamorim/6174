
function digitParts(n) {
  const d = formatDigits(n).split("");
  const desc = [...d].sort((a, b) => Number(b) - Number(a)).join("");
  const asc = [...d].sort((a, b) => Number(a) - Number(b)).join("");
  return `${desc} - ${asc} = ${formatDigits(step(n))}`;
}

function renderStepsView(container, n) {
  container.innerHTML = "";

  if (!Number.isInteger(n) || n < MIN || n > MAX) {
    const err = document.createElement("p");
    err.className = "steps-output__error";
    err.textContent = `Enter a number between ${MIN} and ${MAX}.`;
    container.appendChild(err);
    return;
  }

  const path = pathToTarget(n);

  for (let i = 0; i < path.length - 1; i++) {
    const line = document.createElement("div");
    line.className = "steps-output__line";
    line.textContent = digitParts(path[i]);
    container.appendChild(line);
  }

  const last = path[path.length - 1];
  const final = document.createElement("div");
  final.className =
    "steps-output__line" + (last === TARGET ? " steps-output__target" : "");
  final.textContent =
    last === TARGET
      ? `Reached ${formatDigits(TARGET)} in ${path.length - 1} step(s).`
      : `${formatDigits(last)} is a dead end (repeats forever).`;
  container.appendChild(final);
}
