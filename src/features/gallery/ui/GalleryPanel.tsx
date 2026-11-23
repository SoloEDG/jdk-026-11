import { useState } from "react";
import { Download, LockKeyhole, Flower2, Palette, Eye } from "lucide-react";
import type { GameDocument, Puzzle, VisionMapping } from "../../../shared/types";
import { unlockedArt, canExportAssisted } from "../lib/artwork";
import { downloadArtwork } from "../model/exportArt";
import { Artwork } from "./Artwork";

export function GalleryPanel({
  document,
  puzzles,
  vision,
  onOpen,
}: {
  document: GameDocument;
  puzzles: Puzzle[];
  vision: Record<string, VisionMapping>;
  onOpen: (id: string) => void;
}) {
  const arts = unlockedArt(puzzles, document);
  const [assisted, setAssisted] = useState(false);
  const colorCount = puzzles.filter((p) => p.mode === "color").length;
  return (
    <section className="gallery panel">
      <div className="gallery-head">
        <div>
          <span className="eyebrow">LITTLE THINGS, COLLECTED</span>
          <h1>把发现，收藏起来。</h1>
          <p className="muted">
            解开图案，遇见它真正的模样。你的每一份专注都在这里。
          </p>
        </div>
        {colorCount > 0 && (
          <button
            className="gallery-view-toggle"
            aria-pressed={assisted}
            onClick={() => setAssisted((v) => !v)}
            title="切换原色与色觉辅助色"
          >
            {assisted ? <Eye size={15} /> : <Palette size={15} />}
            {assisted ? "辅助色视图" : "原色视图"}
          </button>
        )}
      </div>
      <div className="gallery-grid">
        {puzzles.map((p) => {
          const unlocked = arts.includes(p);
          const mapping = vision[p.id];
          const assistActive = assisted && canExportAssisted(mapping);
          return (
            <article
              className={`art-card ${unlocked ? "unlocked" : ""}`}
              key={p.id}
            >
              {unlocked ? (
                <Artwork puzzle={p} vision={mapping} assisted={assistActive} />
              ) : (
                <div className="locked-art">
                  <LockKeyhole size={23} />
                  <span>等待揭晓</span>
                </div>
              )}
              <div className="art-caption">
                <div>
                  <strong>{unlocked ? p.title : "未命名的惊喜"}</strong>
                  <small>
                    {p.collection} · {p.size} × {p.size}
                    {p.mode === "color" ? " · 彩色" : ""}
                  </small>
                </div>
                {unlocked ? (
                  <button
                    aria-label={`下载${p.title}`}
                    title={
                      assisted && !canExportAssisted(mapping)
                        ? "辅助色导出需要先在解谜页确认映射，本次将使用原色"
                        : `下载${p.title}`
                    }
                    onClick={() => downloadArtwork(p, mapping, assisted)}
                  >
                    <Download size={18} />
                  </button>
                ) : (
                  <button onClick={() => onOpen(p.id)}>去解谜</button>
                )}
              </div>
              {unlocked && assisted && p.mode === "color" && (
                <small className="export-note">
                  {canExportAssisted(mapping)
                    ? "导出使用已确认的辅助色映射"
                    : "尚无已确认映射，导出与预览均使用原色"}
                </small>
              )}
            </article>
          );
        })}
      </div>
      <p className="gallery-caption">
        <Flower2 size={16} /> 已收藏 {arts.length} / {puzzles.length} 幅小小美好
      </p>
    </section>
  );
}
