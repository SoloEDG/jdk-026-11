import type { GameDocument, Puzzle, Tint, VisionMapping } from "../../../shared/types";
import {
  DISPLAY_COLORS,
  PATTERNS,
  comboKey,
} from "../../vision/model/palette";
import { hasConfirmedMapping } from "../../vision";

export function unlockedArt(
  puzzles: Puzzle[],
  document: GameDocument,
): Puzzle[] {
  return puzzles.filter((p) =>
    document.records.some((r) => r.puzzleId === p.id),
  );
}

function patternFill(
  defs: string[],
  combo: { colorId: number; patternId: number },
): string {
  const id = `cv-${comboKey(combo)}`;
  const hex = DISPLAY_COLORS[combo.colorId]?.hex ?? "#8a97a8";
  if (defs.some((d) => d.includes(`id="${id}"`))) return `url(#${id})`;
  if (combo.patternId === 0) return hex;
  if (combo.patternId === 1) {
    defs.push(
      `<pattern id="${id}" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fff"/><rect width="3" height="6" fill="${hex}"/></pattern>`,
    );
  } else {
    defs.push(
      `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fff"/><circle cx="3" cy="3" r="1.6" fill="${hex}"/></pattern>`,
    );
  }
  return `url(#${id})`;
}

function fillFor(
  puzzle: Puzzle,
  tint: Tint,
  mapping: VisionMapping | undefined,
  assisted: boolean,
  defs: string[],
): string {
  if (!tint) return "transparent";
  if (assisted && hasConfirmedMapping(mapping)) {
    const combo = mapping!.entries[tint];
    if (combo) return patternFill(defs, combo);
  }
  return puzzle.tints[tint - 1] ?? puzzle.color;
}

// assisted=true 且映射未确认时，调用方应阻止导出；这里安全回退原色。
export function artworkSvg(
  puzzle: Puzzle,
  mapping?: VisionMapping,
  assisted = false,
): string {
  const defs: string[] = [];
  const rects = puzzle.solution
    .map((tint, i) => {
      if (!tint) return "";
      const fill = fillFor(puzzle, tint, mapping, assisted, defs);
      return `<rect x="${i % puzzle.size}" y="${Math.floor(i / puzzle.size)}" width="1" height="1" fill="${fill}"/>`;
    })
    .join("");
  const defsBlock = defs.length ? `<defs>${defs.join("")}</defs>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${puzzle.size} ${puzzle.size}"><rect width="100%" height="100%" fill="#f2f4f8"/>${defsBlock}${rects}</svg>`;
}

// 供 UI 判断辅助色导出是否可用（必须有已确认映射）。
export function canExportAssisted(mapping: VisionMapping | undefined): boolean {
  return hasConfirmedMapping(mapping);
}

export const patternCount = PATTERNS.length;
