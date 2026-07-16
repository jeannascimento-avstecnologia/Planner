#!/usr/bin/env node
/**
 * Dispara scripts de ops: .ps1 no Windows, .sh no macOS/Linux.
 * Uso: node scripts/run-script.mjs <nome-sem-extensao> [...args]
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
const extraArgs = process.argv.slice(3);

if (!name) {
  console.error("Uso: node scripts/run-script.mjs <script> [...args]");
  process.exit(1);
}

// Bloqueia path traversal / nomes arbitrarios (apenas scripts locais allowlisted por nome).
if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) {
  console.error("ERRO: nome de script invalido (use apenas alfanumerico, _ e -).");
  process.exit(1);
}

const isWin = process.platform === "win32";
const scriptPath = join(__dirname, `${name}${isWin ? ".ps1" : ".sh"}`);

if (!existsSync(scriptPath)) {
  console.error(`ERRO: script nao encontrado: ${scriptPath}`);
  process.exit(1);
}

const result = isWin
  ? spawnSync(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, ...extraArgs],
      { stdio: "inherit", shell: false },
    )
  : spawnSync("bash", [scriptPath, ...extraArgs], { stdio: "inherit", shell: false });

if (result.error) {
  console.error(result.error.message);
  if (!isWin && result.error.code === "ENOENT") {
    console.error("Instale bash (padrao no macOS/Linux) ou rode via WSL.");
  }
  if (isWin && result.error.code === "ENOENT") {
    console.error("PowerShell nao encontrado no PATH.");
  }
  process.exit(1);
}

process.exit(result.status ?? 1);
