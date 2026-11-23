import { Grid2X2, Check } from "lucide-react";
import type { Puzzle, Session } from "../../../shared/types";
import { completion } from "../../../shared/document";
import { difficultyDots } from "../lib/filter";

export function PuzzleCard({
  puzzle,
  index,
  session,
  selected,
  onOpen,
}: {
  puzzle: Puzzle;
  index: number;
  session?: Session;
  selected: boolean;
  onOpen: () => void;
}) {
  const progress = session ? completion(session) : 0;
  const number = (index + 1).toString().padStart(2, "0");
  return (
    <button
      className={`puzzle-card ${selected ? "selected" : ""}`}
      onClick={onOpen}
    >
      <span
        className="puzzle-icon"
        style={
          puzzle.mode === "color"
            ? {
                background: `conic-gradient(${puzzle.tints.join(",")}, ${puzzle.tints[0]})`,
                color: "#fff",
              }
            : { color: puzzle.color }
        }
      >
        {session?.solved ? <Check size={22} /> : <Grid2X2 size={22} />}
      </span>
      <span className="puzzle-info">
        <strong>{session?.solved ? puzzle.title : `图案 ${number}`}</strong>
        <small>
          {puzzle.size} × {puzzle.size}
          <i /> {puzzle.collection}
          {puzzle.mode === "color" && (
            <>
              <i /> 彩色
            </>
          )}
        </small>
        <span className="mini-track">
          <span style={{ width: progress + "%" }} />
        </span>
      </span>
      <span className="puzzle-meta">
        <span className="difficulty">
          {"●".repeat(difficultyDots(puzzle.level))}
          {"○".repeat(3 - difficultyDots(puzzle.level))}
        </span>
        <small>
          {session?.solved ? "已完成" : progress ? progress + "%" : "未开始"}
        </small>
      </span>
    </button>
  );
}
