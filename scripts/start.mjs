import "dotenv/config";
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
let port = process.env.PORT?.trim() || "3000";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    port = args[i + 1];
    i++;
  } else if (args[i].startsWith("--port=")) {
    port = args[i].slice("--port=".length);
  } else {
    console.error(`Unknown start option: ${args[i]}`);
    process.exit(1);
  }
}

if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error("Invalid port. Choose a number from 1 to 65535.");
  process.exit(1);
}

const nextBin = process.platform === "win32" ? "next.cmd" : "next";
const child = spawn(nextBin, ["start", "--port", port], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: process.env,
});

child.on("error", (error) => {
  console.error("Could not start Memora:", error.message);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
