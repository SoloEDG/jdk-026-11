import type { ColorRun } from "../../../shared/clues";
import type { Puzzle } from "../../../shared/types";

export function Clue({
  values,
  colorRuns: runs,
  done,
  vertical,
  puzzle,
  cellStyle,
}: {
  values: number[];
  colorRuns?: ColorRun[];
  done: boolean;
  vertical?: boolean;
  puzzle: Puzzle;
  cellStyle?: (tint: number) => { background: string };
}) {
  const label = runs
    ? (runs.length === 0
        ? "0"
        : runs.map((r) => `${r.length}格·语义色${r.tint}`).join("、")) +
      (done ? " 已满足" : "")
    : values.join("、") + (done ? " 已满足" : "");
  return (
    <div
      className={`clue ${vertical ? "vertical" : ""} ${done ? "done" : ""}`}
      aria-label={label}
    >
      {runs ? (
        runs.length === 0 ? (
          <span className="clue-zero">0</span>
        ) : (
          runs.map((run, i) => (
            <span className="clue-chip" key={i}>
              <i
                className="clue-dot"
                style={
                  cellStyle
                    ? cellStyle(run.tint)
                    : { background: puzzle.tints[run.tint - 1] }
                }
              />
              {run.length}
            </span>
          ))
        )
      ) : (
        values.map((v, i) => <span key={i}>{v}</span>)
      )}
    </div>
  );
}
