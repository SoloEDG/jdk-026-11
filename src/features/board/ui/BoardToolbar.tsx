import { Square, X, Eraser, Undo2, RotateCcw } from "lucide-react";
import type { Puzzle, Tool } from "../../../shared/types";

export interface BoardTool {
  kind: Tool;
  tint: number;
}

export function BoardToolbar({
  puzzle,
  tool,
  swatch,
  onTool,
  onUndo,
  onReset,
  canUndo,
  disabled,
}: {
  puzzle: Puzzle;
  tool: BoardTool;
  swatch: (tint: number) => { background: string };
  onTool: (t: BoardTool) => void;
  onUndo: () => void;
  onReset: () => void;
  canUndo: boolean;
  disabled: boolean;
}) {
  const isActive = (kind: Tool, tint = 0) =>
    tool.kind === kind && tool.tint === tint;
  return (
    <div className="board-toolbar">
      <div className="tool-group">
        {puzzle.mode === "color" ? (
          puzzle.tints.map((_, i) => {
            const tint = i + 1;
            return (
              <button
                key={tint}
                aria-pressed={isActive("filled", tint)}
                className={isActive("filled", tint) ? "active" : ""}
                onClick={() => onTool({ kind: "filled", tint })}
                disabled={disabled}
                title={`语义色 ${tint} 填涂`}
              >
                <span className="tool-swatch" style={swatch(tint)} />
                填色 {tint}
              </button>
            );
          })
        ) : (
          <button
            aria-pressed={isActive("filled", 1)}
            className={isActive("filled", 1) ? "active" : ""}
            onClick={() => onTool({ kind: "filled", tint: 1 })}
            disabled={disabled}
          >
            <Square size={16} />
            填涂
          </button>
        )}
        <button
          aria-pressed={isActive("cross")}
          className={isActive("cross") ? "active" : ""}
          onClick={() => onTool({ kind: "cross", tint: 0 })}
          disabled={disabled}
        >
          <X size={16} />
          标空
        </button>
        <button
          aria-pressed={isActive("unknown")}
          className={isActive("unknown") ? "active" : ""}
          onClick={() => onTool({ kind: "unknown", tint: 0 })}
          disabled={disabled}
        >
          <Eraser size={16} />
          擦除
        </button>
      </div>
      <div className="tool-group">
        <button
          aria-label="撤销上一步"
          title="撤销上一步"
          onClick={onUndo}
          disabled={!canUndo || disabled}
        >
          <Undo2 size={17} />
        </button>
        <button aria-label="重新开始" title="重新开始" onClick={onReset}>
          <RotateCcw size={17} />
        </button>
      </div>
    </div>
  );
}
