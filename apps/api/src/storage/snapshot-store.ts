import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  type YouTubeDashboardSnapshot,
  youtubeDashboardSnapshotSchema,
} from "@creator-data-bridge/contracts";

export class SnapshotStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<YouTubeDashboardSnapshot | null> {
    try {
      const value = JSON.parse(await readFile(this.filePath, "utf8"));
      return youtubeDashboardSnapshotSchema.parse(value);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async write(snapshot: YouTubeDashboardSnapshot) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  }

  async delete() {
    await rm(this.filePath, { force: true });
  }
}
