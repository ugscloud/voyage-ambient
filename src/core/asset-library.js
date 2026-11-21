const DB_NAME = 'voyage-ambient-assets';
const DB_VERSION = 1;
const STORE = 'assets';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Este navegador não oferece armazenamento local de arquivos.'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir a biblioteca local.'));
  });
}

let persistenceRequested = false;

async function requestPersistentStorage() {
  if (persistenceRequested) return;
  persistenceRequested = true;
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch { /* O navegador pode negar persistência; exportação continua sendo o backup universal. */ }
}

export async function saveAsset(file, category = 'other') {
  if (!(file instanceof File)) throw new Error('Arquivo inválido.');
  await requestPersistentStorage();
  const record = {
    id: `${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(16).slice(2)}`,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    category,
    updatedAt: new Date().toISOString(),
    blob: file,
  };
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => { db.close(); resolve({ ...record, blob: undefined }); };
    tx.onerror = () => { const error = tx.error; db.close(); reject(error || new Error('Falha ao salvar o arquivo.')); };
  });
}

export async function listAssets() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => {
      db.close();
      resolve(request.result.map(({ blob, ...metadata }) => metadata).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    };
    request.onerror = () => { const error = request.error; db.close(); reject(error); };
  });
}

export async function deleteAsset(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { const error = tx.error; db.close(); reject(error); };
  });
}

export async function getAsset(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => { db.close(); resolve(request.result || null); };
    request.onerror = () => { const error = request.error; db.close(); reject(error); };
  });
}
