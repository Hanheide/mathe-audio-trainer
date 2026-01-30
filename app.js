const el = (id) => document.getElementById(id);

const modeSel = el("mode");
const rangeSel = el("range");
const rate = el("rate");
const rateVal = el("rateVal");

const status = el("status");
const answer = el("answer");
const submit = el("submit");
const startBtn = el("start");
const repeatBtn = el("repeat");

const correctEl = el("correct");
const wrongEl = el("wrong");
const streakEl = el("streak");

const timeEl = el("time");
const avgEl = el("avg");

let current = null;
let correct = 0;
let wrong = 0;
let streak = 0;

/* ⏱️ ZEIT */
let startTime = null;
let timerInterval = null;
let totalTime = 0;
let solvedCount = 0;

/* 🔊 AUDIO-QUEUE (stabil) */
let voicesReady = false;
let isSpeaking = false;
let speakQueue = [];

speechSynthesis.onvoiceschanged = () => {
  voicesReady = true;
};
voicesReady = speechSynthesis.getVoices().length > 0;

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speakQueue.push(text);
  processSpeakQueue();
}

function processSpeakQueue() {
  if (!voicesReady || isSpeaking || speakQueue.length === 0) return;

  const text = speakQueue.shift();
  isSpeaking = true;

  speechSynthesis.cancel();
  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = Number(rate.value);

    u.onend = u.onerror = () => {
      isSpeaking = false;
      processSpeakQueue();
    };

    speechSynthesis.speak(u);
  }, 150);
}

/* 🔢 MATHE */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickMode() {
  const mode = modeSel.value;

  if (mode === "addsub") {
    return Math.random() < 0.5 ? "add" : "sub";
  }

  if (mode === "muldiv") {
    return Math.random() < 0.5 ? "mul" : "div";
  }

  return mode; // add, sub, mul, div
}

function makeTask() {
  const max = Number(rangeSel.value);
  const mode = pickMode();

  if (mode === "add") {
    const a = randInt(0, max);
    const b = randInt(0, max);
    return { text: `${a} plus ${b}`, solution: a + b };
  }

  if (mode === "sub") {
    let a = randInt(0, max);
    let b = randInt(0, max);
    if (b > a) [a, b] = [b, a];
    return { text: `${a} minus ${b}`, solution: a - b };
  }

  if (mode === "mul") {
    const a = randInt(0, max);
    const b = randInt(0, max);
    return { text: `${a} mal ${b}`, solution: a * b };
  }

  // Division ohne Rest
  const b = randInt(1, Math.max(1, Math.floor(max / 2)));
  const q = randInt(0, max);
  const a = b * q;
  return { text: `${a} geteilt durch ${b}`, solution: q };
}

/* ⏱️ TIMER */
function startTimer() {
  startTime = performance.now();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const t = (performance.now() - startTime) / 1000;
    timeEl.textContent = `Zeit: ${t.toFixed(2)} s`;
  }, 100);
}

function stopTimerAndStore() {
  const t = (performance.now() - startTime) / 1000;
  totalTime += t;
  solvedCount++;
  avgEl.textContent = `Ø: ${(totalTime / solvedCount).toFixed(2)} s`;
}

/* ▶️ ABLAUF */
function updateStats() {
  correctEl.textContent = correct;
  wrongEl.textContent = wrong;
  streakEl.textContent = streak;
}

function newRound() {
  current = makeTask();
  answer.value = "";
  answer.focus();
  timeEl.textContent = "Zeit: 0.00 s";
  startTimer();
  speak(current.text);
}

function checkAndContinue() {
  if (!current) return;

  const val = Number(answer.value.replace(",", "."));
  if (!Number.isFinite(val)) {
    speak("Bitte Zahl eingeben.");
    return;
  }

  if (Math.abs(val - current.solution) < 1e-9) {
    correct++;
    streak++;
    stopTimerAndStore();
    speak("Richtig.");
    updateStats();
    setTimeout(newRound, 700);
  } else {
    wrong++;
    streak = 0;
    speak("Falsch.");
    updateStats();
  }
}

/* 🎹 EVENTS */
rate.addEventListener("input", () => {
  rateVal.textContent = rate.value;
});

startBtn.addEventListener("click", () => {
  answer.disabled = false;
  submit.disabled = false;
  repeatBtn.disabled = false;
  newRound();
});

repeatBtn.addEventListener("click", () => {
  if (current) speak(current.text);
});

submit.addEventListener("click", checkAndContinue);

answer.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkAndContinue();
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (current) speak(current.text);
  }
});

updateStats();
