import type { Mark, Puzzle, Session, Tint } from "../../../shared/types";

export const HINT_LIMIT = 3;

export function nextHint(
  puzzle: Puzzle,
  session: Session,
): { index: number; mark: Mark; tint: Tint } | null {
  if (session.hints >= HINT_LIMIT || session.solved) return null;
  if (puzzle.mode === "color") {
    // 优先修正语义色不符的格，其次补齐未处理的空格。
    const index = session.tints.findIndex((tint, i) => {
      const answer = puzzle.solution[i];
      const mark = session.marks[i];
      if (answer) return mark !== "filled" || tint !== answer;
      return mark === "filled";
    });
    if (index < 0) return null;
    const answer = puzzle.solution[index];
    return answer
      ? { index, mark: "filled", tint: answer }
      : { index, mark: "cross", tint: 0 };
  }
  const index = session.marks.findIndex((m, i) =>
    puzzle.solution[i] ? m !== "filled" : m === "filled" || m === "unknown",
  );
  return index < 0
    ? null
    : { index, mark: puzzle.solution[index] ? "filled" : "cross", tint: 1 };
}
