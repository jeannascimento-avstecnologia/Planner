"use client";

import { useEffect } from "react";
import { pushRecentBoard } from "@/lib/recent-boards";

type Props = {
  boardId: string;
  boardName: string;
  boardIcon?: string | null;
  boardColor?: string | null;
};

export function TrackRecentBoard({ boardId, boardName, boardIcon, boardColor }: Props) {
  useEffect(() => {
    pushRecentBoard(boardId, boardName, { icon: boardIcon, color: boardColor });
  }, [boardId, boardName, boardIcon, boardColor]);

  return null;
}
