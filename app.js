// ===============================
// Mathe Audio Trainer (FINAL)
// - Alte Funktionen bleiben
// - + Firebase Scoreboard (nach 10 richtigen Aufgaben)
// - + Bestenliste pro Modus
// ===============================

const el = (id) => document.getElementById(id);

const modeSel = el("mode");
const rangeSel = el("range");
const rate = el("rate");
const rateVal = el("rateVal");

const statusEl = el("status");
const answer = el("answer");
const submit = el("submit");
const startBtn = el("start");
const repeatBtn = el("repeat");

const correctEl = el("correct");
const wrongEl = el("wrong");
const streakEl = el("streak");

const timeEl = el("time");
const avgEl = el("avg");

const lbModeEl = el("lb-mode");
const lbListEl = el("leaderboard-list");

// ===== Game state
let current = null;
let correct = 0;
let wrong = 0;
let streak = 0;

// Timer
let startTime = null;
let timerInterval = null;

// Durchschnitt über ALLE richtigen Aufgaben (wie vorher)
let totalSolvedTime = 0;
let totalSolvedCount = 0;

// Scoreboard-Session (nur für Firestore: nach 10 richtigen Aufgaben)
const MIN_TASKS_FOR_SCORE = 10;
let sessionSolvedCount = 0;
let sessionSolvedTime = 0;

// Audio robust
let voicesReady = false;
let isSpeaking = false;
let speakQueue = [];

// ===============================
// Utils
// ===============================
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateStats() {
  correctEl.textContent = String(correct);
  wrongEl.textContent = String(wrong);
  streakEl.textContent = String(streak);
}

function resetTimeUI() {
  timeEl.textContent = "Zeit: 0.00 s";
}

function startTimer() {
  startTime = performance.now();
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const t = (performance.now() - startTime) / 1000;
    timeEl.textContent = `Zeit: ${t.toFixed(2)} s`;
  }, 100);
}

function getElapsedSeconds() {
  return (performance.now() - startTime) / 1000;
}

// ===============================
// Audio (robust queue)
// ===============================
function initVoices() {
  const v = speechSynthesis.getVoices();
  if (v && v.length > 0) voicesReady = true;
}
speechSynthesis.onvoiceschanged = () => { voicesReady = true; };
initVoices();

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  speakQueue.push(text);
  processSpeakQueue();
}

function processSpeakQueue() {
  if (!voicesReady) return;
  if (isSpeaking) return;
  if (speakQueue.length === 0) return;

  const text = speakQueue.shift();
  isSpeaking = true;

  speechSynthesis.cancel();

  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = Number(rate.value);

    u.onend = () => {
      isSpeaking = false;
      processSpeakQueue();
    };
    u.onerror = () => {
      isSpeaking = false;
      processSpeakQueue();
    };

    speechSynthesis.speak(u);
  }, 150);
}

// ===============================
// Aufgaben-Generator
// ===============================
function pickMode() {
  const m = modeSel.value;
  if (m === "addsub") return Math.random() < 0.5 ? "add" : "sub";
  if (m === "muldiv") return Math.random() < 0.5 ? "mul" : "div";
  return m; // add/sub/mul/div
}

function makeTask() {
  const max = Number(rangeSel.value);
  const mode = pickMode();

  if (mode === "add") {
    const a = randInt(0, max);
    const b = randInt(0, max);
    return { mode, text: `${a} plus ${b}`, solution: a + b };
  }

  if (mode === "sub") {
    let a = randInt(0, max);
    let b = randInt(0, max);
    if (b > a) [a, b] = [b, a]; // keine negativen Ergebnisse
    return { mode, text: `${a} minus ${b}`, solution: a - b };
  }

  if (mode === "mul") {
    const a = randInt(0, max);
    const b = randInt(0, max);
    return { mode, text: `${a} mal ${b}`, solution: a * b };
  }

  // div ohne Rest
  const b = randInt(1, Math.max(1, Math.floor(max / 2)));
  const q = randInt(0, max);
  const a = b * q;
  return { mode, text: `${a} geteilt durch ${b}`, solution: q };
}

function newRound() {
  current = makeTask();
  statusEl.textContent = "Höre zu …";
  answer.value = "";
  answer.focus();

  resetTimeUI();
  startTimer();
  speak(current.text);
}

// ===============================
// Firebase helpers (Warten bis bereit)
// ===============================
function waitForFirebaseReady(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t0 = performance.now();
    const tick = () => {
      if (window.db && window.fs) return resolve();
      if (performance.now() - t0 > timeoutMs) return reject(new Error("Firebase nicht bereit"));
      setTimeout(tick, 50);
    };
    tick();
  });
}

