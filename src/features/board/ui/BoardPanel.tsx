import { useState } from "react";
import { Clock3, CheckCircle2, MousePointer2 } from "lucide-react";
import { clueSet, colorClueSet } from "../../../shared/clues";
import type { Puzzle, Session, Tool, VisionMapping } from "../../../shared/types";
import { completion } from "../../../shared/document";
import { lineStatuses } from "../lib/lineStatus";
import { BoardToolbar, type BoardTool } from "./BoardToolbar";
import { Clue } from "./Clue";
import { assistedStyle, originalStyle, hasConfirmedMapping } from "../../vision";

export function BoardPanel({
  puzzle,
  session,
  visionMapping,
  assistView,
  onMark,
  onUndo,
  onReset,
}: {
  puzzle: Puzzle;
  session: Session;
  visionMapping?: VisionMapping;
  assistView: boolean;
  onMark: (i: number, mark: Tool, tint: number) => void;
  onUndo: () => void;
  onReset: () => void;
}) {
  const [tool, setTool] = useState<BoardTool>({ kind: "filled", tint: 1 });
  const isColor = puzzle.mode === "color";
  const monoClues = clueSet(puzzle.size, puzzle.solution);
  const colorClues = colorClueSet(puzzle.size, puzzle.solution);
  const statuses = lineStatuses(puzzle, session.marks, session.tints);

  // 渲染层：只有已确认映射才启用辅助色；未确认时一律原色，草稿不污染外观。
  const useAssisted = assistView && hasConfirmedMapping(visionMapping);
  const cellStyle = (tint: number) =>
    useAssisted
      ? assistedStyle(puzzle, tint, visionMapping)
      : originalStyle(puzzle, tint);

  const place = (i: number) => {
    const sameMark = session.marks[i] === tool.kind;
    const sameTint = session.tints[i] === (tool.kind === "filled" ? tool.tint : 0);
    if (sameMark && sameTint) onMark(i, "unknown", 0);
    else onMark(i, tool.kind, tool.tint);
  };

  return (
    <section className="board-panel panel">
      <div className="board-heading">
        <div>
          <span className="eyebrow">
            A LITTLE DISCOVERY · {puzzle.collection}
            {isColor ? " · 彩色数织" : ""}
          </span>
          <h1>
            {session.solved ? puzzle.title : "一格一格，拼出惊喜"}
            <span className="level-tag">{puzzle.level}</span>
          </h1>
        </div>
        <div className="timer">
          <Clock3 size={15} />
          {Math.floor(session.seconds / 60)
            .toString()
            .padStart(2, "0")}
          :{(session.seconds % 60).toString().padStart(2, "0")}
        </div>
      </div>
      <BoardToolbar
        puzzle={puzzle}
        tool={tool}
        swatch={(tint) => cellStyle(tint)}
        onTool={setTool}
        onUndo={onUndo}
        onReset={onReset}
        canUndo={session.moves.length > 0}
        disabled={session.solved}
      />
      <div className="board-stage">
        <div
          className="puzzle-grid"
          style={{
            gridTemplateColumns: `64px repeat(${puzzle.size}, var(--cell))`,
            gridTemplateRows: `64px repeat(${puzzle.size}, var(--cell))`,
          }}
        >
          <div className="grid-corner">
            <span>
              {puzzle.size}×{puzzle.size}
            </span>
            <small>{isColor ? "COLOR NONOGRAM" : "NONOGRAM"}</small>
          </div>
          {Array.from({ length: puzzle.size }, (_, c) => (
            <Clue
              key={"c" + c}
              values={monoClues[puzzle.size + c]}
              colorRuns={isColor ? colorClues[puzzle.size + c] : undefined}
              done={statuses[puzzle.size + c]}
              vertical
              puzzle={puzzle}
              cellStyle={cellStyle}
            />
          ))}
          {Array.from({ length: puzzle.size }, (_, row) => (
            <div className="grid-row" key={row}>
              <Clue
                values={monoClues[row]}
                colorRuns={isColor ? colorClues[row] : undefined}
                done={statuses[row]}
                puzzle={puzzle}
                cellStyle={cellStyle}
              />
              {Array.from({ length: puzzle.size }, (_, col) => {
                const i = row * puzzle.size + col;
                const mark = session.marks[i];
                const tint = session.tints[i];
                const fillStyle =
                  mark === "filled" ? cellStyle(tint) : undefined;
                return (
                  <button
                    key={col}
                    aria-label={`第${row + 1}行第${col + 1}列 ${
                      mark === "filled"
                        ? `已填语义色${tint}`
                        : mark === "cross"
                          ? "标空"
                          : "未知"
                    }`}
                    className={`cell ${mark} ${(col + 1) % 5 === 0 ? "major-right" : ""} ${(row + 1) % 5 === 0 ? "major-bottom" : ""}`}
                    style={fillStyle}
                    disabled={session.solved}
                    onClick={() => place(i)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onMark(i, mark === "cross" ? "unknown" : "cross", 0);
                    }}
                  >
                    {mark === "cross" ? "×" : ""}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="board-footer">
        <span>
          <MousePointer2 size={14} />{" "}
          {isColor
            ? "左键按当前语义色填涂 · 右键标空 · 同色连续段须隔空，异色可相接"
            : "左键填涂 · 右键标空"}
        </span>
        <span>
          <span className="status-dot" /> {statuses.filter(Boolean).length} /{" "}
          {puzzle.size * 2} 条线已满足
        </span>
      </div>
      <div className="progress-caption">
        <span>
          {session.solved ? (
            <>
              <CheckCircle2 size={15} />
              图案已揭晓
            </>
          ) : (
            "每一小步，都离答案更近"
          )}
        </span>
        <strong>{completion(session)}% 已标记</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: completion(session) + "%" }} />
      </div>
    </section>
  );
}
