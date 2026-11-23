import type { Puzzle, Tint } from "../../../shared/types";

function make(
  id: string,
  title: string,
  level: Puzzle["level"],
  collection: string,
  color: string,
  rows: string[],
): Puzzle {
  return {
    id,
    title,
    level,
    collection,
    color,
    tints: [color],
    mode: "mono",
    size: rows.length,
    solution: rows.join("").split("").map(Number),
  };
}

// 彩色题：字符 0 为空格，1..k 对应 tints 下标（语义色身份，永不合并）。
function makeColor(
  id: string,
  title: string,
  level: Puzzle["level"],
  collection: string,
  tints: string[],
  rows: string[],
): Puzzle {
  const solution: Tint[] = rows.join("").split("").map(Number);
  return {
    id,
    title,
    level,
    collection,
    tints,
    mode: "color",
    color: tints[0],
    size: rows.length,
    solution,
  };
}

export const puzzles: Puzzle[] = [
  make("bloom", "窗边的花", "进阶", "植物来信", "#718baf", [
    "0000000000",
    "0001100000",
    "0011110000",
    "0001100000",
    "0000100000",
    "0010101000",
    "0001110000",
    "0000100000",
    "0001111000",
    "0001111000",
  ]),
  make("heart", "一颗心", "入门", "小小日常", "#ba7c91", [
    "01010",
    "11111",
    "11111",
    "01110",
    "00100",
  ]),
  make("cup", "午后热茶", "入门", "小小日常", "#b79770", [
    "11110",
    "11111",
    "11111",
    "11110",
    "01100",
  ]),
  make("cat", "屋顶访客", "进阶", "森林居民", "#7e9a8e", [
    "0100000010",
    "0110000110",
    "0111111110",
    "0111111110",
    "0101101010",
    "0111111110",
    "0011111100",
    "0001111000",
    "0001111000",
    "0011111100",
  ]),
  make("fern", "山间蕨叶", "进阶", "植物来信", "#719488", [
    "0000100000",
    "0010101000",
    "0001110000",
    "0100100100",
    "0011111000",
    "0000100000",
    "0100100100",
    "0011111000",
    "0000100000",
    "0000100000",
  ]),
  make("lighthouse", "远方灯塔", "挑战", "海岸漫游", "#ad9165", [
    "000011110000000",
    "000111111000000",
    "000011110000000",
    "000011110000000",
    "000111111000000",
    "000110011000000",
    "000110011000000",
    "000111111000000",
    "000111111000000",
    "001111111100000",
    "001100001100000",
    "001100001100000",
    "001111111100000",
    "011111111110000",
    "111111111111111",
  ]),
  // —— 彩色数织：同色连续段须隔空，异色可相接 ——
  makeColor("tulip", "窗前郁金香", "入门", "植物来信", ["#cf7a86", "#7fa08c"], [
    "01010",
    "11111",
    "01110",
    "00200",
    "02220",
  ]),
  makeColor(
    "balloon",
    "远行的气球",
    "进阶",
    "小小日常",
    ["#d98077", "#e0b96a", "#7b97c4"],
    [
      "0011100",
      "0112110",
      "1112111",
      "1122211",
      "0111110",
      "0003000",
      "0003000",
    ],
  ),
  makeColor("apple", "一颗苹果", "入门", "小小日常", ["#d4776f", "#7e9a8e"], [
    "002000",
    "012100",
    "111110",
    "111110",
    "111110",
    "011100",
  ]),
];

export function findPuzzle(id: string): Puzzle {
  return puzzles.find((p) => p.id === id) ?? puzzles[0];
}
