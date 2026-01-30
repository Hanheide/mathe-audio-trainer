// ===============================
// Firebase Firestore TEST
// ===============================

import { getFirestore, collection, addDoc, serverTimestamp } 
  from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const db = getFirestore();

console.log("🔥 Firebase + Firestore verbunden");

// Test-Datensatz schreiben
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

// Beim Laden der Seite ausführen
testWrite();
