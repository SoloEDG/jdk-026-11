import type { DisplayCombo, Puzzle, Tint } from "../../../shared/types";
import { ALL_COMBOS, comboKey } from "./palette";

export interface AffectedCell {
  row: number;
  col: number;
}
export interface MappingConflict {
  tintA: number;
  tintB: number;
  /** 两语义色实际相接的格位（每对相邻格记录两侧坐标）。 */
  cells: AffectedCell[];
  reason: "duplicate-combo" | "unassignable";
}

interface AdjEdge {
  a: number;
  b: number;
  cells: AffectedCell[];
}

// 计算图中会相接的语义色对（四邻接），并保留相接格位作为受影响区域。
export function adjacency(puzzle: Puzzle): AdjEdge[] {
  const n = puzzle.size;
  const map = new Map<string, AdjEdge>();
  const at = (r: number, c: number) => puzzle.solution[r * n + c];
  const touch = (a: Tint, b: Tint, r1: number, c1: number, r2: number, c2: number) => {
    if (!a || !b || a === b) return;
    const key = a < b ? `${a}|${b}` : `${b}|${a}`;
    const edge =
      map.get(key) ??
      ({
        a: Math.min(a, b),
        b: Math.max(a, b),
        cells: [],
      } as AdjEdge);
    edge.cells.push(
      { row: r1, col: c1 },
      { row: r2, col: c2 },
    );
    map.set(key, edge);
  };
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = at(r, c);
      if (!v) continue;
      if (c + 1 < n) touch(v, at(r, c + 1), r, c, r, c + 1);
      if (r + 1 < n) touch(v, at(r + 1, c), r, c, r + 1, c);
    }
  }
  return [...map.values()];
}

export function semanticTints(puzzle: Puzzle): number[] {
  return puzzle.tints.map((_, i) => i + 1);
}

// 同一组合不得分配给图中会相接的两种语义色。
export function findConflicts(
  puzzle: Puzzle,
  entries: Record<number, DisplayCombo>,
): MappingConflict[] {
  const result: MappingConflict[] = [];
  for (const edge of adjacency(puzzle)) {
    const ca = entries[edge.a];
    const cb = entries[edge.b];
    if (ca && cb && comboKey(ca) === comboKey(cb)) {
      result.push({
        tintA: edge.a,
        tintB: edge.b,
        cells: edge.cells,
        reason: "duplicate-combo",
      });
    }
  }
  return result;
}

export interface AssignmentResult {
  entries: Record<number, DisplayCombo>;
  conflicts: MappingConflict[];
  /** 无法分配（组合不足或锁定挤占）的语义色。 */
  unassigned: number[];
  feasible: boolean;
}

// 受影响区域：把某语义色涉及的全部相接边格位汇总，供玩家调整时定位。
export function affectedRegions(
  puzzle: Puzzle,
  tints: number[],
): AffectedCell[] {
  const wanted = new Set(tints);
  const cells: AffectedCell[] = [];
  for (const edge of adjacency(puzzle)) {
    if (wanted.has(edge.a) || wanted.has(edge.b)) cells.push(...edge.cells);
  }
  const seen = new Set<string>();
  return cells.filter((cell) => {
    const key = `${cell.row}-${cell.col}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// 在锁定前提下自动分配：锁定保持不动，回溯搜索其余语义色的可行组合。
// 非相邻语义色尽量复用同一组合，以节省有限的 12 个组合。
export function autoAssign(
  puzzle: Puzzle,
  locked: Record<number, DisplayCombo>,
): AssignmentResult {
  const tints = semanticTints(puzzle);
  const edges = adjacency(puzzle);
  const neighbors = new Map<number, Set<number>>();
  for (const t of tints) neighbors.set(t, new Set());
  for (const edge of edges) {
    neighbors.get(edge.a)?.add(edge.b);
    neighbors.get(edge.b)?.add(edge.a);
  }

  const entries: Record<number, DisplayCombo> = { ...locked };
  const conflicts: MappingConflict[] = [];

  // 锁定之间若已冲突，先记录受影响区域。
  for (const edge of edges) {
    const ca = locked[edge.a];
    const cb = locked[edge.b];
    if (ca && cb && comboKey(ca) === comboKey(cb)) {
      conflicts.push({
        tintA: edge.a,
        tintB: edge.b,
        cells: edge.cells,
        reason: "duplicate-combo",
      });
    }
  }

  // 按约束度数从高到低分配，邻接越多的语义色越先选组合。
  const order = tints
    .filter((t) => !locked[t])
    .sort(
      (a, b) => neighbors.get(b)!.size - neighbors.get(a)!.size,
    );

  const usedKeys = new Map<number, string>();
  for (const [t, combo] of Object.entries(locked)) {
    usedKeys.set(Number(t), comboKey(combo));
  }

  const allowed = (tint: number, combo: DisplayCombo): boolean => {
    const key = comboKey(combo);
    for (const nb of neighbors.get(tint)!) {
      if (usedKeys.get(nb) === key) return false;
    }
    return true;
  };

  const backtrack = (idx: number): boolean => {
    if (idx === order.length) return true;
    const tint = order[idx];
    const used = new Set(usedKeys.values());
    // 先尝试已被使用、但与邻接不冲突的组合，实现有限组合复用；
    // 再尝试从未使用过的新组合。两者都基于当前已用集合一次性划分。
    const reusable = ALL_COMBOS.filter(
      (combo) => used.has(comboKey(combo)) && allowed(tint, combo),
    );
    const fresh = ALL_COMBOS.filter(
      (combo) => !used.has(comboKey(combo)) && allowed(tint, combo),
    );
    for (const combo of [...reusable, ...fresh]) {
      entries[tint] = combo;
      usedKeys.set(tint, comboKey(combo));
      if (backtrack(idx + 1)) return true;
      delete entries[tint];
      usedKeys.delete(tint);
    }
    return false;
  };

  const feasible = conflicts.length === 0 && backtrack(0);
  const unassigned = tints.filter((t) => !entries[t]);
  if (!feasible) {
    for (const tint of unassigned) {
      conflicts.push({
        tintA: tint,
        tintB: tint,
        cells: affectedRegions(puzzle, [tint]),
        reason: "unassignable",
      });
    }
  }
  return { entries, conflicts, unassigned, feasible };
}

// 校验一份完整映射：必须覆盖全部语义色且无相邻同组合。
export function validateMapping(
  puzzle: Puzzle,
  entries: Record<number, DisplayCombo>,
): AssignmentResult {
  const tints = semanticTints(puzzle);
  const missing = tints.filter((t) => !entries[t]);
  const conflicts = findConflicts(puzzle, entries);
  const unassigned = missing;
  for (const tint of missing) {
    conflicts.push({
      tintA: tint,
      tintB: tint,
      cells: affectedRegions(puzzle, [tint]),
      reason: "unassignable",
    });
  }
  return {
    entries,
    conflicts,
    unassigned,
    feasible: missing.length === 0 && conflicts.length === 0,
  };
}
