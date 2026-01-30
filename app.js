// ===============================
// Mathe Audio Trainer (MOBILE-FIX + Bestenliste)
// - iOS/Android: Speech muss bei User-Gesture starten (kein setTimeout beim ersten Speak)
// - voicesReady darf nicht blockieren
// - Rest: wie vorher (Timer, Enter/Space, Firestore-LB nach 10 richtigen)
// ===============================

const $ = (id) => document.getElementById(id);

const modeSel = $("mode");
const rangeSel = $("range");
const rate = $("rate");
const rateVal = $("rateVal");

const statusEl = $("status");
const answerEl = $("answer");
const submitBtn = $("submit");
const startBtn = $("start");
const repeatBtn = $("repeat");

const correctEl = $("correct");
const wrongEl = $("wrong");
const streakEl = $("streak");

const timeEl = $("time");
const avgEl = $("avg");

const lbModeEl = $("lb-mode");
const lbListEl = $("leaderboard-list");
const lbErrEl = $("lb-error");

// -------- Stats
let correct = 0;
let wrong = 0;
let streak = 0;

// -------- Timing
let startTime = 0;
let rafId = 0;

// -------- Durchschnitt (über alle richtigen Antworten)
let totalSolvedTime = 0;
let totalSolvedCount = 0;

// -------- Scoreboard Session (nach 10 richtigen Aufgaben)
const MIN_TASKS_FOR_SCORE = 10;
let sessionSolvedTime = 0;
let sessionSolvedCount = 0;

// -------- Current Task
let currentTask = null;

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

function setAvgUI() {
  const avg = totalSolvedCount ? (totalSolvedTime / totalSolvedCount) : 0;
  avgEl.textContent = `Ø: ${avg.toFixed(2)} s`;
}

function setTimeUI(sec) {
  timeEl.textContent = `Zeit: ${sec.toFixed(2)} s`;
}

function stopTimer() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

function startTimer() {
  stopTimer();
  startTime = performance.now();

  const loop = () => {
    const sec = (performance.now() - startTime) / 1000;
    setTimeUI(sec);
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
}

function elapsedSeconds() {
  return (performance.now() - startTime) / 1000;
}

// ===============================
// Audio (MOBILE-SAFE)
// ===============================
let audioUnlocked = false;
let voicesReady = false;
let speaking = false;
const speakQueue = [];

// versuche Stimmen zu laden (mobile manchmal erst nach Interaktion)
function refreshVoices() {
  try {
    const v = speechSynthesis.getVoices();
    if (v && v.length > 0) voicesReady = true;
  } catch {}
}
speechSynthesis.onvoiceschanged = () => {
  voicesReady = true;
};

refreshVoices();

/**
 * Muss im Start-Klick aufgerufen werden:
 * - erzeugt einen "Gesture-gebundenen" Speak (leer)
 * - markiert audioUnlocked
 * - refresht Voices
 */
function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.lang = "de-DE";
    u.rate = Number(rate.value);
    // Direkt im Klick ausführen (wichtig!)
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    // optional sofort stoppen – reicht trotzdem zum Unlock
    speechSynthesis.cancel();
  } catch {}
  audioUnlocked = true;
  refreshVoices();
}

// Sofort sprechen (ohne Queue + ohne setTimeout) – wichtig für erste Aufgabe auf Handy
function speakNow(text) {
  if (!("speechSynthesis" in window)) return;
  refreshVoices();
  try {
    speaking = true;
    speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = Number(rate.value);

    u.onend = () => { speaking = false; processSpeakQueue(); };
    u.onerror = () => { speaking = false; processSpeakQueue(); };

    speechSynthesis.speak(u);
  } catch {
    speaking = false;
  }
}

// Queue-Speak (mit kleinem Delay, aber NUR nach Unlock ok)
function speak(text) {
  if (!("speechSynthesis" in window)) return;
  refreshVoices();
  speakQueue.push(text);
  processSpeakQueue();
}

function processSpeakQueue() {
  // NICHT mehr blockieren, wenn voicesReady false – mobile ist unzuverlässig
  if (speaking) return;

  const text = speakQueue.shift();
  if (!text) return;

  speaking = true;
  try {
    speechSynthesis.cancel();

    const doSpeak = () => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "de-DE";
      u.rate = Number(rate.value);

      u.onend = () => { speaking = false; processSpeakQueue(); };
      u.onerror = () => { speaking = false; processSpeakQueue(); };

      speechSynthesis.speak(u);
    };

    // Delay nur wenn Audio schon unlocked ist (sonst kann iOS blocken)
    if (audioUnlocked) {
      setTimeout(doSpeak, 120);
    } else {
      // Falls irgendwo doch vor Unlock aufgerufen: sofort
      doSpeak();
    }
  } catch {
    speaking = false;
  }
}

// ===============================
// Aufgaben-Generator
// ===============================
function pickActualMode() {
  const m = modeSel.value;
  if (m === "addsub") return Math.random() < 0.5 ? "add" : "sub";
  if (m === "muldiv") return Math.random() < 0.5 ? "mul" : "div";
  return m;
}

