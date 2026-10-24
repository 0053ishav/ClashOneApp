import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const [variant, ...expoArgs] = process.argv.slice(2);
const validVariants = new Set(["development", "preview", "production"]);

if (!validVariants.has(variant)) {
  console.error(
    "Usage: node scripts/run-variant.mjs <development|preview|production> <expo command and arguments>",
  );
  process.exit(1);
}

if (expoArgs.length === 0) {
  console.error("Provide an Expo command, for example: run:android or config.");
  process.exit(1);
}

const cliPath = fileURLToPath(new URL("../node_modules/expo/bin/cli", import.meta.url));
const child = spawn(
  process.execPath,
  [cliPath, ...expoArgs],
  {
    stdio: "inherit",
    env: { ...process.env, APP_VARIANT: variant },
  },
);

child.on("error", (error) => {
  console.error("Failed to start Expo CLI:", error.message);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
