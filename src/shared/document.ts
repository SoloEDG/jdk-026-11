import type { GameDocument, Puzzle, Session } from "./types";

export function newSession(puzzle: Puzzle): Session {
  const total = puzzle.size ** 2;
  return {
    puzzleId: puzzle.id,
    marks: Array(total).fill("unknown"),
    tints: Array(total).fill(0),
    moves: [],
    hints: 0,
    checks: 0,
    seconds: 0,
    solved: false,
    updatedAt: Date.now(),
  };
}

export function newDocument(puzzle: Puzzle): GameDocument {
  return {
    version: 2,
    activeId: puzzle.id,
    sessions: { [puzzle.id]: newSession(puzzle) },
    records: [],
    vision: {},
  };
}

export function completion(session: Session): number {
  return Math.round(
    (session.marks.filter((m) => m !== "unknown").length /
      session.marks.length) *
      100,
  );
}

export function isSolved(puzzle: Puzzle, session: Session): boolean {
  if (puzzle.mode === "color") {
    // 每格的语义色必须与答案完全一致；cross/unknown 都只能落在空格上。
    return session.tints.every((tint, i) => tint === puzzle.solution[i]);
  }
  return session.marks.every((mark, i) =>
    puzzle.solution[i] ? mark === "filled" : mark !== "filled",
  );
}
