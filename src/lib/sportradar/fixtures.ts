import "server-only";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { FIXTURE_NAMES, type FixtureName } from "./constants";

const fixtureDirectory = path.join(process.cwd(), "data", "fixtures");
export function fixturePath(name: FixtureName) { return path.join(fixtureDirectory, `${name}.json`); }

export async function readFixture<T = unknown>(name: FixtureName): Promise<T> {
  try { return JSON.parse(await readFile(fixturePath(name), "utf8")) as T; }
  catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Fixture ${name}.json is unavailable. Capture it first with npm run sportradar:capture -- --live. (${detail})`);
  }
}

export async function fixtureStatus() {
  return Promise.all(FIXTURE_NAMES.map(async (name) => {
    try { await access(fixturePath(name)); return { name, exists: true }; }
    catch { return { name, exists: false }; }
  }));
}
