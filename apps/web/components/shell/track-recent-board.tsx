"use client";

import { useEffect } from "react";
import { pushRecentBoard } from "@/lib/recent-boards";

type Props = { boardId: string; boardName: string };

export function TrackRecentBoard({ boardId, boardName }: Props) {
  useEffect(() => {
    pushRecentBoard(boardId, boardName);
  }, [boardId, boardName]);

  return null;
}
