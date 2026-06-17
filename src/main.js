
const input = document.querySelector("#number-input");
const goButton = document.querySelector("#go-button");
const output = document.querySelector("#steps-output");
const barsCanvas = document.querySelector("#bars-canvas");
const imagesetsCanvas = document.querySelector("#imagesets-canvas");
const stepsDataCanvas = document.querySelector("#steps-data-canvas");
const stepsLabelCanvas = document.querySelector("#steps-label-canvas");
const levelDataCanvas = document.querySelector("#level-data-canvas");
const levelLabelCanvas = document.querySelector("#level-label-canvas");
const levelSlider = document.querySelector("#level-slider");
const levelDisplay = document.querySelector("#level-display");
const numberlineCanvas = document.querySelector("#numberline-canvas");
const cycleButton = document.querySelector("#cycle-button");
const cycleSpeedInput = document.querySelector("#cycle-speed");
const cycleSpeedValue = document.querySelector("#cycle-speed-value");
const tabButtons = document.querySelectorAll(".view-tabs__button");
const digitButtons = document.querySelectorAll(".digit-tabs__button");
const views = {
  steps: document.querySelector("#view-steps"),
  bars: document.querySelector("#view-bars"),
  numberline: document.querySelector("#view-numberline"),
};

let activeView = "steps";
let currentLevel = 1;

// requestAnimationFrame-driven so speed isn't capped by setInterval's timer
// resolution: redraws stay at the browser's frame rate, while the number of
// integer steps taken per frame scales with the chosen speed.
let cycleRafId = null;
let cycleNumber = 0;
let cycleDirection = 1;
let cycleSpeed = Number(cycleSpeedInput.value); // numbers per second
let cycleLastTimestamp = null;
let cycleStepAccumulator = 0;

function levelLabel(level) {
  if (level < 0) return "Numbers never produced by any step";
  return `Numbers produced as step ${level}`;
}

function stopCycle() {
  if (cycleRafId === null) return;
  cancelAnimationFrame(cycleRafId);
  cycleRafId = null;
  cycleButton.textContent = "Cycle";
  cycleButton.classList.remove("is-cycling");
  input.value = String(cycleNumber); // land on the number where cycling stopped
  renderActiveView();
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
    input.value = String(cycleNumber);
    renderNumberLineView(numberlineCanvas, cycleNumber, { showLabels: false });
  }
  cycleRafId = requestAnimationFrame(cycleTick);
}

function startCycle() {
  cycleNumber = currentNumber();
  if (!Number.isInteger(cycleNumber) || cycleNumber < MIN || cycleNumber > MAX) {
    cycleNumber = MIN;
  }
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
    renderImageSetsChart(imagesetsCanvas);
    renderStepsHeatmap(stepsDataCanvas, stepsLabelCanvas, n);
    renderLevelHeatmap(levelDataCanvas, levelLabelCanvas, n, currentLevel);
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

function updateLevelSliderRange() {
  const maxSteps = histogram.length >= 2 ? histogram[histogram.length - 2].steps : 7;
  levelSlider.max = maxSteps;
  if (currentLevel > maxSteps) {
    currentLevel = maxSteps;
    levelSlider.value = String(maxSteps);
  }
  // Always refresh the label — formatDigits(TARGET) changes on digit count switch
  levelDisplay.textContent = levelLabel(currentLevel);
}

function setNumDigits(numDigits) {
  stopCycle();
  rebuildKaprekarData(numDigits);
  rebuildBarsData();
  updateLevelSliderRange();

  input.maxLength = numDigits;
  input.placeholder = TARGET !== null ? formatDigits(TARGET) : "";

  const n = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
  input.value = String(n);

  for (const btn of digitButtons) {
    btn.classList.toggle("is-active", Number(btn.dataset.digits) === numDigits);
  }

  renderActiveView();
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => setActiveView(btn.dataset.view));
});

digitButtons.forEach((btn) => {
  btn.addEventListener("click", () => setNumDigits(Number(btn.dataset.digits)));
});

levelSlider.addEventListener("input", () => {
  // Slider value 0 maps to "never reachable" (level -1); 1..max map directly
  currentLevel = Number(levelSlider.value) === 0 ? -1 : Number(levelSlider.value);
  levelDisplay.textContent = levelLabel(currentLevel);
  if (activeView === "bars") {
    renderLevelHeatmap(levelDataCanvas, levelLabelCanvas, currentNumber(), currentLevel);
  }
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

// Initialize input constraints to match the default digit count (4)
input.maxLength = NUM_DIGITS;
input.placeholder = TARGET !== null ? formatDigits(TARGET) : "";
levelDisplay.textContent = levelLabel(currentLevel);
const initial = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
input.value = String(initial);
setActiveView("steps");
