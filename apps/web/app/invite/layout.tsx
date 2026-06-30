import { warnProductionEmailEnv } from "@/lib/env-server";

warnProductionEmailEnv();

export default function InviteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
