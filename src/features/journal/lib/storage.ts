import type {
  GameDocument,
  Mark,
  Puzzle,
  Session,
  Tint,
  VisionMapping,
} from "../../../shared/types";
import { newDocument, newSession, isSolved } from "../../../shared/document";

const KEY = "gejian.document.v1";

function isValidMark(m: unknown): m is Mark {
  return m === "filled" || m === "unknown" || m === "cross";
}

// 把任意存档里的单个会话规整为当前结构；不合法则返回 null（该题丢弃，原件不动）。
function migrateSession(puzzle: Puzzle, saved: unknown): Session | null {
  if (!saved || typeof saved !== "object") return null;
  const raw = saved as {
    marks?: unknown;
    tints?: unknown;
    moves?: unknown;
    hints?: unknown;
    checks?: unknown;
    seconds?: unknown;
  };
  const total = puzzle.size ** 2;
  if (!Array.isArray(raw.marks) || raw.marks.length !== total) return null;
  if (!raw.marks.every(isValidMark)) return null;
  const marks = raw.marks as Mark[];

  // tints：新存档直接沿用；旧黑白存档由 filled 推导出单色 1。
  let tints: Tint[];
  if (Array.isArray(raw.tints) && raw.tints.length === total) {
    tints = raw.tints.map((t) => {
      const n = Number(t);
      return Number.isInteger(n) && n >= 0 && n <= puzzle.tints.length ? n : 0;
    });
  } else {
    tints = marks.map((m) => (m === "filled" ? 1 : 0));
  }
  // 交叉校验：非填涂格不得带语义色。
  tints = tints.map((t, i) => (marks[i] === "filled" ? t : 0));

  // 旧存档的 moves 没有 tint 字段：按 before/after 补出语义色，避免撤销写入脏值。
  const moves = Array.isArray(raw.moves)
    ? raw.moves.slice(-500).map((mv) => {
        const m = mv as {
          index?: unknown;
          before?: unknown;
          after?: unknown;
          tint?: unknown;
        };
        const index = Number(m.index);
        if (!Number.isInteger(index) || !isValidMark(m.before) || !isValidMark(m.after))
          return null;
        const tintNum = Number(m.tint);
        const tint =
          Number.isInteger(tintNum) && tintNum >= 1 && tintNum <= puzzle.tints.length
            ? tintNum
            : 1;
        return { index, before: m.before, after: m.after, tint };
      }).filter((m): m is NonNullable<typeof m> => m !== null)
    : [];
  const session: Session = {
    ...newSession(puzzle),
    marks,
    tints,
    moves,
    hints: Math.min(3, Math.max(0, Number(raw.hints) || 0)),
    checks: Math.max(0, Number(raw.checks) || 0),
    seconds: Math.max(0, Number(raw.seconds) || 0),
    updatedAt: Date.now(),
  };
  return { ...session, solved: isSolved(puzzle, session) };
}

function migrateVision(
  raw: unknown,
  puzzles: Puzzle[],
): Record<string, VisionMapping> {
  const vision: Record<string, VisionMapping> = {};
  const source = (raw as { vision?: Record<string, VisionMapping> })?.vision;
  if (!source || typeof source !== "object") return vision;
  const ids = new Set(puzzles.map((p) => p.id));
  for (const [puzzleId, mapping] of Object.entries(source)) {
    if (!ids.has(puzzleId) || !mapping || typeof mapping !== "object") continue;
    const m = mapping as VisionMapping;
    if (!m.entries || typeof m.entries !== "object") continue;
    vision[puzzleId] = {
      entries: Object.fromEntries(
        Object.entries(m.entries).filter(
          ([, combo]) =>
            combo &&
            Number.isInteger(combo.colorId) &&
            combo.colorId >= 0 &&
            combo.colorId < 4 &&
            Number.isInteger(combo.patternId) &&
            combo.patternId >= 0 &&
            combo.patternId < 3,
        ),
      ),
      locked: Array.isArray(m.locked)
        ? m.locked.filter((t) => Number.isInteger(t))
        : [],
      confirmed: !!m.confirmed,
    };
  }
  return vision;
}

export function loadDocument(puzzles: Puzzle[]): {
  document: GameDocument;
  warning: string;
} {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { document: newDocument(puzzles[0]), warning: "" };
    const data = JSON.parse(raw) as GameDocument & { version?: number };
    if (!data.sessions || !Array.isArray(data.records)) throw Error("unsupported");

    // 旧黑白存档（version 1，无 tints/vision）继续可用，逐题迁移。
    const sessions: GameDocument["sessions"] = {};
    for (const puzzle of puzzles) {
      const migrated = migrateSession(puzzle, data.sessions[puzzle.id]);
      if (migrated) sessions[puzzle.id] = migrated;
    }
    const active = puzzles.find((p) => p.id === data.activeId) ?? puzzles[0];
    sessions[active.id] ??= newSession(active);

    const records = data.records.filter(
      (r) =>
        r &&
        typeof r.id === "string" &&
        puzzles.some((p) => p.id === r.puzzleId) &&
        Number.isFinite(r.seconds) &&
        Number.isFinite(r.finishedAt) &&
        Number.isFinite(r.hints) &&
        Number.isFinite(r.checks),
    );
    const document: GameDocument = {
      version: 2,
      activeId: active.id,
      sessions,
      records,
      vision: migrateVision(data, puzzles),
    };
    return { document, warning: "" };
  } catch {
    // 迁移失败：返回新文档并提示，绝不覆盖 localStorage 里的原件。
    return {
      document: newDocument(puzzles[0]),
      warning:
        "存档无法读取，已打开新的解题页。原存档未覆盖，请手动保存新进度。",
    };
  }
}

export function saveDocument(document: GameDocument): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(document));
    return true;
  } catch {
    return false;
  }
}