// Zufallsname (einmal pro Browser)
function getPlayerName() {
  const existing = localStorage.getItem("playerName");
  if (existing) return existing;

  const adjectives = ["Schneller", "Cleverer", "Schlauer", "Mutiger", "Starker", "Leiser", "Blauer", "Roter"];
  const animals = ["Fuchs", "Tiger", "Panda", "Wolf", "Adler", "Löwe", "Bär", "Delfin"];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const ani = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 900) + 100;

  const name = `${adj}${ani}_${num}`;
  localStorage.setItem("playerName", name);
  return name;
}

async function saveScoreIfReady() {
  // Speichern nur, wenn Firebase da ist
  if (!window.db || !window.fs) return;

  const avgTime = sessionSolvedTime / sessionSolvedCount;
  const mode = modeSel.value;
  const name = getPlayerName();

  try {
    await window.fs.addDoc(window.fs.collection(window.db, "scores"), {
      name,
      mode,
      avgTime: Number(avgTime.toFixed(2)),
      tasks: sessionSolvedCount,
      createdAt: window.fs.serverTimestamp()
    });
    // Session reset
    sessionSolvedCount = 0;
    sessionSolvedTime = 0;

    // Bestenliste neu laden
    await loadLeaderboard();
  } catch (e) {
    console.error("❌ Score speichern fehlgeschlagen:", e);
  }
}

// Bestenliste: OHNE where+orderBy (sonst Composite-Index nötig).
// Wir holen z.B. Top 200 nach avgTime und filtern clientseitig nach Mode.
async function loadLeaderboard() {
  lbModeEl.textContent = `Modus: ${modeSel.value}`;
  lbListEl.innerHTML = "<li>Lade …</li>";

  if (!window.db || !window.fs) {
    lbListEl.innerHTML = "<li>Firebase nicht bereit</li>";
    return;
  }

  try {
    const q = window.fs.query(
      window.fs.collection(window.db, "scores"),
      window.fs.orderBy("avgTime"),
      window.fs.limit(200)
    );

    const snap = await window.fs.getDocs(q);

    const wantedMode = modeSel.value;
    const items = [];
    snap.forEach((doc) => {
      const d = doc.data();
      if (d && d.mode === wantedMode) items.push(d);
    });

    const top = items.slice(0, 10);

    if (top.length === 0) {
      lbListEl.innerHTML = "<li>Noch keine Einträge</li>";
      return;
    }

    lbListEl.innerHTML = "";
    top.forEach((d, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx + 1}. ${d.name} – Ø ${Number(d.avgTime).toFixed(2)} s (${d.tasks})`;
      lbListEl.appendChild(li);
    });
  } catch (e) {
    console.error("❌ Bestenliste Fehler:", e);
    lbListEl.innerHTML = "<li>Fehler beim Laden</li>";
  }
}

// ===============================
// Check answer
// ===============================
function checkAndContinue() {
  if (!current) return;

  const val = Number(String(answer.value).replace(",", "."));
  if (!Number.isFinite(val)) {
    speak("Bitte Zahl eingeben.");
    return;
  }

  if (Math.abs(val - current.solution) < 1e-9) {
    // richtig
    correct++;
    streak++;

    const t = getElapsedSeconds();

    // global average (wie vorher)
    totalSolvedTime += t;
    totalSolvedCount++;
    avgEl.textContent = `Ø: ${(totalSolvedTime / totalSolvedCount).toFixed(2)} s`;

    // scoreboard session
    sessionSolvedTime += t;
    sessionSolvedCount++;

    updateStats();

    speak("Richtig.");

    if (sessionSolvedCount >= MIN_TASKS_FOR_SCORE) {
      // Speichere Score und starte danach neue Aufgabe
      saveScoreIfReady().finally(() => {
        setTimeout(newRound, 650);
      });
    } else {
      setTimeout(newRound, 650);
    }
  } else {
    // falsch
    wrong++;
    streak = 0;
    updateStats();
    speak("Falsch. Versuch es nochmal.");
  }
}

// ===============================
// Events + Init
// ===============================
rate.addEventListener("input", () => {
  rateVal.textContent = rate.value;
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

repeatBtn.addEventListener("click", () => {
  if (current) speak(current.text);
});

startBtn.addEventListener("click", async () => {
  // UI aktivieren
  answer.disabled = false;
  submit.disabled = false;
  repeatBtn.disabled = false;

  // Audio-Policy: erster User-Klick ist da → gut
  // Firebase kann minimal später kommen → wir warten kurz und laden dann LB
  try {
    await waitForFirebaseReady();
    await loadLeaderboard();
  } catch {
    // auch ohne Firebase soll das Spiel starten
    console.warn("⚠️ Firebase nicht rechtzeitig bereit – Spiel startet trotzdem.");
  }

  newRound();
});

// Moduswechsel: Bestenliste updaten
modeSel.addEventListener("change", () => {
  loadLeaderboard();
});

// Initial UI
updateStats();
avgEl.textContent = "Ø: 0.00 s";
rateVal.textContent = rate.value;
lbModeEl.textContent = `Modus: ${modeSel.value}`;
console.log("🚀 App bereit");
