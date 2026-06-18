import { ProjectBoardTile } from "./project-board-tile";
import type { BoardMember } from "@/components/board/share-project-panel";
import type { ProjectBoardRow } from "./types";

type Props = {
  boards: ProjectBoardRow[];
  boardMembersByBoardId: Record<string, BoardMember[]>;
  isOrgAdmin: boolean;
  currentUserId?: string | null;
  hubMode?: boolean;
  selectedBoardId?: string | null;
  onSelectBoard?: (id: string) => void;
};

export function ProjectsGridView({
  boards,
  boardMembersByBoardId,
  isOrgAdmin,
  currentUserId,
  hubMode = false,
  selectedBoardId,
  onSelectBoard,
}: Props) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {boards.map((board) => (
        <li key={board.id} className="group">
          <ProjectBoardTile
            board={board}
            members={boardMembersByBoardId[board.id] ?? []}
            isOrgAdmin={isOrgAdmin}
            currentUserId={currentUserId}
            variant="grid"
            hubMode={hubMode}
            selected={hubMode && selectedBoardId === board.id}
            onSelect={onSelectBoard}
          />
        </li>
      ))}
      {boards.length === 0 ? (
        <li className="text-sm text-aurora-muted">Nenhum projeto ainda. Crie o primeiro acima.</li>
      ) : null}
    </ul>
  );
}