function makeTask() {
  const max = Number(rangeSel.value);
  const m = pickActualMode();

  if (m === "add") {
    const a = randInt(0, max);
    const b = randInt(0, max);
    return { mode: m, text: `${a} plus ${b}`, solution: a + b };
  }

  if (m === "sub") {
    let a = randInt(0, max);
    let b = randInt(0, max);
    if (b > a) [a, b] = [b, a];
    return { mode: m, text: `${a} minus ${b}`, solution: a - b };
  }

  if (m === "mul") {
    const a = randInt(0, max);
    const b = randInt(0, max);
    return { mode: m, text: `${a} mal ${b}`, solution: a * b };
  }

  // Division ohne Rest
  const b = randInt(1, Math.max(1, Math.floor(max / 2)));
  const q = randInt(0, max);
  const a = b * q;
  return { mode: m, text: `${a} geteilt durch ${b}`, solution: q };
}

function startNewTask({ immediateSpeak = false } = {}) {
  currentTask = makeTask();

  statusEl.textContent = "Aufgabe wird vorgelesen …";
  answerEl.value = "";
  answerEl.focus();

  setTimeUI(0);
  startTimer();

  // Für mobile: erste Aufgabe IM Start-Klick ohne Delay sprechen
  if (immediateSpeak) speakNow(currentTask.text);
  else speak(currentTask.text);

  statusEl.textContent = "Gib das Ergebnis ein.";
}

// ===============================
// Firebase / Firestore
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

function getPlayerName() {
  const existing = localStorage.getItem("playerName");
  if (existing) return existing;

  const adj = ["Schneller", "Cleverer", "Schlauer", "Starker", "Mutiger", "Ruhiger"];
  const ani = ["Fuchs", "Tiger", "Wolf", "Adler", "Bär", "Delfin"];
  const name = `${adj[randInt(0, adj.length - 1)]}${ani[randInt(0, ani.length - 1)]}_${randInt(100, 999)}`;

  localStorage.setItem("playerName", name);
  return name;
}

// Laden ohne where+orderBy (vermeidet Composite Index)
async function loadLeaderboard() {
  lbErrEl.textContent = "";
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
      window.fs.limit(300)
    );

    const snap = await window.fs.getDocs(q);
    const wanted = modeSel.value;

    const items = [];
    snap.forEach((doc) => {
      const d = doc.data();
      if (d && d.mode === wanted) items.push(d);
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
    lbErrEl.textContent = "Firestore-Zugriff fehlgeschlagen (Regeln?).";
  }
}

async function saveScoreAfter10() {
  if (!window.db || !window.fs) return;

  const name = getPlayerName();
  const mode = modeSel.value;
  const avg = sessionSolvedTime / sessionSolvedCount;

  try {
    await window.fs.addDoc(window.fs.collection(window.db, "scores"), {
      name,
      mode,
      avgTime: Number(avg.toFixed(2)),
      tasks: sessionSolvedCount,
      createdAt: window.fs.serverTimestamp()
    });

    // Session reset
    sessionSolvedTime = 0;
    sessionSolvedCount = 0;

    await loadLeaderboard();
  } catch (e) {
    console.error("❌ Speichern Fehler:", e);
    lbErrEl.textContent = "Konnte Score nicht speichern (Firestore-Regeln?).";
  }
}

// ===============================
// Antwort prüfen
// ===============================
function checkAnswer() {
  if (!currentTask) return;

  const raw = String(answerEl.value).trim().replace(",", ".");
  const val = Number(raw);

  if (!Number.isFinite(val)) {
    speak("Bitte eine Zahl eingeben.");
    return;
  }

  if (val === currentTask.solution) {
    const t = elapsedSeconds();

    correct++;
    streak++;
    updateStats();

    totalSolvedTime += t;
    totalSolvedCount++;
    setAvgUI();

    sessionSolvedTime += t;
    sessionSolvedCount++;

    speak("Richtig.");

    if (sessionSolvedCount >= MIN_TASKS_FOR_SCORE) {
      saveScoreAfter10().finally(() => startNewTask());
    } else {
      startNewTask();
    }
  } else {
    wrong++;
    streak = 0;
    updateStats();
    speak("Falsch.");
  }
}

// ===============================
// Events / Init
// ===============================
rate.addEventListener("input", () => {
  rateVal.textContent = rate.value;
});

submitBtn.addEventListener("click", checkAnswer);

answerEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkAnswer();
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    if (currentTask) speak(currentTask.text);
  }
});

repeatBtn.addEventListener("click", () => {
  if (currentTask) speak(currentTask.text);
});

modeSel.addEventListener("change", () => {
  sessionSolvedTime = 0;
  sessionSolvedCount = 0;
  loadLeaderboard();
});

startBtn.addEventListener("click", async () => {
  // ✅ WICHTIG: Audio auf Handy freischalten
  unlockAudio();

  answerEl.disabled = false;
  submitBtn.disabled = false;
  repeatBtn.disabled = false;

  try {
    await waitForFirebaseReady();
    await loadLeaderboard();
  } catch {
    lbErrEl.textContent = "Bestenliste: Firebase noch nicht bereit (oder Regeln blockieren).";
  }

  // ✅ Erste Aufgabe direkt im Klick sprechen (iOS/Android)
  startNewTask({ immediateSpeak: true });
});

// Initial UI
updateStats();
setTimeUI(0);
setAvgUI();
rateVal.textContent = rate.value;
lbModeEl.textContent = `Modus: ${modeSel.value}`;
console.log("🚀 App bereit");
