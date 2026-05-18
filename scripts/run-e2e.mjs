import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

const serverUrl = "http://127.0.0.1:5173";
const viteBin = "node_modules/vite/bin/vite.js";
const playwrightBin = "node_modules/@playwright/test/cli.js";

async function serverIsReady() {
  try {
    const response = await fetch(serverUrl);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 30_000) {
    if (await serverIsReady()) return;
    await delay(400);
  }

  throw new Error(`Timed out waiting for ${serverUrl}`);
}

function run(command, args, options = {}) {
  return spawn(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });
}

let viteProcess = null;

if (!(await serverIsReady())) {
  viteProcess = run(process.execPath, [viteBin, "--host", "127.0.0.1", "--strictPort"]);
  await waitForServer();
}

const testArgs = ["test", ...process.argv.slice(2)];
const playwrightProcess = run(process.execPath, [playwrightBin, ...testArgs], {
  env: {
    ...process.env,
    CODEARCH_SKIP_WEB_SERVER: "1",
  },
});

const [code] = await once(playwrightProcess, "exit");

if (viteProcess) {
  viteProcess.kill();
}

process.exit(code ?? 1);
