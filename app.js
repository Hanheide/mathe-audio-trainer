// ================== Firebase ==================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs,
  query, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBw0be3M9Sq1ADmwpG94kKpt5NOzRFANXg",
  authDomain: "mathe-audio-trainer-web.firebaseapp.com",
  projectId: "mathe-audio-trainer-web",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ================== DOM ==================
const $ = id => document.getElementById(id);
const modeSel = $("mode");
const rangeSel = $("range");
const rateEl = $("rate");
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
const lbList = $("leaderboard-list");
const lbMode = $("lb-mode");
const lbError = $("lb-error");

// ================== State ==================
let currentTask = null;
let correct = 0, wrong = 0, streak = 0;
let startTime = 0;
let solvedCount = 0;
let totalTime = 0;
let rafId = null;

// ================== Audio (Handy-Fix) ==================
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
  audioUnlocked = true;
}

function speak(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = Number(rateEl.value);
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

// ================== Timer ==================
function startTimer() {
  startTime = performance.now();
  rafId = requestAnimationFrame(updateTimer);
}
function updateTimer() {
  const sec = (performance.now() - startTime) / 1000;
  timeEl.textContent = `Zeit: ${sec.toFixed(2)} s`;
  rafId = requestAnimationFrame(updateTimer);
}
function stopTimer() {
  cancelAnimationFrame(rafId);
  return (performance.now() - startTime) / 1000;
}

// ================== Aufgaben ==================
function rand(max) {
  return Math.floor(Math.random() * max);
}

function makeTask() {
  const max = Number(rangeSel.value);
  const mode = modeSel.value;
  let a = rand(max), b = rand(max);
  let op = "+", sol = a + b;

  if (mode === "sub") { op = "-"; sol = a - b; }
  if (mode === "mul") { op = "×"; sol = a * b; }
  if (mode === "div") { b = rand(max) + 1; a = b * rand(max); op = "÷"; sol = a / b; }

  return { text: `${a} ${op} ${b}`, solution: sol };
}

function startNewTask() {
  currentTask = makeTask();
  statusEl.textContent = currentTask.text;
  answerEl.value = "";
  answerEl.focus();
  startTimer();
  speak(currentTask.text);
}

// ================== Check ==================
function checkAnswer() {
  if (!currentTask) return;
  const val = Number(answerEl.value);
  if (val === currentTask.solution) {
    const t = stopTimer();
    correct++; streak++; solvedCount++;
    totalTime += t;
    if (solvedCount === 10) saveScore();
    speak("Richtig");
    startNewTask();
  } else {
    wrong++; streak = 0;
    speak("Falsch");
  }
  updateStats();
}

function updateStats() {
  correctEl.textContent = correct;
  wrongEl.textContent = wrong;
  streakEl.textContent = streak;
  avgEl.textContent = solvedCount
    ? `Ø: ${(totalTime / solvedCount).toFixed(2)} s`
    : "Ø: 0.00 s";
}

// ================== Bestenliste ==================
function randomName() {
  const names = ["Leo","Max","Lina","Nora","Tom","Mila","Ben","Finn","Emma"];
  return names[Math.floor(Math.random()*names.length)];
}

async function saveScore() {
  await addDoc(collection(db, "scores"), {
    name: randomName(),
    mode: modeSel.value,
    avgTime: Number((totalTime / solvedCount).toFixed(2)),
    createdAt: serverTimestamp()
  });
  solvedCount = 0;
  totalTime = 0;
  loadLeaderboard();
}

async function loadLeaderboard() {
  lbList.innerHTML = "";
  lbMode.textContent = `Modus: ${modeSel.value}`;
  const q = query(collection(db,"scores"), orderBy("avgTime"), limit(10));
  const snap = await getDocs(q);
  snap.forEach((d,i)=>{
    const li = document.createElement("li");
    li.textContent = `${i+1}. ${d.data().name} – ${d.data().avgTime}s`;
    lbList.appendChild(li);
  });
}

// ================== Events ==================
rateEl.oninput = () => rateVal.textContent = rateEl.value;

startBtn.onclick = () => {
  unlockAudio();                // 🔑 Handy-Audio
  answerEl.disabled = false;
  submitBtn.disabled = false;
  repeatBtn.disabled = false;
  startNewTask();
};

submitBtn.onclick = checkAnswer;
repeatBtn.onclick = () => currentTask && speak(currentTask.text);

document.onkeydown = e => {
  if (e.key === "Enter") checkAnswer();
  if (e.code === "Space") { e.preventDefault(); repeatBtn.click(); }
};

modeSel.onchange = loadLeaderboard;

// ================== Init ==================
loadLeaderboard();
console.log("✅ App bereit");
