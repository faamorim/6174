
const input = document.querySelector("#number-input");
const goButton = document.querySelector("#go-button");
const output = document.querySelector("#steps-output");
const barsCanvas = document.querySelector("#bars-canvas");
const numberlineCanvas = document.querySelector("#numberline-canvas");
const tabButtons = document.querySelectorAll(".view-tabs__button");
const views = {
  steps: document.querySelector("#view-steps"),
  bars: document.querySelector("#view-bars"),
  numberline: document.querySelector("#view-numberline"),
};

let activeView = "steps";

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

goButton.addEventListener("click", renderActiveView);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") renderActiveView();
});

const initial = Math.floor(Math.random() * (MAX - MIN + 1)) + MIN;
input.value = String(initial);
setActiveView("steps");
