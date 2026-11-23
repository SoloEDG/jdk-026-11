import type { DisplayCombo, Puzzle, Tint, VisionMapping } from "../../../shared/types";
import { patternBackground } from "./palette";

export interface CellStyle {
  background: string;
  /** 辅助色模式下的组合文字说明，供 aria-label 使用。 */
  comboLabel?: string;
}

// 原色模式：始终使用题目保留的原始配色，语义色身份不合并。
export function originalStyle(puzzle: Puzzle, tint: Tint): CellStyle {
  if (!tint) return { background: "transparent" };
  return { background: puzzle.tints[tint - 1] ?? puzzle.color };
}

// 辅助色模式：仅使用已确认映射；未确认时回退原色，保证工具/导出不被草稿污染。
export function assistedStyle(
  puzzle: Puzzle,
  tint: Tint,
  mapping: VisionMapping | undefined,
): CellStyle {
  if (!tint) return { background: "transparent" };
  const combo: DisplayCombo | undefined = mapping?.confirmed
    ? mapping.entries[tint]
    : undefined;
  if (!combo) return originalStyle(puzzle, tint);
  return { background: patternBackground(combo) };
}

export function hasConfirmedMapping(
  mapping: VisionMapping | undefined,
): boolean {
  return !!mapping?.confirmed && Object.keys(mapping.entries).length > 0;
}
