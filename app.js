// ===============================
// Mathe Audio Trainer – Logik + Scoreboard
// ===============================

// ===== Firestore Zugriff =====
const { collection, addDoc, serverTimestamp } = window.firestoreHelpers;
const db = window.db;

// ===== Scoreboard-Logik =====
const MIN_TASKS_FOR_SCORE = 10;
let solvedTasks = 0;
let totalTime = 0;

function generateRandomName() {
  const adjectives = [
    "Schneller", "Cleverer", "Schlauer", "Mutiger",
    "Blauer", "Roter", "Starker", "Leiser"
  ];
  const animals = [
    "Fuchs", "Tiger", "Panda", "Wolf",
    "Adler", "Löwe", "Bär", "Delfin"
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];
  const number = Math.floor(Math.random() * 900) + 100;

  return `${adj}${animal}_${number}`;
}

async function saveScore() {
  const avgTime = totalTime / solvedTasks;
  const mode = document.getElementById("mode").value;

  const name =
    localStorage.getItem("playerName") || generateRandomName();

  localStorage.setItem("playerName", name);

  try {
    await addDoc(collection(db, "scores"), {
      name,
      mode,
      avgTime: Number(avgTime.toFixed(2)),
      tasks: solvedTasks,
      createdAt: serverTimestamp()
    });

    console.log("🏆 Score gespeichert");
    alert("🏆 Score gespeichert!");
  } catch (e) {
    console.error("❌ Fehler beim Speichern:", e);
  }
}

function registerSolvedTask(timeInSeconds) {
  solvedTasks++;
  totalTime += timeInSeconds;

  console.log(`🧮 Aufgabe ${solvedTasks}/${MIN_TASKS_FOR_SCORE}`);

  if (solvedTasks >= MIN_TASKS_FOR_SCORE) {
    saveScore();
    solvedTasks = 0;
    totalTime = 0;
  }
}

// ===== Spiel-Logik =====
const modeSelect = document.getElementById("mode");
const rangeSelect = document.getElementById("range");
const answerInput = document.getElementById("answer");
const submitBtn = document.getElementById("submit");
const startBtn = document.getElementById("start");
const repeatBtn = document.getElementById("repeat");
const statusEl = document.getElementById("status");

let a = 0;
let b = 0;
let correctResult = 0;
let startTime = 0;

function random(max) {
  return Math.floor(Math.random() * (max + 1));
}

function nextTask() {
  const range = Number(rangeSelect.value);
  const mode = modeSelect.value;

  a = random(range);
  b = random(range);

  switch (mode) {
    case "add":
      correctResult = a + b;
      speak(`${a} plus ${b}`);
      break;
    case "sub":
      correctResult = a - b;
      speak(`${a} minus ${b}`);
      break;
    case "mul":
      correctResult = a * b;
      speak(`${a} mal ${b}`);
      break;
    case "div":
      b = b === 0 ? 1 : b;
      correctResult = Math.floor(a / b);
      a = correctResult * b;
      speak(`${a} geteilt durch ${b}`);
      break;
    case "addsub":
      if (Math.random() < 0.5) {
        correctResult = a + b;
        speak(`${a} plus ${b}`);
      } else {
        correctResult = a - b;
        speak(`${a} minus ${b}`);
      }
      break;
    case "muldiv":
      if (Math.random() < 0.5) {
        correctResult = a * b;
        speak(`${a} mal ${b}`);
      } else {
        b = b === 0 ? 1 : b;
        correctResult = Math.floor(a / b);
        a = correctResult * b;
        speak(`${a} geteilt durch ${b}`);
      }
      break;
  }

  startTime = performance.now();
  answerInput.value = "";
  answerInput.focus();
}

function checkAnswer() {
  const userAnswer = Number(answerInput.value);
  const timeInSeconds = (performance.now() - startTime) / 1000;

  if (userAnswer === correctResult) {
    statusEl.textContent = "✅ Richtig!";

    // 🔥 GENAU HIER: SCORE ZÄHLT
    registerSolvedTask(timeInSeconds);

    nextTask();
  } else {
    statusEl.textContent = "❌ Falsch";
  }
}

// ===== Sprachausgabe =====
function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

// ===== Events =====
startBtn.addEventListener("click", () => {
  answerInput.disabled = false;
  submitBtn.disabled = false;
  nextTask();
});

submitBtn.addEventListener("click", checkAnswer);

answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkAnswer();
  if (e.key === " ") {
    e.preventDefault();
    speak(`${a} und ${b}`);
  }
});

repeatBtn.addEventListener("click", () => {
  speak(`${a} und ${b}`);
});

console.log("🔥 app.js vollständig geladen");
