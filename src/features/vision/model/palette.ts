import type { DisplayCombo } from "../../../shared/types";

// 最多四种显示色：彼此色相差异大、对常见色觉障碍友好。
export const DISPLAY_COLORS: { id: number; hex: string; name: string }[] = [
  { id: 0, hex: "#2f6db3", name: "蓝" },
  { id: 1, hex: "#e08a2b", name: "橙" },
  { id: 2, hex: "#3f9d6e", name: "绿" },
  { id: 3, hex: "#b8456f", name: "品红" },
];

// 最多三种纹样：纯色、斜纹、点阵。
export const PATTERNS: { id: number; name: string }[] = [
  { id: 0, name: "纯色" },
  { id: 1, name: "斜纹" },
  { id: 2, name: "点阵" },
];

export const ALL_COMBOS: DisplayCombo[] = DISPLAY_COLORS.flatMap((c) =>
  PATTERNS.map((p) => ({ colorId: c.id, patternId: p.id })),
);

export function comboKey(combo: DisplayCombo): string {
  return `${combo.colorId}-${combo.patternId}`;
}

export function comboOf(
  entries: Record<number, DisplayCombo>,
  tint: number,
): DisplayCombo | undefined {
  return entries[tint];
}

export function displayHex(combo: DisplayCombo): string {
  return DISPLAY_COLORS[combo.colorId]?.hex ?? "#8a97a8";
}

// 纹样以可复用的 CSS 背景表达，配合显示色叠加。
export function patternBackground(combo: DisplayCombo): string {
  const hex = displayHex(combo);
  if (combo.patternId === 1) {
    return `repeating-linear-gradient(45deg, ${hex}, ${hex} 4px, #ffffff 4px, #ffffff 7px)`;
  }
  if (combo.patternId === 2) {
    return `radial-gradient(circle, ${hex} 38%, #ffffff 42%) 0 0 / 7px 7px`;
  }
  return hex;
}

export function comboName(combo: DisplayCombo): string {
  const color = DISPLAY_COLORS[combo.colorId]?.name ?? "?";
  const pattern = PATTERNS[combo.patternId]?.name ?? "?";
  return `${color}·${pattern}`;
}
