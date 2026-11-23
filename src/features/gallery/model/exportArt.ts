import type { Puzzle, VisionMapping } from "../../../shared/types";
import { artworkSvg } from "../lib/artwork";

export function downloadArtwork(
  puzzle: Puzzle,
  mapping?: VisionMapping,
  assisted = false,
): void {
  // 未确认映射不得进入导出：安全回退为原色，避免草稿污染作品。
  const useAssisted = assisted && !!mapping?.confirmed;
  const url = URL.createObjectURL(
    new Blob([artworkSvg(puzzle, mapping, useAssisted)], {
      type: "image/svg+xml",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `gejian-${puzzle.id}${useAssisted ? "-assist" : ""}.svg`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
