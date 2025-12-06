// Dual Storage System: localStorage + IndexedDB for redundancy

const DB_NAME = 'OrderPrepBackup';
const DB_VERSION = 1;
const STORE_NAME = 'backups';

/**
 * Opens IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

/**
 * Saves data to BOTH localStorage and IndexedDB
 * This provides redundancy in case localStorage fails or gets cleared
 */
export async function saveToBoth(key: string, value: any): Promise<void> {
  try {
    // 1. Save to localStorage (primary storage)
    localStorage.setItem(key, JSON.stringify(value));

    // 2. Save to IndexedDB (backup storage)
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(value, key);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    console.log(`✅ Saved to both storages: ${key}`);
  } catch (error) {
    console.error('❌ Dual storage save failed:', error);
    // If IndexedDB fails, at least localStorage worked
  }
}

/**
 * Retrieves data from localStorage first, falls back to IndexedDB
 */
export async function getFromBoth(key: string): Promise<any> {
  try {
    // Try localStorage first (faster)
    const localData = localStorage.getItem(key);
    if (localData) {
      return JSON.parse(localData);
    }

    // Fallback to IndexedDB
    console.log(`⚠️ localStorage empty for ${key}, checking IndexedDB...`);
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const data = request.result;
        if (data) {
          // Restore to localStorage
          localStorage.setItem(key, JSON.stringify(data));
          console.log(`✅ Restored ${key} from IndexedDB to localStorage`);
        }
        resolve(data || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Dual storage retrieval failed:', error);
    return null;
  }
}

/**
 * Clears all data from both storages
 */
export async function clearBothStorages(): Promise<void> {
  try {
    // Clear localStorage
    localStorage.clear();

    // Clear IndexedDB
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    console.log('✅ Cleared both storages');
  } catch (error) {
    console.error('❌ Failed to clear storages:', error);
  }
}
