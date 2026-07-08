/** PM2: Next.js em fork (npm + cluster quebra). Escuta só localhost. */
const { execSync } = require("node:child_process");

let gitCommit = "unknown";
try {
  gitCommit = execSync("git rev-parse --short HEAD", { cwd: __dirname + "/../..", encoding: "utf8" }).trim();
} catch {
  /* repo nao git */
}

module.exports = {
  apps: [
    {
      name: "agify",
      cwd: "./apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001 -H 127.0.0.1",
      exec_mode: "fork",
      instances: 1,
      env: {
        NODE_ENV: "production",
        AGIFY_GIT_COMMIT: gitCommit,
      },
      autorestart: true,
      max_memory_restart: "768M",
      listen_timeout: 15000,
      kill_timeout: 5000,
    },
  ],
};
