import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function RuleGuide({ mode }: { mode: "mono" | "color" }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rule-guide">
      <button className="guide-toggle" onClick={() => setOpen(!open)}>
        怎么读数字？
        <ChevronDown
          size={15}
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>
      {open && (
        <>
          <div className="rule-example">
            <strong>2 1</strong>
            <span className="example-filled" />
            <span className="example-filled" />
            <span>×</span>
            <span className="example-filled" />
            <span>×</span>
          </div>
          {mode === "color" ? (
            <>
              <p>
                数字表示该语义色连续填涂的长度，色块旁的圆点标明颜色。
                <br />
                同一种语义色的两段之间至少留一个空格；不同语义色可以直接相接。
              </p>
              <small>
                行列线索变绿，表示当前填涂的颜色与长度都满足这条线；整幅图案完成才会揭晓。
              </small>
            </>
          ) : (
            <>
              <p>
                数字表示连续填涂的长度。
                <br />
                两组之间，至少留一个空格。
              </p>
              <small>
                行列数字变绿，表示当前填涂已满足这条线；整幅图案完成才会揭晓。
              </small>
            </>
          )}
        </>
      )}
    </div>
  );
}
