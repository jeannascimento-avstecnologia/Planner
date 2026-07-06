"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { presenceColor } from "@/lib/presence-color";

export type PresenceState = {
  userId: string;
  displayName: string;
  cursor: { x: number; y: number } | null;
  color: string;
};

type Props = {
  boardId: string;
  userId: string;
  displayName: string;
};

export function useBoardPresence({ boardId, userId, displayName }: Props) {
  const [others, setOthers] = useState<PresenceState[]>([]);
  const lastSent = useRef({ x: 0, y: 0, t: 0 });
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase.channel(`presence:board:${boardId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, PresenceState[]>;
        const list = Object.values(state).flat().filter((p) => p.userId !== userId);
        setOthers(list);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId,
            displayName,
            cursor: null,
            color: presenceColor(userId),
          });
        }
      });

    const onMove = (e: MouseEvent) => {
      const now = Date.now();
      const dx = e.clientX - lastSent.current.x;
      const dy = e.clientY - lastSent.current.y;
      if (now - lastSent.current.t < 100) return;
      if (Math.hypot(dx, dy) < 5) return;
      lastSent.current = { x: e.clientX, y: e.clientY, t: now };
      void channel.track({
        userId,
        displayName,
        cursor: { x: e.clientX, y: e.clientY },
        color: presenceColor(userId),
      });
    };

    window.addEventListener("mousemove", onMove);
    return () => {
      window.removeEventListener("mousemove", onMove);
      void supabase.removeChannel(channel);
    };
  }, [boardId, displayName, supabase, userId]);

  return others;
}
