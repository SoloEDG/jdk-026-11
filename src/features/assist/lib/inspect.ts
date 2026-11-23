import type { Puzzle, Session } from "../../../shared/types";

export interface InspectResult {
  filled: number;
  crossed: number;
  errors: number;
  /** 彩色模式：每个语义色已正确填涂的格数（下标 1..k）。 */
  perTint: number[];
}

export function inspect(puzzle: Puzzle, session: Session): InspectResult {
  const perTint = Array(puzzle.tints.length + 1).fill(0);
  let errors = 0;
  session.marks.forEach((mark, i) => {
    const answer = puzzle.solution[i];
    if (puzzle.mode === "color") {
      if (mark === "filled") {
        if (session.tints[i] === answer && answer) perTint[answer]++;
        else errors++; // 空格被填，或语义色不对
      } else if (mark === "cross" && answer) {
        errors++;
      }
      return;
    }
    if (
      (mark === "filled" && !answer) ||
      (mark === "cross" && !!answer)
    ) {
      errors++;
    }
  });
  return {
    filled: session.marks.filter((m) => m === "filled").length,
    crossed: session.marks.filter((m) => m === "cross").length,
    errors,
    perTint,
  };
}
