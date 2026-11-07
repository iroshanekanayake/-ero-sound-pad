/* ERO SOUND PAD - IndexedDB sample and kit storage */
(() => {
  "use strict";
  const DB_NAME = "ero-sound-pad-samples";
  const DB_VERSION = 2;
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
        if (!db.objectStoreNames.contains("kits")) {
          db.createObjectStore("kits", { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("Could not open local storage"));
      req.onblocked = () => console.warn("Sample database upgrade is blocked by another open tab");
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
      tx.onabort = () => reject(tx.error || new Error("Sample save was aborted"));
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

  async function putKit(kit) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("kits", "readwrite");
      tx.objectStore("kits").put(kit);
      tx.oncomplete = () => resolve(kit);
      tx.onerror = () => reject(tx.error || new Error("Kit save failed"));
      tx.onabort = () => reject(tx.error || new Error("Kit save was aborted"));
    });
  }

  async function getKit(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction("kits", "readonly").objectStore("kits").get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function allKits() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const req = db.transaction("kits", "readonly").objectStore("kits").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function removeKit(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("kits", "readwrite");
      tx.objectStore("kits").delete(id);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error("Kit delete failed"));
    });
  }

  window.EROSampleStore = { put, get, all, remove, putKit, getKit, allKits, removeKit };
})();
