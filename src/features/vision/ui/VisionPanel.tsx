import { useMemo, useState } from "react";
import { Lock, Unlock, Wand2, Eye, Check, AlertTriangle } from "lucide-react";
import type { DisplayCombo, Puzzle, VisionMapping } from "../../../shared/types";
import {
  ALL_COMBOS,
  DISPLAY_COLORS,
  PATTERNS,
  comboKey,
  comboName,
} from "../model/palette";
import {
  autoAssign,
  findConflicts,
  semanticTints,
} from "../model/mapping";

interface DraftEntry {
  combo: DisplayCombo | null;
  locked: boolean;
}

export function VisionPanel({
  puzzle,
  confirmed,
  assistView,
  onToggleView,
  onConfirm,
  onClear,
}: {
  puzzle: Puzzle;
  confirmed?: VisionMapping;
  assistView: boolean;
  onToggleView: () => void;
  onConfirm: (
    entries: Record<number, DisplayCombo>,
    locked: number[],
  ) => void;
  onClear: () => void;
}) {
  const tints = semanticTints(puzzle);

  // 草稿仅存于组件本地；未确认前不会进入 document，因此不污染工具或导出。
  const initialDraft = (): Record<number, DraftEntry> => {
    const draft: Record<number, DraftEntry> = {};
    const lockedSet = new Set(confirmed?.locked ?? []);
    for (const t of tints) {
      draft[t] = {
        combo: confirmed?.entries[t] ?? null,
        locked: lockedSet.has(t),
      };
    }
    return draft;
  };
  const [draft, setDraft] = useState<Record<number, DraftEntry>>(initialDraft);
  const [notice, setNotice] = useState("");

  const entries = useMemo(() => {
    const out: Record<number, DisplayCombo> = {};
    for (const [t, e] of Object.entries(draft)) {
      if (e.combo) out[Number(t)] = e.combo;
    }
    return out;
  }, [draft]);

  const lockedEntries = useMemo(() => {
    const out: Record<number, DisplayCombo> = {};
    for (const [t, e] of Object.entries(draft)) {
      if (e.locked && e.combo) out[Number(t)] = e.combo;
    }
    return out;
  }, [draft]);

  const conflicts = useMemo(
    () => findConflicts(puzzle, entries),
    [puzzle, entries],
  );
  const missing = tints.filter((t) => !entries[t]);
  const feasible = conflicts.length === 0 && missing.length === 0;

  const setCombo = (tint: number, combo: DisplayCombo) => {
    setDraft((d) => ({ ...d, [tint]: { ...d[tint], combo } }));
    setNotice("");
  };
  const toggleLock = (tint: number) => {
    setDraft((d) => {
      const entry = d[tint];
      if (!entry.combo) {
        setNotice("请先为该语义色选择一个显示组合，再进行锁定。");
        return d;
      }
      return { ...d, [tint]: { ...entry, locked: !entry.locked } };
    });
  };

  const runAuto = () => {
    const result = autoAssign(puzzle, lockedEntries);
    const next: Record<number, DraftEntry> = {};
    for (const t of tints) {
      next[t] = {
        combo: result.entries[t] ?? draft[t]?.combo ?? null,
        locked: !!draft[t]?.locked,
      };
    }
    setDraft(next);
    if (result.feasible) {
      setNotice("已在锁定前提下完成分配，相邻语义色使用了不同组合。");
    } else {
      const areas = result.conflicts
        .map((c) =>
          c.tintA === c.tintB
            ? `语义色 ${c.tintA} 无可用组合`
            : `语义色 ${c.tintA} 与 ${c.tintB} 的组合冲突`,
        )
        .join("；");
      setNotice(
        `组合不足或锁定造成冲突：${areas}。受影响格位已在下方列出，请调整锁定或组合。`,
      );
    }
  };

  const conflictTints = new Set<number>();
  conflicts.forEach((c) => {
    conflictTints.add(c.tintA);
    conflictTints.add(c.tintB);
  });
  const affectedCells = conflicts.flatMap((c) => c.cells);

  const confirm = () => {
    if (!feasible) {
      setNotice("当前映射仍有冲突或空缺，无法确认。请先让每种语义色都有不冲突的组合。");
      return;
    }
    const locked = tints.filter((t) => draft[t].locked);
    onConfirm(entries, locked);
    setNotice("映射已确认，现在可以切换到辅助色视图并用于导出。");
  };

  return (
    <section className="panel vision-panel">
      <span className="eyebrow">COLOR VISION ASSIST · 色觉辅助</span>
      <h2>有限组合映射</h2>
      <p className="muted">
        最多 {DISPLAY_COLORS.length} 种显示色、{PATTERNS.length}{" "}
        种纹样。同一组合不能分给图中会相接的两种语义色。
      </p>

      <div className="vision-actions">
        <button className="vision-auto" onClick={runAuto}>
          <Wand2 size={15} /> 智能分配
        </button>
        <button
          className="vision-preview"
          onClick={onToggleView}
          aria-pressed={assistView}
          disabled={!confirmed}
          title={confirmed ? "切换原色 / 辅助色" : "确认映射后才能使用辅助色视图"}
        >
          <Eye size={15} /> {assistView ? "辅助色中" : "预览辅助色"}
        </button>
      </div>

      <div className="vision-rows">
        {tints.map((tint) => {
          const entry = draft[tint];
          const inConflict = conflictTints.has(tint);
          return (
            <div
              className={`vision-row ${inConflict ? "conflict" : ""} ${entry.locked ? "locked" : ""}`}
              key={tint}
            >
              <div className="vision-semantic">
                <span
                  className="vision-swatch"
                  style={{ background: puzzle.tints[tint - 1] }}
                />
                <small>语义色 {tint}</small>
                <button
                  className="lock-button"
                  onClick={() => toggleLock(tint)}
                  aria-pressed={entry.locked}
                  title={entry.locked ? "解除锁定" : "锁定该映射"}
                >
                  {entry.locked ? <Lock size={13} /> : <Unlock size={13} />}
                </button>
              </div>
              <select
                aria-label={`语义色 ${tint} 的显示组合`}
                value={entry.combo ? comboKey(entry.combo) : ""}
                onChange={(e) => {
                  const [colorId, patternId] = e.target.value.split("-").map(Number);
                  if (Number.isNaN(colorId)) return;
                  setCombo(tint, { colorId, patternId });
                }}
                disabled={entry.locked}
              >
                <option value="">未选择</option>
                {ALL_COMBOS.map((combo) => (
                  <option key={comboKey(combo)} value={comboKey(combo)}>
                    {comboName(combo)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      {conflicts.length > 0 && (
        <div className="vision-conflict" role="alert">
          <strong>
            <AlertTriangle size={14} /> 冲突与受影响区域
          </strong>
          <ul>
            {conflicts.map((c, i) => (
              <li key={i}>
                {c.tintA === c.tintB
                  ? `语义色 ${c.tintA} 分配不到不冲突的组合`
                  : `语义色 ${c.tintA} 与 ${c.tintB} 使用了相同组合`}
                ：格位
                {c.cells
                  .slice(0, 8)
                  .map((cell) => `${cell.row + 1}-${cell.col + 1}`)
                  .join("、")}
                {c.cells.length > 8 ? " 等" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {missing.length > 0 && (
        <p className="vision-missing">
          待分配语义色：{missing.map((t) => `色${t}`).join("、")}
        </p>
      )}

      <p className="vision-notice" role="status">
        {notice || "草稿只在确认前用于本面板预览，不会改变解题工具，也不会进入导出。"}
      </p>
      <div className="vision-footer">
        <button className="vision-confirm" onClick={confirm} disabled={!feasible}>
          <Check size={15} /> 确认映射
        </button>
        {confirmed && (
          <button className="vision-clear" onClick={onClear}>
            恢复原色
          </button>
        )}
      </div>
      {affectedCells.length === 0 && (
        <p className="vision-hint">
          提示：非相邻语义色可复用同一组合，系统会优先复用以节省有限组合。
        </p>
      )}
    </section>
  );
}
