// ===============================
// Firestore Scoreboard
// ===============================

const { collection, addDoc, serverTimestamp } = window.firestoreHelpers;
const db = window.db;

// Einstellungen
const MIN_TASKS_FOR_SCORE = 10;

// Session-Daten
let solvedTasks = 0;
let totalTime = 0;

// Diese Funktion rufst du AUF,
// wenn eine Aufgabe RICHTIG gelöst wurde
function registerSolvedTask(timeInSeconds) {
  solvedTasks++;
  totalTime += timeInSeconds;

  console.log(`🧮 Aufgabe ${solvedTasks}/${MIN_TASKS_FOR_SCORE}`);

  if (solvedTasks >= MIN_TASKS_FOR_SCORE) {
    saveScore();
    resetSession();
  }
}

// Score speichern
async function saveScore() {
  const avgTime = totalTime / solvedTasks;
  const mode = document.getElementById("mode").value;

  const name =
    localStorage.getItem("playerName") ||
    prompt("Name für die Bestenliste:");

  if (!name) return;

  localStorage.setItem("playerName", name);

  try {
    await addDoc(collection(db, "scores"), {
      name,
      mode,
      avgTime: Number(avgTime.toFixed(2)),
      tasks: solvedTasks,
      createdAt: serverTimestamp()
    });

    alert("🏆 Score gespeichert!");
    console.log("✅ Score gespeichert");
  } catch (e) {
    console.error("❌ Fehler beim Speichern:", e);
  }
}

// Runde zurücksetzen
function resetSession() {
  solvedTasks = 0;
  totalTime = 0;
}

// 🔧 EXPORT FÜR DEIN SPIEL
window.scoreboard = {
  registerSolvedTask
};
