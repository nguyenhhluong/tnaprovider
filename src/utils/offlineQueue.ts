const DB_NAME = "tna-offline-queue";
const DB_VERSION = 1;
const STORE_NAME = "pending_actions";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface QueuedAction {
  id: string;
  qrToken: string;
  action: "check_in" | "check_out" | "start_break" | "end_break";
  idempotencyKey: string;
  clientCreatedAt: string;
  status: "pending" | "syncing" | "synced" | "failed";
  result?: any;
  error?: string;
  createdAt: string;
}

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateIdempotencyKey(): string {
  return generateId();
}

export async function enqueueAction(
  qrToken: string,
  action: QueuedAction["action"]
): Promise<QueuedAction> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry: QueuedAction = {
      id: generateId(),
      qrToken,
      action,
      idempotencyKey: generateIdempotencyKey(),
      clientCreatedAt: new Date().toISOString(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    const req = store.add(entry);
    req.onsuccess = () => resolve(entry);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingActions(): Promise<QueuedAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("status");
    const req = index.getAll("pending");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllQueuedActions(): Promise<QueuedAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function updateActionStatus(
  id: string,
  status: QueuedAction["status"],
  result?: any,
  error?: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result;
      if (!entry) { resolve(); return; }
      entry.status = status;
      if (result !== undefined) entry.result = result;
      if (error !== undefined) entry.error = error;
      const putReq = store.put(entry);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function removeAction(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearSyncedActions(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("status");
    const req = index.openCursor("synced");
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function syncAllPendingActions(
  baseUrl: string = ""
): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingActions();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    await updateActionStatus(item.id, "syncing");

    try {
      const res = await fetch(`${baseUrl}/api/realtime-timesheets/qr/${encodeURIComponent(item.qrToken)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: item.action,
          idempotencyKey: item.idempotencyKey,
          clientCreatedAt: item.clientCreatedAt,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        await updateActionStatus(item.id, "synced", data);
        synced++;
      } else if (res.status === 400 && (data?.error?.includes("too old") || data?.error?.includes("already checked"))) {
        await updateActionStatus(item.id, "failed", data, data?.error);
        failed++;
      } else {
        await updateActionStatus(item.id, "pending", null, data?.error || `HTTP ${res.status}`);
        failed++;
      }
    } catch (err: any) {
      await updateActionStatus(item.id, "pending", null, err?.message || "Network error");
      failed++;
    }
  }

  return { synced, failed };
}

export async function syncPendingActions(
  qrToken: string,
  baseUrl: string = ""
): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingActions();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    if (item.qrToken !== qrToken) continue;

    await updateActionStatus(item.id, "syncing");

    try {
      const res = await fetch(`${baseUrl}/api/realtime-timesheets/qr/${encodeURIComponent(item.qrToken)}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: item.action,
          idempotencyKey: item.idempotencyKey,
          clientCreatedAt: item.clientCreatedAt,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        await updateActionStatus(item.id, "synced", data);
        synced++;
      } else if (res.status === 400 && (data?.error?.includes("too old") || data?.error?.includes("already checked"))) {
        // Permanent failure — remove from queue
        await updateActionStatus(item.id, "failed", data, data?.error);
        failed++;
      } else {
        // Transient failure — keep as pending for retry
        await updateActionStatus(item.id, "pending", null, data?.error || `HTTP ${res.status}`);
        failed++;
      }
    } catch (err: any) {
      // Network error — keep as pending
      await updateActionStatus(item.id, "pending", null, err?.message || "Network error");
      failed++;
    }
  }

  return { synced, failed };
}

export async function getQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("status");
    const req = index.count("pending");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
