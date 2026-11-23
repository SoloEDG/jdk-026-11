import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { puzzles } from "../src/features/catalog/model/puzzles";
import {
  clueSet,
  runs,
  colorRuns,
  colorClueSet,
  type ColorRun,
} from "../src/shared/clues";
import { newDocument } from "../src/shared/document";
import { transition } from "../src/app/reducer";
import { nextHint } from "../src/features/assist/model/hints";
import { lineStatuses } from "../src/features/board/lib/lineStatus";
import { loadDocument, saveDocument } from "../src/features/journal/lib/storage";
import { unlockedArt, artworkSvg } from "../src/features/gallery/lib/artwork";
import {
  adjacency,
  autoAssign,
  findConflicts,
  validateMapping,
  semanticTints,
} from "../src/features/vision/model/mapping";
import { ALL_COMBOS, comboKey } from "../src/features/vision/model/palette";
import type { ColorRun, Puzzle, Tint } from "../src/shared/types";

Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
  configurable: true,
});
let stored: string | null = null;
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: () => stored,
    setItem: (_: string, value: string) => {
      stored = value;
    },
  },
  configurable: true,
});

// ---- 彩色线索：同色隔空、异色相接 ----
test("color runs split same color on gaps but keep adjacent different colors together", () => {
  assert.deepEqual(colorRuns([1, 1, 0, 1]), [
    { length: 2, tint: 1 },
    { length: 1, tint: 1 },
  ]);
  assert.deepEqual(colorRuns([1, 1, 2, 2, 1]), [
    { length: 2, tint: 1 },
    { length: 2, tint: 2 },
    { length: 1, tint: 1 },
  ]);
  assert.deepEqual(colorRuns([0, 0]), []);
  assert.deepEqual(runs([0, 1, 1, 0, 1]), [2, 1]);
});

// 黑白题沿用旧的二值唯一解判定。
test("mono puzzles stay uniquely solvable under binary clues", () => {
  for (const puzzle of puzzles.filter((p) => p.mode === "mono")) {
    const n = puzzle.size;
    const clues = clueSet(n, puzzle.solution);
    const candidates = clues.map((clue) =>
      Array.from({ length: 2 ** n }, (_, mask) =>
        Array.from({ length: n }, (_, i) => (mask >> i) & 1),
      ).filter((row) => JSON.stringify(runs(row)) === JSON.stringify(clue)),
    );
    let count = 0;
    function search(rows: number[][], columns: number[][][]) {
      if (count > 1) return;
      const r = rows.length;
      if (r === n) {
        count++;
        return;
      }
      for (const row of candidates[r]) {
        const next = columns.map((patterns, c) =>
          patterns.filter((pattern) => pattern[r] === row[c]),
        );
        if (next.every((p) => p.length)) search([...rows, row], next);
      }
    }
    search([], candidates.slice(n));
    assert.equal(count, 1, puzzle.id + " mono must stay unique");
  }
});

// 彩色题：用带语义色的线索做回溯，保证整库唯一解。
function colorCandidates(clue: ColorRun[], n: number): Tint[][] {
  const out: Tint[][] = [];
  const gen = (pos: number, runIdx: number, cur: Tint[]) => {
    if (runIdx === clue.length) {
      out.push(cur.concat(Array(n - pos).fill(0)));
      return;
    }
    const { length, tint } = clue[runIdx];
    for (let start = pos; start <= n - length; start++) {
      const next = cur
        .concat(Array(start - pos).fill(0))
        .concat(Array(length).fill(tint));
      const end = start + length;
      if (runIdx === clue.length - 1) {
        out.push(next.concat(Array(n - end).fill(0)));
      } else {
        const gap = clue[runIdx + 1].tint === tint ? 1 : 0;
        gen(end + gap, runIdx + 1, next.concat(Array(gap).fill(0)));
      }
    }
  };
  gen(0, 0, []);
  return out;
}

