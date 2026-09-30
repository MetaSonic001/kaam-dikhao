// One command dev runner: API (FastAPI) + web (Next.js). No Docker, no Redis.
//   node scripts/dev.mjs          run both
//   node scripts/dev.mjs api      API only
//   node scripts/dev.mjs setup    create backend/.venv and install Python deps
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(import.meta.url), "..", "..");
const backend = join(root, "backend");
const win = process.platform === "win32";
const venvPy = join(backend, ".venv", win ? "Scripts/python.exe" : "bin/python");
const mode = process.argv[2] ?? "all";

function setup() {
  const sys = win ? "python" : "python3";
  if (!existsSync(venvPy)) spawnSync(sys, ["-m", "venv", join(backend, ".venv")], { stdio: "inherit" });
  const r = spawnSync(venvPy, ["-m", "pip", "install", "-r", join(backend, "requirements.txt")], { stdio: "inherit" });
  process.exit(r.status ?? 0);
}

if (mode === "setup") setup();
if (!existsSync(venvPy)) {
  console.error("Python environment missing. Run:  bun run setup   (or: node scripts/dev.mjs setup)");
  process.exit(1);
}

const procs = [];
function run(name, cmd, args, cwd, color) {
  const p = spawn(cmd, args, { cwd, shell: win && cmd !== venvPy, env: process.env });
  const tag = `\x1b[${color}m[${name}]\x1b[0m `;
  const pipe = (s) => s.on("data", (d) => process.stdout.write(String(d).split("\n").filter(Boolean).map((l) => tag + l).join("\n") + "\n"));
  pipe(p.stdout); pipe(p.stderr);
  p.on("exit", (c) => { console.log(`${tag}exited (${c})`); if (c) shutdown(); });
  procs.push(p);
}
function shutdown() { procs.forEach((p) => { try { p.kill(); } catch { /* ignore */ } }); process.exit(0); }
process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);

run("api", venvPy, ["-m", "uvicorn", "app.main:app", "--port", "8000", "--reload", "--reload-dir", "app"], backend, 36);
if (mode !== "api") run("web", win ? "npx.cmd" : "npx", ["next", "dev", "-p", "3000"], root, 35);
