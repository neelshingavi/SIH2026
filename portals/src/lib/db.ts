import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface OfflinePatient {
  id?: number; // Auto-incrementing local ID
  abhaNumber?: string;
  fullName: string;
  gender: string;
  dob: string;
  village: string;
  mobile: string;
  isSynced: number; // 0 or 1, since boolean is not a valid IDB key
  createdAt: number;
}

interface AshaDB extends DBSchema {
  patients: {
    key: number;
    value: OfflinePatient;
    indexes: { 'by-sync': number };
  };
}

let dbPromise: Promise<IDBPDatabase<AshaDB>> | null = null;

export function getDB() {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<AshaDB>('asha-offline-db', 1, {
      upgrade(db) {
        const store = db.createObjectStore('patients', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by-sync', 'isSynced');
      },
    });
  }
  return dbPromise;
}

export async function savePatientLocally(patient: Omit<OfflinePatient, 'id' | 'isSynced' | 'createdAt'>) {
  const db = await getDB();
  if (!db) return;
  return db.add('patients', {
    ...patient,
    isSynced: 0,
    createdAt: Date.now(),
  });
}

export async function getUnsyncedPatients() {
  const db = await getDB();
  if (!db) return [];
  return db.getAllFromIndex('patients', 'by-sync', 0);
}

export async function markPatientAsSynced(id: number) {
  const db = await getDB();
  if (!db) return;
  const patient = await db.get('patients', id);
  if (patient) {
    patient.isSynced = 1;
    await db.put('patients', patient);
  }
}

export async function clearSyncedPatients() {
  const db = await getDB();
  if (!db) return;
  const synced = await db.getAllFromIndex('patients', 'by-sync', 1);
  const tx = db.transaction('patients', 'readwrite');
  for (const p of synced) {
    if (p.id) await tx.store.delete(p.id);
  }
  await tx.done;
}
