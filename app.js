const answer = document.getElementById("answer");
const startBtn = document.getElementById("start");
const repeatBtn = document.getElementById("repeat");
const status = document.getElementById("status");
const modeSel = document.getElementById("mode");
const rangeSel = document.getElementById("range");
const leaderboard = document.getElementById("leaderboard");

let a, b, result, startTime;
let solved = 0;
let totalTime = 0;

function rand(max) {
  return Math.floor(Math.random() * (max + 1));
}

function speak(text) {
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function newTask() {
  const r = Number(rangeSel.value);
  const m = modeSel.value;
  a = rand(r);
  b = rand(r) || 1;

  if (m === "add") result = a + b, speak(`${a} plus ${b}`);
  if (m === "sub") result = a - b, speak(`${a} minus ${b}`);
  if (m === "mul") result = a * b, speak(`${a} mal ${b}`);
  if (m === "div") result = Math.floor(a / b), a = result * b, speak(`${a} geteilt durch ${b}`);
  if (m === "addsub") Math.random() < .5 ? (result=a+b,speak(`${a} plus ${b}`)) : (result=a-b,speak(`${a} minus ${b}`));
  if (m === "muldiv") Math.random() < .5 ? (result=a*b,speak(`${a} mal ${b}`)) : (result=Math.floor(a/b),a=result*b,speak(`${a} geteilt durch ${b}`));

  startTime = performance.now();
  answer.value = "";
  answer.focus();
}

async function saveScore() {
  const name = localStorage.name || `Spieler_${Math.floor(Math.random()*1000)}`;
  localStorage.name = name;

  await window.fs.addDoc(window.fs.collection(window.db, "scores"), {
    name,
    mode: modeSel.value,
    avgTime: Number((totalTime / solved).toFixed(2)),
    tasks: solved,
    createdAt: window.fs.serverTimestamp()
  });

  solved = 0;
  totalTime = 0;
  loadLeaderboard();
}

function check() {
  const t = (performance.now() - startTime) / 1000;
  if (Number(answer.value) === result) {
    solved++;
    totalTime += t;
    status.textContent = "✅ Richtig";
    if (solved >= 10) saveScore();
    newTask();
  } else {
    status.textContent = "❌ Falsch";
  }
}

async function loadLeaderboard() {
  leaderboard.innerHTML = "";
  const q = window.fs.query(
    window.fs.collection(window.db, "scores"),
    window.fs.where("mode", "==", modeSel.value),
    window.fs.orderBy("avgTime"),
    window.fs.limit(10)
  );
  const snap = await window.fs.getDocs(q);
  if (snap.empty) leaderboard.innerHTML = "<li>Keine Einträge</li>";
  snap.forEach((d, i) => {
    const s = d.data();
    leaderboard.innerHTML += `<li>${i+1}. ${s.name} – Ø ${s.avgTime}s</li>`;
  });
}

startBtn.onclick = () => {
  answer.disabled = false;
  repeatBtn.disabled = false;
  newTask();
  loadLeaderboard();
};

answer.onkeydown = e => e.key === "Enter" && check();
repeatBtn.onclick = () => speak(`${a} und ${b}`);

console.log("🚀 App bereit");
