import type { Receipt } from '../types/expenseReport';

type StoredReceipt = { id: string; tripId: string; expenseId: string; name: string; type: string; data: ArrayBuffer };
const DATABASE = 'wrlc-expense-report';
const VERSION = 1;
const STORE = 'receipts';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('tripId', 'tripId');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open receipt storage.'));
  });
}

async function transact<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = operation(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Receipt storage request failed.'));
      tx.onabort = () => reject(tx.error ?? new Error('Receipt storage transaction failed.'));
    });
  } finally { db.close(); }
}

export async function saveReceipt(tripId: string, expenseId: string, receipt: Receipt): Promise<void> {
  const data = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error('Could not read receipt file.'));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read receipt file.'));
    reader.readAsArrayBuffer(receipt.file);
  });
  await transact('readwrite', store => store.put({ id: receipt.id, tripId, expenseId, name: receipt.file.name, type: receipt.file.type, data } satisfies StoredReceipt));
}

export async function loadReceipts(): Promise<Map<string, Map<string, Receipt[]>>> {
  const records = await transact('readonly', store => store.getAll()) as StoredReceipt[];
  const grouped = new Map<string, Map<string, Receipt[]>>();
  for (const record of records) {
    const expenses = grouped.get(record.tripId) ?? new Map<string, Receipt[]>();
    const receipts = expenses.get(record.expenseId) ?? [];
    receipts.push({ id: record.id, file: new File([record.data], record.name, { type: record.type }) });
    expenses.set(record.expenseId, receipts);
    grouped.set(record.tripId, expenses);
  }
  return grouped;
}

export async function deleteStoredReceipt(id: string): Promise<void> { await transact('readwrite', store => store.delete(id)); }

async function deleteWhere(predicate: (record: StoredReceipt) => boolean): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const request = store.getAll();
      request.onsuccess = () => (request.result as StoredReceipt[]).filter(predicate).forEach(record => store.delete(record.id));
      request.onerror = () => reject(request.error ?? new Error('Could not find saved receipts.'));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Could not remove saved receipts.'));
      tx.onabort = () => reject(tx.error ?? new Error('Could not remove saved receipts.'));
    });
  } finally { db.close(); }
}

export async function deleteTripReceipts(tripId: string): Promise<void> { await deleteWhere(record => record.tripId === tripId); }
export async function deleteExpenseReceipts(tripId: string, expenseId: string): Promise<void> { await deleteWhere(record => record.tripId === tripId && record.expenseId === expenseId); }
export async function clearReceiptStorage(): Promise<void> { await transact('readwrite', store => store.clear()); }
