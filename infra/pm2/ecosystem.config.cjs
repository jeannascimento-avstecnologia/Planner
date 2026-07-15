/** PM2: Next.js em fork (npm + cluster quebra). Escuta só localhost. */
const path = require("node:path");
const { execSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../..");
const webRoot = path.join(repoRoot, "apps/web");

let gitCommit = "unknown";
try {
  gitCommit = execSync("git rev-parse --short HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
} catch {
  /* repo nao git */
}

module.exports = {
  apps: [
    {
      name: "agify",
      cwd: webRoot,
      // Hoisted no monorepo: next vive em <repo>/node_modules
      script: path.join(repoRoot, "node_modules/next/dist/bin/next"),
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
