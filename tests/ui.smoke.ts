// 组件级冒烟脚本（非 node:test）：useGame 的 1 秒定时器会保持事件循环，
// 因此末尾显式 process.exit。运行：npx tsx tests/ui.smoke.ts
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../src/app/App";
import { puzzles } from "../src/features/catalog/model/puzzles";
import { autoAssign } from "../src/features/vision/model/mapping";

const dom = new JSDOM(
  "<!doctype html><html><body><div id='root'></div></body></html>",
  { url: "http://localhost/" },
);
const define = (key: string, value: unknown) =>
  Object.defineProperty(globalThis, key, { value, configurable: true });
define("window", dom.window);
define("document", dom.window.document);
define("navigator", dom.window.navigator);
define("HTMLElement", dom.window.HTMLElement);
define("getComputedStyle", dom.window.getComputedStyle);
define("localStorage", dom.window.localStorage);
define("IS_REACT_ACT_ENVIRONMENT", true);

function click(el: Element | null | undefined) {
  assert.ok(el, "element should exist");
  act(() =>
    (el as HTMLElement).dispatchEvent(
      new dom.window.MouseEvent("click", { bubbles: true }),
    ),
  );
}

function main() {
  const container = document.getElementById("root")!;
  const root = createRoot(container);
  act(() => root.render(React.createElement(App)));
  const colorPuzzle = puzzles.find((p) => p.mode === "color")!;

  const cards = [...container.querySelectorAll(".puzzle-card")] as HTMLElement[];
  const card = cards.find((c) => c.textContent?.includes("彩色"))!;
  click(card);

  const selects = container.querySelectorAll(".vision-row select");
  assert.ok(selects.length >= 2);
  assert.equal(selects[0].querySelectorAll("option").length, 13);

  const tintButtons = container.querySelectorAll(".tool-group .tool-swatch");
  assert.equal(tintButtons.length, colorPuzzle.tints.length);

  click(container.querySelector(".vision-auto")!);
  const confirmBtn = container.querySelector(
    ".vision-confirm",
  ) as HTMLButtonElement;
  assert.equal(confirmBtn.disabled, false);
  click(confirmBtn);

  const previewBtn = container.querySelector(
    ".vision-preview",
  ) as HTMLButtonElement;
  assert.equal(previewBtn.disabled, false);
  click(previewBtn);
  assert.equal(previewBtn.getAttribute("aria-pressed"), "true");

  const swatch = container.querySelector(".tool-swatch") as HTMLElement;
  assert.ok(swatch.style.background.length > 0);

  const galleryNav = [...container.querySelectorAll("nav button")].find((b) =>
    b.getAttribute("aria-label")?.includes("展柜"),
  )!;
  click(galleryNav);
  assert.ok(container.querySelector(".gallery-view-toggle"));

  const result = autoAssign(colorPuzzle, {});
  assert.equal(result.feasible, true);

  root.unmount();
  console.log("UI_SMOKE_OK");
}

try {
  main();
  process.exit(0);
} catch (err) {
  console.error("UI_SMOKE_FAIL", err);
  process.exit(1);
}
