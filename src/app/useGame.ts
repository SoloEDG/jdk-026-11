import { useEffect, useReducer, useState, useRef } from "react";
import { findPuzzle, puzzles } from "../features/catalog";
import { inspect, nextHint } from "../features/assist";
import { loadDocument, saveDocument } from "../features/journal";
import { transition } from "./reducer";
import type { DisplayCombo } from "../shared/types";

export function useGame() {
  const [initial] = useState(() => loadDocument(puzzles));
  const [document, dispatch] = useReducer(
    (d: typeof initial.document, a: Parameters<typeof transition>[1]) =>
      transition(d, a, puzzles),
    initial.document,
  );
  const [message, setMessage] = useState(initial.warning);
  const [saveState, setSaveState] = useState(
    initial.warning ? "手动保存" : "进度已保存",
  );
  const allowSave = useRef(!initial.warning);
  const puzzle = findPuzzle(document.activeId);
  const session = document.sessions[puzzle.id];
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (globalThis.document.visibilityState === "visible")
        dispatch({ type: "tick" });
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!allowSave.current) return;
    const timer = setTimeout(
      () =>
        setSaveState(
          saveDocument(document) ? "进度已保存" : "保存失败 · 点击重试",
        ),
      300,
    );
    return () => clearTimeout(timer);
  }, [document]);
  const save = () => {
    allowSave.current = true;
    setSaveState(saveDocument(document) ? "进度已保存" : "保存失败 · 点击重试");
  };
  const hint = () => {
    const hint = nextHint(puzzle, session);
    if (hint) {
      dispatch({ type: "hint", ...hint });
      const colorText =
        puzzle.mode === "color" && hint.tint
          ? `语义色 ${hint.tint} 的`
          : "";
      setMessage(
        `已揭示第 ${Math.floor(hint.index / puzzle.size) + 1} 行、第 ${(hint.index % puzzle.size) + 1} 列的一格${colorText}答案。`,
      );
    } else setMessage("本题提示额度已用完，试试检查当前标记。");
  };
  const check = () => {
    const { errors } = inspect(puzzle, session);
    dispatch({ type: "check" });
    setMessage(
      errors
        ? `目前有 ${errors} 处标记与答案不符（含颜色不对）。检查不会直接揭示位置。`
        : "已填写的标记都正确，继续你的发现吧。",
    );
  };
  const confirmVision = (
    entries: Record<number, DisplayCombo>,
    locked: number[],
  ) => {
    dispatch({
      type: "visionConfirm",
      puzzleId: puzzle.id,
      entries,
      locked,
    });
  };
  const clearVision = () =>
    dispatch({ type: "visionClear", puzzleId: puzzle.id });
  return {
    document,
    puzzle,
    session,
    message,
    saveState,
    dispatch,
    save,
    hint,
    check,
    confirmVision,
    clearVision,
    clearMessage: () => setMessage(""),
  };
}
