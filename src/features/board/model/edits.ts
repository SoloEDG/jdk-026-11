import type { Mark, Session, Tint } from "../../../shared/types";

export function applyMark(
  session: Session,
  index: number,
  mark: Mark,
  tint: Tint,
): Session {
  if (
    session.solved ||
    index < 0 ||
    index >= session.marks.length ||
    (session.marks[index] === mark && session.tints[index] === tint)
  )
    return session;
  const marks = [...session.marks];
  const tints = [...session.tints];
  const before = marks[index];
  const beforeTint = tints[index];
  marks[index] = mark;
  // cross / unknown 不携带语义色；只有 filled 记录语义色身份。
  tints[index] = mark === "filled" ? tint : 0;
  return {
    ...session,
    marks,
    tints,
    moves: [
      ...session.moves,
      { index, before, after: mark, tint: beforeTint || tint },
    ].slice(-500),
    updatedAt: Date.now(),
  };
}

export function undoMark(session: Session): Session {
  const move = session.moves.at(-1);
  if (!move || session.solved) return session;
  const marks = [...session.marks];
  const tints = [...session.tints];
  marks[move.index] = move.before;
  tints[move.index] = move.before === "filled" ? move.tint : 0;
  return {
    ...session,
    marks,
    tints,
    moves: session.moves.slice(0, -1),
    updatedAt: Date.now(),
  };
}
