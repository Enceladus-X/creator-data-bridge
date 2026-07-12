import type { CollectionRecord, CollectionRun } from "@creator-data-bridge/contracts";

const databaseName = "creator-data-bridge";
const databaseVersion = 1;

interface StoredRecord extends CollectionRecord {
  key: string;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

async function openDatabase() {
  const request = indexedDB.open(databaseName, databaseVersion);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains("runs")) {
      const runs = database.createObjectStore("runs", { keyPath: "id" });
      runs.createIndex("createdAt", "createdAt");
    }
    if (!database.objectStoreNames.contains("records")) {
      const records = database.createObjectStore("records", { keyPath: "key" });
      records.createIndex("runId", "runId");
      records.createIndex("snapshotAt", "snapshotAt");
    }
  };
  return requestResult(request);
}

export async function saveCollectionRun(run: CollectionRun) {
  const database = await openDatabase();
  const transaction = database.transaction("runs", "readwrite");
  transaction.objectStore("runs").put(run);
  await transactionDone(transaction);
  database.close();
}

export async function saveCollectionRecords(records: CollectionRecord[]) {
  if (records.length === 0) return;
  const database = await openDatabase();
  const transaction = database.transaction("records", "readwrite");
  const store = transaction.objectStore("records");
  for (const record of records) {
    const key = [
      record.runId,
      record.platform,
      record.recordType,
      record.contentId || "summary",
    ].join(":");
    store.put({ ...record, key } satisfies StoredRecord);
  }
  await transactionDone(transaction);
  database.close();
}

export async function getLatestCollectionRun(): Promise<CollectionRun | null> {
  const database = await openDatabase();
  const transaction = database.transaction("runs", "readonly");
  const request = transaction.objectStore("runs").index("createdAt").openCursor(null, "prev");
  const cursor = await requestResult(request);
  const result = (cursor?.value as CollectionRun | undefined) ?? null;
  database.close();
  return result;
}

export async function getCollectionRecords(runId: string): Promise<CollectionRecord[]> {
  const database = await openDatabase();
  const transaction = database.transaction("records", "readonly");
  const values = (await requestResult(
    transaction.objectStore("records").index("runId").getAll(runId),
  )) as StoredRecord[];
  database.close();
  return values
    .map(({ key: _key, ...record }) => record)
    .sort((left, right) =>
      `${left.platform}:${left.recordType}:${left.contentId}`.localeCompare(
        `${right.platform}:${right.recordType}:${right.contentId}`,
      ),
    );
}

export async function clearCollectionDatabase() {
  const database = await openDatabase();
  const transaction = database.transaction(["runs", "records"], "readwrite");
  transaction.objectStore("runs").clear();
  transaction.objectStore("records").clear();
  await transactionDone(transaction);
  database.close();
}
