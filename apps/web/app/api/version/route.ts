import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

function resolveGitCommit(): string {
  // Preferir git no disco: AGIFY_GIT_COMMIT no PM2 fica stale apos `pm2 restart` sem delete.
  try {
    const repoRoot = path.join(process.cwd(), "..", "..");
    return execSync("git rev-parse --short HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
  } catch {
    return (
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
      process.env.AGIFY_GIT_COMMIT?.slice(0, 7) ??
      "local"
    );
  }
}

/** GET /api/version — BUILD_ID + commit para validar deploy no servidor. */
export async function GET() {
  let buildId = "unknown";
  try {
    buildId = readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    /* dev sem build */
  }

  return NextResponse.json(
    {
      buildId,
      commit: resolveGitCommit(),
      features: {
        calendarDnD: true,
        plan: true,
        help: true,
        workload: true,
      },
    },
    {
      headers: { "Cache-Control": "no-store" },
    },
  );
}
