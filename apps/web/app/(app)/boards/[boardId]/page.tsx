import { Suspense } from "react";
import { getSessionUser } from "@/lib/loaders/session";
import { loadBoardSnapshotCached } from "@/lib/loaders/board-cache";
import { BoardView } from "@/components/board/board-view";
import { BoardThemeScope } from "@/components/board/board-theme-scope";
import { TrackRecentBoard } from "@/components/shell/track-recent-board";
import { BoardSkeleton } from "@/components/ui/skeleton";

async function BoardPageContent({ boardId }: { boardId: string }) {
  const user = await getSessionUser();
  const snapshot = await loadBoardSnapshotCached(boardId, user?.id ?? "anon");

  return (
    <>
      <TrackRecentBoard
        boardId={snapshot.board.id}
        boardName={snapshot.board.name}
        boardIcon={snapshot.board.icon}
        boardColor={snapshot.board.color}
      />
      <BoardThemeScope color={snapshot.board.color}>
        <BoardView
          board={snapshot.board}
          orgName={snapshot.orgName}
          orgLogoUrl={snapshot.orgLogoUrl}
          columns={snapshot.columns}
          cards={snapshot.cards}
          stages={snapshot.stages}
          tags={snapshot.tags}
          members={snapshot.members}
          boardMembers={snapshot.boardMembers}
          profilesById={snapshot.profilesById}
          isOrgAdmin={snapshot.isOrgAdmin}
          currentUserId={user?.id ?? null}
          writeAuthz={snapshot.writeAuthz}
        />
      </BoardThemeScope>
    </>
  );
}

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <BoardPageContent boardId={boardId} />
    </Suspense>
  );
}