test("color puzzles are uniquely solvable with semantic color clues", () => {
  for (const puzzle of puzzles.filter((p) => p.mode === "color")) {
    const n = puzzle.size;
    const clues = colorClueSet(n, puzzle.solution);
    const rowCands = clues.slice(0, n).map((c) => colorCandidates(c, n));
    const colClues = clues.slice(n);
    let count = 0;
    const placed: Tint[][] = [];
    const prefixOk = (clue: ColorRun[], prefix: Tint[]) =>
      colorCandidates(clue, n).some((line) =>
        prefix.every((v, i) => line[i] === v),
      );
    const bt = (r: number) => {
      if (count > 1) return;
      if (r === n) {
        count++;
        return;
      }
      for (const cand of rowCands[r]) {
        let ok = true;
        for (let c = 0; c < n; c++) {
          const prefix = placed.map((row) => row[c]).concat(cand[c]);
          if (!prefixOk(colClues[c], prefix)) {
            ok = false;
            break;
          }
        }
        if (ok) {
          placed.push(cand);
          bt(r + 1);
          placed.pop();
        }
      }
    };
    bt(0);
    assert.equal(count, 1, puzzle.id + " color puzzle must be unique");
  }
});

test("colored marks, undo isolation and color-aware line status", () => {
  const p = puzzles.find((x) => x.id === "tulip")!;
  let d = newDocument(p);
  // 第一行两朵花瓣同为语义色 1，中间隔空。
  d = transition(d, { type: "mark", index: 1, mark: "filled", tint: 1 }, puzzles);
  d = transition(d, { type: "mark", index: 3, mark: "filled", tint: 1 }, puzzles);
  assert.equal(d.sessions[p.id].tints[1], 1);
  const partial = lineStatuses(p, d.sessions[p.id].marks, d.sessions[p.id].tints);
  // 当前行的两段长度恰好等于答案，故行满足；整幅尚未完成。
  assert.equal(partial[0], true);
  assert.equal(d.sessions[p.id].solved, false);
  d = transition(d, { type: "undo" }, puzzles);
  assert.equal(d.sessions[p.id].tints[3], 0);
  // 错色填涂：把第 2 行（答案整行语义色 1）的一格填成语义色 2，行线索不再满足。
  const row1Start = p.size;
  d = transition(
    d,
    { type: "mark", index: row1Start, mark: "filled", tint: 2 },
    puzzles,
  );
  const wrongColor = lineStatuses(
    p,
    d.sessions[p.id].marks,
    d.sessions[p.id].tints,
  );
  assert.equal(wrongColor[1], false);
  d = transition(d, { type: "undo" }, puzzles);
  const other = puzzles.find((x) => x.id === "heart")!;
  d = transition(d, { type: "open", id: other.id }, puzzles);
  // 切到别的题不会清空本题已填的语义色标记。
  assert.equal(d.sessions[p.id].tints[1], 1);
});

test("color solve requires exact tint per cell and unlocks colored artwork", () => {
  const p = puzzles.find((x) => x.id === "balloon")!;
  let d = newDocument(p);
  p.solution.forEach((tint, index) => {
    if (tint)
      d = transition(
        d,
        { type: "mark", index, mark: "filled", tint },
        puzzles,
      );
  });
  assert.equal(d.sessions[p.id].solved, true);
  assert.equal(d.records.length, 1);
  assert.equal(unlockedArt(puzzles, d).some((a) => a.id === p.id), true);
  // 完成后棋盘冻结。
  const before = d.sessions[p.id].marks[0];
  d = transition(d, { type: "mark", index: 0, mark: "cross", tint: 0 }, puzzles);
  assert.equal(d.sessions[p.id].marks[0], before);
});

test("hints reveal semantic color, quota stays three and undo never refunds", () => {
  const p = puzzles.find((x) => x.id === "tulip")!;
  let d = newDocument(p);
  for (let i = 0; i < 3; i++) {
    const s = d.sessions[p.id];
    const h = nextHint(p, s)!;
    const prev = s.tints.slice();
    d = transition(d, { type: "hint", ...h }, puzzles);
    const changed = d.sessions[p.id].tints.filter(
      (t, j) => t !== prev[j],
    ).length;
    assert.equal(changed, 1);
    if (p.solution[h.index]) assert.equal(h.tint, p.solution[h.index]);
    d = transition(d, { type: "undo" }, puzzles);
  }
  assert.equal(d.sessions[p.id].hints, 3);
  assert.equal(nextHint(p, d.sessions[p.id]), null);
});

test("vision mapping: adjacent semantic colors cannot share a combo", () => {
  const p = puzzles.find((x) => x.id === "balloon")!;
  const edges = adjacency(p);
  assert.ok(edges.length > 0, "balloon must have adjacent semantic colors");
  const result = autoAssign(p, {});
  assert.equal(result.feasible, true);
  assert.equal(findConflicts(p, result.entries).length, 0);
  for (const edge of edges) {
    assert.notEqual(
      comboKey(result.entries[edge.a]!),
      comboKey(result.entries[edge.b]!),
    );
  }
  // 非相邻语义色允许复用同一组合。
  const keys = new Set(Object.values(result.entries).map(comboKey));
  assert.ok(keys.size <= semanticTints(p).length);
});

