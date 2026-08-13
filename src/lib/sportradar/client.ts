import "server-only";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { readFixture } from "./fixtures";
import type { FixtureName } from "./constants";

const dataDirectory = path.join(process.cwd(), "data");
const counterPath = path.join(dataDirectory, "sportradar-api-counter.json");
const logPath = path.join(dataDirectory, "sportradar-api-log.jsonl");

async function recordCall(url: string, status: number, responseBytes: number) {
  await mkdir(dataDirectory, { recursive: true });
  let count = 0;
  try { count = JSON.parse(await readFile(counterPath, "utf8")).count ?? 0; } catch { /* first call */ }
  const entry = { at: new Date().toISOString(), count: count + 1, url: new URL(url).pathname, status, responseBytes };
  await Promise.all([writeFile(counterPath, JSON.stringify({ count: count + 1, updatedAt: entry.at }, null, 2) + "\n"), appendFile(logPath, JSON.stringify(entry) + "\n")]);
}

/** Server-only access point. Defaults to a saved fixture and never calls Sportradar. */
export async function getSportradarJson<T = unknown>(fixture: FixtureName, url: string): Promise<T> {
  if (process.env.SPORTRADAR_USE_FIXTURES !== "false") return readFixture<T>(fixture);
  const apiKey = process.env.SPORTRADAR_API_KEY;
  if (!apiKey) throw new Error("SPORTRADAR_API_KEY is required when SPORTRADAR_USE_FIXTURES=false.");
  const response = await fetch(url, { headers: { "x-api-key": apiKey }, cache: "no-store" });
  const body = await response.text();
  await recordCall(url, response.status, Buffer.byteLength(body));
  if (!response.ok) throw new Error(`Sportradar request failed (${response.status}): ${body.slice(0, 500)}`);
  return JSON.parse(body) as T;
}
