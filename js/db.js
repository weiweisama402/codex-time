// IndexedDB 数据层
const DB_NAME = 'lyubishchev-time';
const DB_VERSION = 2;

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (e.oldVersion < 1) {
        const s = db.createObjectStore('activities', { keyPath: 'id' });
        s.createIndex('by_start', 'startTime');
      }
      if (e.oldVersion < 2) {
        if (db.objectStoreNames.contains('plans')) db.deleteObjectStore('plans');
        if (db.objectStoreNames.contains('meta')) db.deleteObjectStore('meta');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function getDB() {
  return openDB();
}

function reqDone(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getAllActivities() {
  const db = await getDB();
  const r = db.transaction('activities', 'readonly').objectStore('activities').getAll();
  return reqDone(r);
}

export async function addActivity(a) {
  const db = await getDB();
  await reqDone(db.transaction('activities', 'readwrite').objectStore('activities').add(a));
  return a;
}

export async function deleteActivity(id) {
  const db = await getDB();
  await reqDone(db.transaction('activities', 'readwrite').objectStore('activities').delete(id));
}

export async function clearStore(name) {
  const db = await getDB();
  const tx = db.transaction(name, 'readwrite');
  tx.objectStore(name).clear();
  await txDone(tx);
}

export async function putMany(storeName, items) {
  if (!items.length) return;
  const db = await getDB();
  const tx = db.transaction(storeName, 'readwrite');
  const s = tx.objectStore(storeName);
  for (const it of items) s.put(it);
  await txDone(tx);
}
