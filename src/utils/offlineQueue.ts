const DB_NAME = "tna-offline-queue";
const DB_VERSION = 2;
const STORE_NAME = "pending_actions";
const STUCK_THRESHOLD_MS = 2 * 60 * 1000;

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

export type ActionStatus = "pending" | "syncing" | "synced" | "rejected" | "login_required" | "retryable_failed";

export interface QueuedAction {
  id: string;
  qrToken: string;
  action: "check_in" | "check_out" | "start_break" | "end_break";
  idempotencyKey: string;
  clientCreatedAt: string;
  status: ActionStatus;
  result?: any;
  error?: string;
  createdAt: string;
  lastAttemptAt?: string;
  attemptCount?: number;
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

export async function getRetryableActions(): Promise<QueuedAction[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const all = store.getAll();
    all.onsuccess = () => {
      const items = all.result as QueuedAction[];
      resolve(items.filter((a) => a.status === "retryable_failed" || a.status === "pending"));
    };
    all.onerror = () => reject(all.error);
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
  status: ActionStatus,
  result?: any,
  error?: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result as QueuedAction | undefined;
      if (!entry) { resolve(); return; }
      entry.status = status;
      entry.lastAttemptAt = new Date().toISOString();
      entry.attemptCount = (entry.attemptCount || 0) + 1;
      if (result !== undefined) entry.result = result;
      if (error !== undefined) entry.error = error;
      const putReq = store.put(entry);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function recoverStuckSyncing(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const all = store.getAll();
    all.onsuccess = () => {
      const items = all.result as QueuedAction[];
      const now = Date.now();
      let recovered = 0;
      for (const item of items) {
        if (item.status !== "syncing") continue;
        const lastAttempt = item.lastAttemptAt ? new Date(item.lastAttemptAt).getTime() : 0;
        if (now - lastAttempt > STUCK_THRESHOLD_MS) {
          item.status = "pending";
          item.error = "Recovered from stuck sync";
          store.put(item);
          recovered++;
        }
      }
      resolve(recovered);
    };
    all.onerror = () => reject(all.error);
  });
}

export function getQueueStats(): Promise<{
  pending: number;
  syncing: number;
  synced: number;
  rejected: number;
  login_required: number;
  retryable_failed: number;
}> {
  const empty = { pending: 0, syncing: 0, synced: 0, rejected: 0, login_required: 0, retryable_failed: 0 };
  return getAllQueuedActions().then((items) => {
    const stats = { ...empty };
    for (const item of items) {
      const s = item.status as keyof typeof stats;
      if (s in stats) stats[s]++;
    }
    return stats;
  }).catch(() => empty);
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

async function syncOne(item: QueuedAction, baseUrl: string): Promise<ActionStatus> {
  const url = `${baseUrl}/api/realtime-timesheets/qr/${encodeURIComponent(item.qrToken)}/action`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: item.action,
      idempotencyKey: item.idempotencyKey,
      clientCreatedAt: item.clientCreatedAt,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (res.ok) return "synced";

  if (res.status === 400) return "rejected";
  if (res.status === 401 || res.status === 403) return "login_required";

  return "retryable_failed";
}

export async function syncAllPendingActions(
  baseUrl: string = ""
): Promise<{ synced: number; rejected: number; login_required: number; retryable: number; stopped: boolean }> {
  let synced = 0, rejected = 0, login_required = 0, retryable = 0;

  const candidates = await getRetryableActions();

  for (const item of candidates) {
    await updateActionStatus(item.id, "syncing");

    try {
      const result = await syncOne(item, baseUrl);
      await updateActionStatus(item.id, result, {}, result === "rejected" ? item.error || "Rejected" : undefined);

      if (result === "synced") synced++;
      else if (result === "rejected") rejected++;
      else if (result === "login_required") { login_required++; return { synced, rejected, login_required, retryable, stopped: true }; }
      else retryable++;
    } catch {
      await updateActionStatus(item.id, "retryable_failed", null, "Network error");
      retryable++;
    }
  }

  return { synced, rejected, login_required, retryable, stopped: false };
}

export async function syncPendingActions(
  qrToken: string,
  baseUrl: string = ""
): Promise<{ synced: number; rejected: number; login_required: number; retryable: number; stopped: boolean }> {
  let synced = 0, rejected = 0, login_required = 0, retryable = 0;

  const candidates = await getRetryableActions();

  for (const item of candidates) {
    if (item.qrToken !== qrToken) continue;

    await updateActionStatus(item.id, "syncing");

    try {
      const result = await syncOne(item, baseUrl);
      await updateActionStatus(item.id, result, {}, result === "rejected" ? item.error || "Rejected" : undefined);

      if (result === "synced") synced++;
      else if (result === "rejected") rejected++;
      else if (result === "login_required") { login_required++; return { synced, rejected, login_required, retryable, stopped: true }; }
      else retryable++;
    } catch {
      await updateActionStatus(item.id, "retryable_failed", null, "Network error");
      retryable++;
    }
  }

  return { synced, rejected, login_required, retryable, stopped: false };
}

export async function getQueueCount(): Promise<number> {
  const stats = await getQueueStats();
  return stats.pending + stats.retryable_failed;
}
