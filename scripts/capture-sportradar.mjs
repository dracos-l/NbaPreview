import { readFileSync } from "node:fs";
import { appendFile, access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const fixtureDir = path.join(root, "data", "fixtures");
const dataDir = path.join(root, "data");
const counterPath = path.join(dataDir, "sportradar-api-counter.json");
const logPath = path.join(dataDir, "sportradar-api-log.jsonl");
const BOSTON_CELTICS_ID = "583eccfa-fb46-11e1-82cb-f4ce4684ea4c";
const allowed = new Set(["team-profile", "depth-chart", "seasonal-stats", "injuries", "transfers", "news", "change-log"]);

function loadLocalEnv() {
  try {
    for (const line of readFileSync(path.join(root, ".env.local"), "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['\"]|['\"]$/g, "");
    }
  } catch { /* .env.local is intentionally optional for dry runs */ }
}
function argValue(flag) { const index = process.argv.indexOf(flag); return index === -1 ? undefined : process.argv[index + 1]; }
function requireDate(value) { if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) throw new Error("Use --date YYYY-MM-DD."); return value; }
function requireDelay(value) {
  const delay = Number(value ?? "1500");
  if (!Number.isInteger(delay) || delay < 0) throw new Error("Use --delay-ms with a non-negative integer.");
  return delay;
}
function urlFor(name, date, season) {
  const [year, month, day] = date.split("-");
  const nbaBase = process.env.SPORTRADAR_NBA_BASE_URL ?? "https://api.sportradar.com";
  const nbaAccess = process.env.SPORTRADAR_NBA_ACCESS_LEVEL ?? "trial";
  const editorialBase = process.env.SPORTRADAR_EDITORIAL_BASE_URL ?? "https://api.sportradar.com";
  const editorialAccess = process.env.SPORTRADAR_EDITORIAL_ACCESS_LEVEL ?? "t";
  const provider = process.env.SPORTRADAR_EDITORIAL_PROVIDER ?? "ap";
  const nba = `${nbaBase}/nba/${nbaAccess}/v8/en`;
  return {
    "team-profile": `${nba}/teams/${BOSTON_CELTICS_ID}/profile.json`,
    "depth-chart": `${nba}/teams/${BOSTON_CELTICS_ID}/depth_chart.json`,
    "seasonal-stats": `${nba}/seasons/${season}/REG/teams/${BOSTON_CELTICS_ID}/statistics.json`,
    injuries: `${nba}/league/${year}/${month}/${day}/daily_injuries.json`,
    transfers: `${nba}/league/${year}/${month}/${day}/transfers.json`,
    "change-log": `${nba}/league/${year}/${month}/${day}/changes.json`,
    news: `${editorialBase}/content-nba-${editorialAccess}3/${provider}/news/${year}/${month}/${day}/all.json`,
  }[name];
}
async function recordCall(url, status, responseBytes) {
  await mkdir(dataDir, { recursive: true });
  let count = 0;
  try { count = JSON.parse(await readFile(counterPath, "utf8")).count ?? 0; } catch { /* first call */ }
  const entry = { at: new Date().toISOString(), count: count + 1, url: new URL(url).pathname, status, responseBytes };
  await Promise.all([writeFile(counterPath, JSON.stringify({ count: count + 1, updatedAt: entry.at }, null, 2) + "\n"), appendFile(logPath, JSON.stringify(entry) + "\n")]);
}

loadLocalEnv();
const live = process.argv.includes("--live");
const force = process.argv.includes("--force");
const selected = argValue("--only") ?? "all";
const targets = selected === "all" ? [...allowed] : selected.split(",");
if (!targets.every((item) => allowed.has(item))) throw new Error(`--only accepts: ${[...allowed].join(", ")}`);
const date = requireDate(argValue("--date") ?? new Date().toISOString().slice(0, 10));
const season = argValue("--season") ?? String(Number(date.slice(0, 4)) - 1);
const delayMs = requireDelay(argValue("--delay-ms"));
if (!live) {
  console.log(`Dry run: would capture ${targets.join(", ")} for ${date}; no API request was made. Add --live to proceed.`);
  process.exit(0);
}
if (process.env.SPORTRADAR_USE_FIXTURES === "true") throw new Error("Set SPORTRADAR_USE_FIXTURES=false in .env.local before a live capture.");
if (!process.env.SPORTRADAR_API_KEY) throw new Error("SPORTRADAR_API_KEY is missing from .env.local.");
await mkdir(fixtureDir, { recursive: true });
for (const [index, name] of targets.entries()) {
  if (index > 0 && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  const destination = path.join(fixtureDir, `${name}.json`);
  try { await access(destination); if (!force) throw new Error(`${destination} already exists; use --force to overwrite it.`); } catch (error) { if (error?.code !== "ENOENT") throw error; }
  const url = urlFor(name, date, season);
  console.log(`Fetching ${name}…`);
  const response = await fetch(url, { headers: { "x-api-key": process.env.SPORTRADAR_API_KEY, accept: "application/json" } });
  const body = await response.text();
  await recordCall(url, response.status, Buffer.byteLength(body));
  if (!response.ok) throw new Error(`${name} failed (${response.status}): ${body.slice(0, 500)}`);
  JSON.parse(body);
  await writeFile(destination, body.endsWith("\n") ? body : `${body}\n`);
}
console.log(`Captured ${targets.length} fixture(s). Inspect before adding normalized models: npm run sportradar:inspect`);
