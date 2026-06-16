
const input = document.querySelector("#number-input");
const goButton = document.querySelector("#go-button");
const output = document.querySelector("#steps-output");
const barsCanvas = document.querySelector("#bars-canvas");
const numberlineCanvas = document.querySelector("#numberline-canvas");
const cycleButton = document.querySelector("#cycle-button");
const cycleSpeedInput = document.querySelector("#cycle-speed");
const cycleSpeedValue = document.querySelector("#cycle-speed-value");
const tabButtons = document.querySelectorAll(".view-tabs__button");
const views = {
  steps: document.querySelector("#view-steps"),
  bars: document.querySelector("#view-bars"),
  numberline: document.querySelector("#view-numberline"),
};

let activeView = "steps";

// requestAnimationFrame-driven so speed isn't capped by setInterval's timer
// resolution: redraws stay at the browser's frame rate, while the number of
// integer steps taken per frame scales with the chosen speed.
let cycleRafId = null;
let cycleNumber = 0;
let cycleDirection = 1;
let cycleSpeed = Number(cycleSpeedInput.value); // numbers per second
let cycleLastTimestamp = null;
let cycleStepAccumulator = 0;

function stopCycle() {
  if (cycleRafId === null) return;
  cancelAnimationFrame(cycleRafId);
  cycleRafId = null;
  cycleButton.textContent = "Cycle";
  cycleButton.classList.remove("is-cycling");
  renderActiveView(); // redraw with labels once stopped
}

function cycleTick(timestamp) {
  if (cycleLastTimestamp === null) cycleLastTimestamp = timestamp;
  const deltaSeconds = (timestamp - cycleLastTimestamp) / 1000;
  cycleLastTimestamp = timestamp;

  cycleStepAccumulator += deltaSeconds * cycleSpeed;
  const steps = Math.floor(cycleStepAccumulator);
  cycleStepAccumulator -= steps;

  for (let s = 0; s < steps; s++) {
    cycleNumber += cycleDirection;
    if (cycleNumber >= MAX) {
      cycleNumber = MAX;
      cycleDirection = -1;
    } else if (cycleNumber <= MIN) {
      cycleNumber = MIN;
      cycleDirection = 1;
    }
  }

  if (steps > 0) {
    renderNumberLineView(numberlineCanvas, cycleNumber, { showLabels: false });
  }
  cycleRafId = requestAnimationFrame(cycleTick);
}

function startCycle() {
  cycleNumber = currentNumber();
  if (!Number.isInteger(cycleNumber) || cycleNumber < MIN || cycleNumber > MAX) {
    cycleNumber = MIN;
  }
  cycleDirection = 1;
  cycleLastTimestamp = null;
  cycleStepAccumulator = 0;
  cycleButton.textContent = "Stop";
  cycleButton.classList.add("is-cycling");
  cycleRafId = requestAnimationFrame(cycleTick);
}

function currentNumber() {
  return Number(input.value);
}

function renderActiveView() {
  const n = currentNumber();
  if (activeView === "steps") {
    renderStepsView(output, n);
  } else if (activeView === "bars") {
    const selectedSteps = Number.isInteger(n) && n >= MIN && n <= MAX ? stepsToTarget[n] : undefined;
    renderBarsView(barsCanvas, selectedSteps);
  } else if (activeView === "numberline") {
    renderNumberLineView(numberlineCanvas, n);
  }
}

function setActiveView(view) {
  if (view !== "numberline") stopCycle();
  activeView = view;
  for (const [name, el] of Object.entries(views)) {
    el.hidden = name !== view;
  }
  for (const btn of tabButtons) {
    btn.classList.toggle("is-active", btn.dataset.view === view);
  }
  renderActiveView();
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => setActiveView(btn.dataset.view));
});

cycleButton.addEventListener("click", () => {
  if (cycleRafId === null) startCycle();
  else stopCycle();
});

cycleSpeedInput.addEventListener("input", () => {
  cycleSpeed = Number(cycleSpeedInput.value);
  cycleSpeedValue.textContent = cycleSpeedInput.value;
});

goButton.addEventListener("click", () => {
  stopCycle();
  renderActiveView();
});
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    stopCycle();
    renderActiveView();
  }
});

const initial = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
input.value = String(initial);
setActiveView("steps");
