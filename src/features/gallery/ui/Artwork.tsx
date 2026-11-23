import type { Puzzle, Tint, VisionMapping } from "../../../shared/types";
import { assistedStyle, originalStyle } from "../../vision";

export function Artwork({
  puzzle,
  vision,
  assisted,
}: {
  puzzle: Puzzle;
  vision?: VisionMapping;
  assisted: boolean;
}) {
  const styleFor = (tint: Tint) =>
    assisted ? assistedStyle(puzzle, tint, vision) : originalStyle(puzzle, tint);
  return (
    <div
      className="artwork"
      style={{ gridTemplateColumns: `repeat(${puzzle.size},1fr)` }}
      aria-label={puzzle.title}
    >
      {puzzle.solution.map((tint, i) => (
        <span key={i} style={styleFor(tint)} />
      ))}
    </div>
  );
}