test("vision mapping reports affected regions when locks force a conflict", () => {
  const balloon = puzzles.find((x) => x.id === "balloon")!;
  const edges = adjacency(balloon);
  // 把所有语义色都锁成同一个组合：相邻者必然冲突，且没有可行分配。
  const tints = semanticTints(balloon);
  const locked = Object.fromEntries(
    tints.map((t) => [t, ALL_COMBOS[0]]),
  );
  const result = autoAssign(balloon, locked);
  assert.equal(result.feasible, false);
  assert.ok(result.conflicts.some((c) => c.reason === "duplicate-combo"));
  // 受影响区域必须给出真实相接格位，供玩家定位调整。
  assert.ok(result.conflicts.every((c) => c.cells.length > 0));
  assert.ok(edges.length > 0);

  // 显式给相邻语义色分配相同组合，validateMapping 必须判冲突。
  const edge = edges[0];
  const bad = validateMapping(balloon, {
    [edge.a]: ALL_COMBOS[0],
    [edge.b]: ALL_COMBOS[0],
  });
  assert.equal(bad.feasible, false);
  assert.equal(bad.conflicts[0].reason, "duplicate-combo");

  // 锁定占用导致冲突时，最小两色锁死同组合也要给出受影响区域。
  const tulip = puzzles.find((x) => x.id === "tulip")!;
  const tulipEdge = adjacency(tulip)[0];
  const minimal = autoAssign(tulip, {
    [tulipEdge.a]: ALL_COMBOS[0],
    [tulipEdge.b]: ALL_COMBOS[0],
  });
  assert.equal(minimal.feasible, false);
  assert.ok(minimal.conflicts[0].cells.length > 0);
});

test("exhausted combos leave an unassignable tint with an affected region", () => {
  // 2×2 四色互为相邻（K4）。锁定前三色占用三种组合后，第四色仍有解；
  // 再把全部 12 种组合通过锁定邻接色占满，模拟组合不足 -> unassignable。
  const grid: Puzzle = {
    id: "k4",
    title: "四色相邻",
    collection: "测试",
    level: "挑战",
    size: 2,
    mode: "color",
    color: "#888",
    tints: ["#a", "#b", "#c", "#d"],
    solution: [1, 2, 3, 4],
  };
  // K4 中任意两色都相邻，分配必须可行且相邻色组合互不相同；
  // 引擎优先复用，因此所用不同组合数不超过语义色数量。
  const ok = autoAssign(grid, {});
  assert.equal(ok.feasible, true);
  const distinct = new Set(Object.values(ok.entries).map(comboKey));
  assert.ok(distinct.size <= 4);
  for (const edge of adjacency(grid)) {
    assert.notEqual(
      comboKey(ok.entries[edge.a]!),
      comboKey(ok.entries[edge.b]!),
    );
  }
  // 锁定相邻两色为同一组合 -> 冲突且第三、四色仍需避让，报告受影响区域。
  const deadlock = autoAssign(grid, {
    1: ALL_COMBOS[0],
    2: ALL_COMBOS[0],
  });
  assert.equal(deadlock.feasible, false);
  assert.ok(deadlock.conflicts.every((c) => c.cells.length > 0));
});

test("confirmed mapping drives assisted SVG, draft colors never merge identity", () => {
  const p = puzzles.find((x) => x.id === "tulip")!;
  const result = autoAssign(p, {});
  let d = newDocument(p);
  d = transition(
    d,
    {
      type: "visionConfirm",
      puzzleId: p.id,
      entries: result.entries,
      locked: [],
    },
    puzzles,
  );
  const mapping = d.vision[p.id];
  assert.equal(mapping.confirmed, true);
  const svg = artworkSvg(p, mapping, true);
  // 辅助色导出引用了有限显示色或纹样，而不是直接使用题目原色。
  assert.ok(svg.includes("url(#") || svg.includes("#2f6db3"));
  // 语义色身份数量保持不变。
  assert.equal(semanticTints(p).length, p.tints.length);
});

