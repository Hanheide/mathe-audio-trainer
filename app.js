const { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } =
  window.firestoreHelpers;
const db = window.db;

const MIN_TASKS = 10;
let solved = 0;
let totalTime = 0;
let startTime = 0;
let correctResult = 0;

const answer = document.getElementById("answer");
const submit = document.getElementById("submit");
const startBtn = document.getElementById("start");
const repeatBtn = document.getElementById("repeat");
const status = document.getElementById("status");
const modeSel = document.getElementById("mode");
const rangeSel = document.getElementById("range");

function randomName() {
  const a = ["Schneller","Cleverer","Starker","Schlauer"];
  const b = ["Fuchs","Tiger","Wolf","Adler"];
  return `${a[Math.floor(Math.random()*a.length)]}${b[Math.floor(Math.random()*b.length)]}_${Math.floor(Math.random()*900+100)}`;
}

function speak(text) {
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function nextTask() {
  const r = Number(rangeSel.value);
  const m = modeSel.value;
  let a = Math.floor(Math.random()*r);
  let b = Math.floor(Math.random()*r);

  if (m === "add") correctResult = a+b, speak(`${a} plus ${b}`);
  if (m === "sub") correctResult = a-b, speak(`${a} minus ${b}`);
  if (m === "mul") correctResult = a*b, speak(`${a} mal ${b}`);
  if (m === "div") { b=b||1; correctResult=Math.floor(a/b); a=correctResult*b; speak(`${a} geteilt durch ${b}`); }
  if (m === "addsub") Math.random()<0.5 ? (correctResult=a+b,speak(`${a} plus ${b}`)) : (correctResult=a-b,speak(`${a} minus ${b}`));
  if (m === "muldiv") Math.random()<0.5 ? (correctResult=a*b,speak(`${a} mal ${b}`)) : (b=b||1,correctResult=Math.floor(a/b),a=correctResult*b,speak(`${a} geteilt durch ${b}`));

  startTime = performance.now();
  answer.value = "";
  answer.focus();
}

async function saveScore() {
  const name = localStorage.getItem("name") || randomName();
  localStorage.setItem("name", name);

  await addDoc(collection(db,"scores"),{
    name,
    mode: modeSel.value,
    avgTime: Number((totalTime/solved).toFixed(2)),
    tasks: solved,
    createdAt: serverTimestamp()
  });

  solved = 0;
  totalTime = 0;
  loadLeaderboard();
}

function check() {
  const t = (performance.now()-startTime)/1000;
  if (Number(answer.value) === correctResult) {
    solved++;
    totalTime += t;
    status.textContent = "✅ Richtig";
    if (solved >= MIN_TASKS) saveScore();
    nextTask();
  } else {
    status.textContent = "❌ Falsch";
  }
}

async function loadLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  const title = document.getElementById("lb-mode");
  list.innerHTML = "";
  title.textContent = `Modus: ${modeSel.value}`;

  const q = query(
    collection(db,"scores"),
    where("mode","==",modeSel.value),
    orderBy("avgTime"),
    limit(10)
  );

  const snap = await getDocs(q);
  if (snap.empty) list.innerHTML = "<li>Noch keine Einträge</li>";

  let i=1;
  snap.forEach(d=>{
    const s=d.data();
    const li=document.createElement("li");
    li.textContent=`${i++}. ${s.name} – Ø ${s.avgTime}s`;
    list.appendChild(li);
  });
}

startBtn.onclick = () => {
  answer.disabled = false;
  submit.disabled = false;
  repeatBtn.disabled = false;
  nextTask();
  loadLeaderboard();
};

submit.onclick = check;
answer.onkeydown = e => { if (e.key==="Enter") check(); };
modeSel.onchange = loadLeaderboard;

console.log("🚀 App bereit");
