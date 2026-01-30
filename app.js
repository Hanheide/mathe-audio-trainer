const answer = document.getElementById("answer");
const submit = document.getElementById("submit");
const startBtn = document.getElementById("start");
const repeatBtn = document.getElementById("repeat");
const statusEl = document.getElementById("status");

const correctEl = document.getElementById("correct");
const wrongEl = document.getElementById("wrong");
const streakEl = document.getElementById("streak");

const timeEl = document.getElementById("time");
const avgEl = document.getElementById("avg");

const modeSel = document.getElementById("mode");
const rangeSel = document.getElementById("range");
const rate = document.getElementById("rate");
const rateVal = document.getElementById("rateVal");

let a, b, solution;
let correct = 0, wrong = 0, streak = 0;
let startTime = 0;
let totalTime = 0;
let solved = 0;

// 🔟 Scoreboard
const MIN_TASKS = 10;

function rand(max) {
  return Math.floor(Math.random() * (max + 1));
}

function speak(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = Number(rate.value);
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

function randomName() {
  const a = ["Schneller","Cleverer","Schlauer","Starker"];
  const b = ["Fuchs","Tiger","Wolf","Adler"];
  return `${a[rand(a.length-1)]}${b[rand(b.length-1)]}_${rand(899)+100}`;
}

function nextTask() {
  const r = Number(rangeSel.value);
  const m = modeSel.value;

  a = rand(r);
  b = rand(r) || 1;

  if (m === "add") solution = a+b, speak(`${a} plus ${b}`);
  if (m === "sub") solution = a-b, speak(`${a} minus ${b}`);
  if (m === "mul") solution = a*b, speak(`${a} mal ${b}`);
  if (m === "div") solution = Math.floor(a/b), a=solution*b, speak(`${a} geteilt durch ${b}`);
  if (m === "addsub") Math.random()<.5 ? (solution=a+b,speak(`${a} plus ${b}`)) : (solution=a-b,speak(`${a} minus ${b}`));
  if (m === "muldiv") Math.random()<.5 ? (solution=a*b,speak(`${a} mal ${b}`)) : (solution=Math.floor(a/b),a=solution*b,speak(`${a} geteilt durch ${b}`));

  startTime = performance.now();
  answer.value = "";
  answer.focus();
}

async function saveScore() {
  const name = localStorage.name || randomName();
  localStorage.name = name;

  await fs.addDoc(fs.collection(db,"scores"),{
    name,
    mode: modeSel.value,
    avgTime: Number((totalTime/solved).toFixed(2)),
    tasks: solved,
    createdAt: fs.serverTimestamp()
  });

  solved = 0;
  totalTime = 0;
  loadLeaderboard();
}

function check() {
  const t = (performance.now()-startTime)/1000;

  if (Number(answer.value) === solution) {
    correct++;
    streak++;
    solved++;
    totalTime += t;

    correctEl.textContent = correct;
    streakEl.textContent = streak;

    if (solved >= MIN_TASKS) saveScore();
    nextTask();
  } else {
    wrong++;
    streak = 0;
    wrongEl.textContent = wrong;
    streakEl.textContent = streak;
  }

  avgEl.textContent = `Ø: ${(solved?totalTime/solved:0).toFixed(2)} s`;
}

async function loadLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  const title = document.getElementById("lb-mode");

  list.innerHTML = "";
  title.textContent = `Modus: ${modeSel.value}`;

  const q = fs.query(
    fs.collection(db,"scores"),
    fs.where("mode","==",modeSel.value),
    fs.orderBy("avgTime"),
    fs.limit(10)
  );

  const snap = await fs.getDocs(q);
  if (snap.empty) list.innerHTML = "<li>Noch keine Einträge</li>";

  let i=1;
  snap.forEach(d=>{
    const s=d.data();
    list.innerHTML += `<li>${i++}. ${s.name} – Ø ${s.avgTime}s</li>`;
  });
}

rate.oninput = () => rateVal.textContent = rate.value;

startBtn.onclick = () => {
  answer.disabled = false;
  submit.disabled = false;
  repeatBtn.disabled = false;
  nextTask();
  loadLeaderboard();
};

submit.onclick = check;
answer.onkeydown = e => {
  if (e.key==="Enter") check();
  if (e.code==="Space") { e.preventDefault(); speak(`${a} und ${b}`); }
};
repeatBtn.onclick = () => speak(`${a} und ${b}`);

console.log("🚀 App bereit");
