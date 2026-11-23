export { VisionPanel } from "./ui/VisionPanel";
export {
  DISPLAY_COLORS,
  PATTERNS,
  ALL_COMBOS,
  displayHex,
  patternBackground,
  comboName,
  comboKey,
} from "./model/palette";
export {
  adjacency,
  affectedRegions,
  autoAssign,
  findConflicts,
  validateMapping,
  semanticTints,
} from "./model/mapping";
export type { AssignmentResult, MappingConflict } from "./model/mapping";
export { assistedStyle, originalStyle, hasConfirmedMapping } from "./model/display";
