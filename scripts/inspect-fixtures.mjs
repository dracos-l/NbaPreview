import { readFile } from "node:fs/promises";
import path from "node:path";

for (const name of ["team-profile", "depth-chart", "seasonal-stats", "injuries", "transfers", "news", "change-log"]) {
  try {
    const value = JSON.parse(await readFile(path.join(process.cwd(), "data", "fixtures", `${name}.json`), "utf8"));
    const keys = value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [];
    const collections = keys.filter((key) => Array.isArray(value[key])).map((key) => `${key}[${value[key].length}]`);
    console.log(`${name}.json\n  top-level: ${keys.join(", ") || typeof value}\n  collections: ${collections.join(", ") || "none"}`);
  } catch { console.log(`${name}.json\n  not captured`); }
}
