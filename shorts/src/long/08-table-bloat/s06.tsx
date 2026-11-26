// Scene 6: the space stays. The table file as 84 boxes of 4 MB (337 MB): the rows fill 36% of each, the dead copies
// the rest. When the report ends the dead copies go and the space stays, empty (210 MB free, logs.json). A full scan
// still reads every page: 43,080 against 15,589; a lookup by id reads 7 before and after. Then the two rewrites.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { BG, FG, GRAY, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import logs from "./logs.json";
import { Appear, Card, cl, cue, ease, fmt, Muted, Scene, Sfx, Tag, Title, useWin } from "./common";

const H = logs.hour;
const N = Math.round(H.table[1] / 4); // 84 boxes of 4 MB
const COLS = 21;
const BOX = 96;
const GAP = 12;
const LIVE = (H.table[1] - H.free_mb) / H.table[1]; // the share of the file that still holds rows
const GX = 144;
const GY = 330;

export const Space: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("06", w, n);
  const at = {
    ended: c("ended"), removed: c("removed"), shrink: c("shrink"), n337: c("337"), n210: c("210"), free: c("free"), disk: c("disk"),
    read: c("read."), scan: c("scan"), filter: c("filter"), n43: c("43,000"), instead: c("instead"), three: c("three"), lookup: c("lookup"), seven: c("Seven"),
    back: c("back,", 2), vfull: c("VACUUM"), repack: c("short"), measure: c("measure"),
  };
  const gone = ease(interpolate(frame, [at.removed, at.removed + 24], [0, 1], cl));
  const grid = useWin(0, at.back);
  const end = useWin(at.back);
  const scanP = interpolate(frame, [at.scan, at.n43 + 10], [0, 1], cl);
  const pages = Math.round(logs.scan.after_pages * scanP);
  return (
    <Scene id="06">
      <Title text="The space stays" at={0} until={at.back - 10} />
      <div style={{ position: "absolute", inset: 0, opacity: grid }}>
        <div style={{ position: "absolute", top: 110, right: 120, textAlign: "right" }}>
          <Tag size={50} mono color={LIGHT}>orders · the table file</Tag>
          <Muted size={38}>1 box = 4 MB</Muted>
        </div>
        {Array.from({ length: N }, (_, i) => {
          const x = GX + (i % COLS) * (BOX + GAP);
          const y = GY + Math.floor(i / COLS) * (BOX + GAP);
          const lit = frame >= at.scan && i / N <= scanP && i / N > scanP - 0.06;
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, width: BOX, height: BOX, borderRadius: 10, overflow: "hidden", background: BG, outline: lit ? `5px solid ${FG}` : "none" }}>
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BOX * (1 - LIVE), background: RED, opacity: 0.9 * (1 - gone) }} />
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BOX * (1 - LIVE) - 6, border: `4px dashed ${RED}`, borderBottom: "none", borderRadius: "10px 10px 0 0", opacity: gone * 0.8, boxSizing: "border-box" }} />
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BOX * LIVE, background: LIGHT }} />
            </div>
          );
        })}
        <div style={{ position: "absolute", left: GX, top: 790, display: "flex", gap: 60, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: LIGHT }} />
            <Muted size={44}>rows</Muted>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 8, background: gone < 0.5 ? RED : "transparent", border: `4px dashed ${RED}`, boxSizing: "border-box" }} />
            <Muted size={44}>{gone < 0.5 ? "dead copies" : "empty space"}</Muted>
          </div>
        </div>
        <Appear at={at.n337} until={at.read - 8} style={{ left: GX, top: 900 }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 140, color: FG, lineHeight: 1.1 }}>
            {H.table[1]} MB
            <span style={{ color: RED, opacity: interpolate(frame, [at.n210, at.n210 + 8], [0, 1], cl) }}> · {H.free_mb} empty</span>
          </div>
        </Appear>
        <Appear at={at.free} until={at.read - 8} style={{ left: GX, top: 1120 }}>
          <Tag size={60} color={LIGHT}>free for new rows of this table</Tag>
          <Tag size={60} color={RED} style={{ opacity: interpolate(frame, [at.disk - 30, at.disk - 20], [0, 1], cl) }}>not given back to the disk</Tag>
        </Appear>
        {/* the scan */}
        <Appear at={at.read} style={{ left: GX, top: 880 }}>
          <Muted size={50}>a full scan reads every page, empty or not</Muted>
        </Appear>
        <Appear at={at.filter} style={{ left: GX, top: 980 }}>
          <Muted size={44}>filter on a column with no index · pages read</Muted>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 130, color: RED, lineHeight: 1.1 }}>{fmt(pages)}</div>
        </Appear>
        <Appear at={at.instead} style={{ left: 1000, top: 1030 }}>
          <Muted size={44}>no long report</Muted>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 96, color: LIGHT, lineHeight: 1.1 }}>{fmt(logs.scan.base_pages)}</div>
        </Appear>
        <Appear at={at.three} style={{ left: 1000, top: 1220 }}>
          <Tag size={52} color={RED}>about 3x as long</Tag>
        </Appear>
        <Appear at={at.lookup} style={{ left: 1700, top: 1010 }}>
          <Card style={{ width: 700 }}>
            <Muted size={44}>lookup by id · pages read</Muted>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 96, color: FG }}>
              {logs.scan.id_pages} <span style={{ color: MUTED }}>→</span> <span style={{ opacity: interpolate(frame, [at.seven + 20, at.seven + 28], [0, 1], cl) }}>{logs.scan.id_pages}</span>
            </div>
          </Card>
        </Appear>
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: end }}>
        <Title text="Getting the space back" at={at.back} />
        <Appear at={at.back} style={{ left: 120, top: 320 }}>
          <Tag size={64} color={MUTED}>the table has to be rewritten</Tag>
        </Appear>
        {[
          { at: at.vfull, name: "VACUUM FULL", note: "the table is locked for the whole rewrite", left: 120, color: RED },
          { at: at.repack, name: "pg_repack", note: "only short locks", left: 1320, color: LIGHT },
        ].map((k) => (
          <Appear key={k.name} at={k.at} style={{ left: k.left, top: 500 }}>
            <Card color={k.color} style={{ width: 1080, height: 380 }}>
              <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 96, color: FG }}>{k.name}</div>
              <Muted size={54} style={{ marginTop: 26, color: k.color }}>{k.note}</Muted>
            </Card>
          </Appear>
        ))}
        <Appear at={at.measure} style={{ left: 120, top: 1000 }}>
          <Tag size={56} color={MUTED}>not measured in this test</Tag>
        </Appear>
      </div>
      <Sfx name="whoosh" from={at.removed} volume={0.3} />
    </Scene>
  );
};
