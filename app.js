// ===============================
// Firestore Verbindung TEST
// ===============================

const { collection, addDoc, serverTimestamp } = window.firestoreHelpers;
const db = window.db;

console.log("🔥 app.js läuft und hat Zugriff auf Firestore");

async function testWrite() {
  try {
    await addDoc(collection(db, "test"), {
      msg: "Hallo Firestore!",
      time: serverTimestamp()
    });
    console.log("✅ Test-Dokument erfolgreich gespeichert");
  } catch (e) {
    console.error("❌ Fehler beim Schreiben:", e);
  }
}

testWrite();