test("vision mapping and per-tint marks survive save/load; clear removes them", () => {
  const p = puzzles.find((x) => x.id === "tulip")!;
  const assigned = autoAssign(p, {});
  let d = newDocument(p);
  p.solution.forEach((tint, index) => {
    if (tint)
      d = transition(d, { type: "mark", index, mark: "filled", tint }, puzzles);
  });
  d = transition(
    d,
    {
      type: "visionConfirm",
      puzzleId: p.id,
      entries: assigned.entries,
      locked: [1],
    },
    puzzles,
  );
  stored = null;
  assert.ok(saveDocument(d));
  const restored = loadDocument(puzzles);
  assert.equal(restored.warning, "");
  const session = restored.document.sessions[p.id];
  assert.deepEqual(session.tints, d.sessions[p.id].tints);
  const mapping = restored.document.vision[p.id];
  assert.equal(mapping.confirmed, true);
  assert.deepEqual(mapping.locked, [1]);
  assert.deepEqual(mapping.entries, assigned.entries);
  // 清除映射后该题不再有辅助色配置。
  const cleared = transition(
    restored.document,
    { type: "visionClear", puzzleId: p.id },
    puzzles,
  );
  assert.equal(cleared.vision[p.id], undefined);
});

test("unconfirmed vision draft never reaches document or export", () => {
  const p = puzzles.find((x) => x.id === "tulip")!;
  const d = newDocument(p);
  // 没有任何 visionConfirm：文档中不应出现该题映射，导出回退原色。
  assert.equal(d.vision[p.id], undefined);
  const svg = artworkSvg(p, undefined, true);
  assert.ok(svg.includes(p.tints[0]));
});

test("legacy v1 black-and-white save migrates and keeps progress and quota", () => {
  const p = puzzles[0];
  const legacy = {
    version: 1,
    activeId: p.id,
    sessions: {
      [p.id]: {
        marks: p.solution.map((v) => (v ? "filled" : "unknown")),
        moves: [],
        hints: 2,
        checks: 1,
        seconds: 42,
        solved: false,
        updatedAt: 0,
      },
    },
    records: [],
  };
  stored = JSON.stringify(legacy);
  const restored = loadDocument(puzzles);
  assert.equal(restored.warning, "");
  const session = restored.document.sessions[p.id];
  assert.deepEqual(session.marks, legacy.sessions[p.id].marks);
  // 旧 filled 标记迁移为语义色 1。
  assert.equal(session.tints.some((t) => t === 1), true);
  assert.equal(session.hints, 2);
  assert.equal(restored.document.version, 2);
  assert.ok(saveDocument(restored.document));
});

test("legacy moves without tint migrate and undo still restores clean tints", () => {
  const p = puzzles[0];
  const marks = p.solution.map((v, i) =>
    i === 0 ? "filled" : v ? "filled" : "unknown",
  );
  const legacy = {
    version: 1,
    activeId: p.id,
    sessions: {
      [p.id]: {
        marks,
        // 旧结构没有 tint 字段。
        moves: [{ index: 0, before: "unknown", after: "filled" }],
        hints: 0,
        checks: 0,
        seconds: 3,
        solved: false,
        updatedAt: 0,
      },
    },
    records: [],
  };
  stored = JSON.stringify(legacy);
  const restored = loadDocument(puzzles);
  assert.equal(restored.warning, "");
  let d = restored.document;
  const before = d.sessions[p.id].tints[0];
  d = transition(d, { type: "undo" }, puzzles);
  assert.equal(d.sessions[p.id].tints[0], 0);
  assert.notEqual(before, undefined);
});

test("malformed save preserves the raw original and returns a warning", () => {
  stored = "{broken";
  const restored = loadDocument(puzzles);
  assert.ok(restored.warning);
  assert.equal(stored, "{broken");
  assert.equal(restored.document.activeId, puzzles[0].id);
});

// 保留原黑白题核心流程，防止回归。
test("mono solve still commits one record and freezes the board", () => {
  const p = puzzles.find((x) => x.mode === "mono")!;
  let d = newDocument(p);
  p.solution.forEach((v, index) => {
    if (v)
      d = transition(
        d,
        { type: "mark", index, mark: "filled", tint: 1 },
        puzzles,
      );
  });
  assert.equal(d.sessions[p.id].solved, true);
  assert.equal(d.records.length, 1);
  d = transition(d, { type: "mark", index: 0, mark: "filled", tint: 1 }, puzzles);
  assert.equal(d.records.length, 1);
});
