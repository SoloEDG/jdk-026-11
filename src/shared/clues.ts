import type { Tint } from "./types";

// 黑白线索：只看是否填涂。
export function runs(values: readonly number[]): number[] {
  const result: number[] = [];
  let count = 0;
  for (const value of values) {
    if (value) count++;
    else if (count) {
      result.push(count);
      count = 0;
    }
  }
  if (count) result.push(count);
  return result.length ? result : [0];
}

// 彩色线索段：同色连续段之间必须隔空，异色可以相接。
export interface ColorRun {
  length: number;
  tint: Tint;
}

export function colorRuns(values: readonly Tint[]): ColorRun[] {
  const result: ColorRun[] = [];
  let prev = 0;
  for (const value of values) {
    if (!value) {
      prev = 0;
      continue;
    }
    const last = result[result.length - 1];
    // 紧邻且同色才并入同一段；被空格打断或换成异色都会另起一段。
    if (last && prev === value) last.length++;
    else result.push({ length: 1, tint: value });
    prev = value;
  }
  return result;
}

export function lines(size: number, values: readonly Tint[]): Tint[][] {
  return [...Array(size * 2)].map((_, line) =>
    [...Array(size)].map(
      (_, i) => values[line < size ? line * size + i : i * size + line - size],
    ),
  );
}

// 黑白题线索（保持旧签名与行为）。
export function clueSet(size: number, solution: readonly number[]): number[][] {
  return lines(size, solution).map(runs);
}

// 彩色题线索：每行/列返回带语义色的连续段，空线返回空数组。
export function colorClueSet(
  size: number,
  solution: readonly Tint[],
): ColorRun[][] {
  return lines(size, solution).map(colorRuns);
}
