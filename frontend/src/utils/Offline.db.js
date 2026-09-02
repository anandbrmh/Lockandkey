import { openDB } from 'idb';

export const dbPromise = openDB('lockkey-db', 1, {
  upgrade(db) {
    db.createObjectStore('pending-entries', { keyPath: 'id', autoIncrement: true });
  }
});

export async function saveOfflineEntry(entry) {
  const db = await dbPromise;
  await db.add('pending-entries', { ...entry, timestamp: Date.now() });
}

export async function getAllPendingEntries() {
  const db = await dbPromise;
  return db.getAll('pending-entries');
}

export async function deletePendingEntry(id) {
  const db = await dbPromise;
  await db.delete('pending-entries', id);
}





