/* ERO SOUND PAD - IndexedDB sample storage */
(() => {
  "use strict";
  const DB_NAME = "ero-sound-pad-samples";
  const DB_VERSION = 1;
  let dbPromise;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("samples")) {
          db.createObjectStore("samples", { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Could not open sample storage"));
    });
    return dbPromise;
  }

  async function put(sample) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("samples", "readwrite");
      tx.objectStore("samples").put(sample);
      tx.oncomplete = () => resolve(sample);
      tx.onerror = () => reject(tx.error || new Error("Sample save failed"));
    });
  }

  async function get(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction("samples", "readonly").objectStore("samples").get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function all() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction("samples", "readonly").objectStore("samples").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function remove(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("samples", "readwrite");
      tx.objectStore("samples").delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  window.EROSampleStore = { put, get, all, remove };
})();