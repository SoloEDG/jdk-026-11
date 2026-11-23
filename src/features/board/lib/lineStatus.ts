import { clueSet, colorClueSet, colorRuns, runs } from "../../../shared/clues";
import type { Mark, Puzzle, Tint } from "../../../shared/types";

export function lineStatuses(
  puzzle: Puzzle,
  marks: Mark[],
  tints: Tint[] = [],
): boolean[] {
  if (puzzle.mode === "color") {
    return colorLineStatuses(puzzle, tints);
  }
  const clues = clueSet(puzzle.size, puzzle.solution);
  return clues.map((clue, line) => {
    const values = Array.from({ length: puzzle.size }, (_, i) =>
      marks[
        line < puzzle.size
          ? line * puzzle.size + i
          : i * puzzle.size + line - puzzle.size
      ] === "filled"
        ? 1
        : 0,
    );
    return JSON.stringify(runs(values)) === JSON.stringify(clue);
  });
}

// 彩色模式：用玩家每格标记的语义色（tints）与答案的彩色线索逐线比较。
export function colorLineStatuses(
  puzzle: Puzzle,
  tints: Tint[],
): boolean[] {
  const clues = colorClueSet(puzzle.size, puzzle.solution);
  return clues.map((clue, line) => {
    const values = Array.from({ length: puzzle.size }, (_, i) =>
      tints[
        line < puzzle.size
          ? line * puzzle.size + i
          : i * puzzle.size + line - puzzle.size
      ],
    );
    return JSON.stringify(colorRuns(values)) === JSON.stringify(clue);
  });
}
