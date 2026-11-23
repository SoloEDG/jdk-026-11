// 语义色编号：0 表示空格，1..k 对应 Puzzle.tints 的下标（黑白题恒为 1）。
export type Tint = number;
export type Mark = "unknown" | "filled" | "cross";
export type Tool = "filled" | "cross" | "unknown";

export interface Puzzle {
  id: string;
  title: string;
  collection: string;
  level: "入门" | "进阶" | "挑战";
  size: number;
  solution: Tint[];
  /** 黑白题为单色；彩色题按语义色身份排列，永远不得为显示方便而合并。 */
  tints: string[];
  mode: "mono" | "color";
  /** 兼容旧数据与旧调用方：黑白题的唯一语义色。 */
  color: string;
}

export interface Move {
  index: number;
  before: Mark;
  after: Mark;
  /** 该步所用的语义色；黑白题为 1。 */
  tint: Tint;
}

export interface Session {
  puzzleId: string;
  /** 每格的语义色标记：0 表示未填涂（unknown/cross 时为 0）。 */
  tints: Tint[];
  marks: Mark[];
  moves: Move[];
  hints: number;
  checks: number;
  seconds: number;
  solved: boolean;
  updatedAt: number;
}

export interface SolveRecord {
  id: string;
  puzzleId: string;
  seconds: number;
  hints: number;
  checks: number;
  finishedAt: number;
}

// ---- 色觉辅助：有限显示组合（4 显示色 × 3 纹样） ----
export interface DisplayCombo {
  colorId: number;
  patternId: number;
}
export interface VisionMapping {
  /** 语义色编号 -> 已确认的显示组合。 */
  entries: Record<number, DisplayCombo>;
  /** 被玩家锁定的语义色编号。 */
  locked: number[];
  /** 映射方案整体是否已确认（未确认不得进入工具与导出）。 */
  confirmed: boolean;
}
export interface GameDocument {
  version: 2;
  activeId: string;
  sessions: Record<string, Session>;
  records: SolveRecord[];
  /** 按题目保存的已确认色觉映射；黑白题不需要。 */
  vision: Record<string, VisionMapping>;
}

export type GameAction =
  | { type: "open"; id: string }
  | { type: "mark"; index: number; mark: Mark; tint: Tint }
  | { type: "undo" }
  | { type: "hint"; index: number; mark: Mark; tint: Tint }
  | { type: "check" }
  | { type: "tick" }
  | { type: "reset" }
  | {
      type: "visionConfirm";
      puzzleId: string;
      entries: Record<number, DisplayCombo>;
      locked: number[];
    }
  | { type: "visionClear"; puzzleId: string };
