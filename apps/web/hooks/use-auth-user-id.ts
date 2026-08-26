"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Fallback quando o parent nao passa currentUserId (ex.: board-view legado). */
export function useAuthUserId(propUserId?: string | null): string | null {
  const [userId, setUserId] = useState<string | null>(propUserId ?? null);

  useEffect(() => {
    if (propUserId) {
      setUserId(propUserId);
      return;
    }
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, [propUserId]);

  return propUserId ?? userId;
}
