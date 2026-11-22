// Scene 9: lab scene 2, the schema change. Left: the real schema-change output (logs.json, from
// results-schema-local-2026-11-22.txt) types in one format at a time on the spoken words; the OK on the two silent
// lines stays and a solid red SILENT stamp lands beside it. Right: the 3D "why".
// Protobuf: the old order's field 8 holds the notes text; the bad reader expects tip, an int64, at number 8; the text
// doesn't fit, is set aside, tip reads 0. Avro: values only, no names or numbers; the reader lays the wrong schema
// over them and reads the length prefix of the notes text (0x5c = 46, the text is 46 characters) as tip
// (data.json: avro_prefix_hex, avro_tip_wrong, from 01-payload-encoding/video_data.py).
// Then Production's line, and the three outcomes side by side.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { BG, FG, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { ProductionFace } from "../../components/Production";
import data from "../../shorts/01-payload-encoding/data.json";
import logs from "./logs.json";
import { AMBER, Appear, Block, Card, cl, cue, ease, Muted, proj, Scene, Sfx, Stage, Stamp, Tag, Title } from "./common";

const S = logs.schema; // [0] header, [1] JSON, [2..4], [5] Protobuf, [6..8], [9] Avro, [10..13]
const HX = 1420; // hero panel left
const HW = 1060;
const HH = 900;
const HCAM = { pos: [0, 5.2, 9.5] as [number, number, number], look: [0, 0.9, 0] as [number, number, number], fov: 40 };
const hp = (x: number, y: number, z: number) => {
  const p = proj(HCAM.pos, HCAM.look, HCAM.fov, [x, y, z], HW, HH);
  return { x: p.x + HX, y: p.y + 300 };
};
const BOXX = [-3.6, -2.2, -0.8, 0.9, 3.0]; // slot centres
const BOXW = [1.2, 1.2, 1.2, 1.8, 2.2];

// The log's lines, shortened to fit a readable size (same results; full text in the results file).
const SHORT: Record<number, string> = {
  0: "v2 removes notes, adds tip",
  2: "FAIL  old reader, new data: KeyError 'notes'",
  3: "FAIL  new reader, old data: KeyError 'tip'",
  4: "OK    .get('tip', 0): 0",
  6: "OK    old reader, new data: tip skipped",
  7: "OK    new reader, old data: tip=0",
  8: "OK    tip reuses field 8: tip=0",
  10: "OK    new reader, old data: 0",
  11: "FAIL  old reader: no default for notes",
  12: "FAIL  tip without a default",
  13: "OK    wrong writer schema: 46",
};
const lineColor = (l: string) => (l.trim().startsWith("FAIL") ? RED : l.trim().startsWith("OK") ? GREEN : FG);

export const LabSchema: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("09", w, n);
  const at = {
    head: c("changed"),
    json: c("crashed"),
    jsonGet: c("default"),
    proto: c("Protobuf"),
    p1: c("skipped"),
    p2: c("zero"),
    rename: c("rename"),
    mistake: c("mistake"),
    num: c("number"),
    pZero: c("zero", 2),
    notes: c("notes", 2),
    ok: c("okay"),
    avro: c("Avro"),
    aFail: c("refuses"),
    aBut: c("But", 2),
    wrong: c("wrong"),
    noTip: c("no", 1),
    a46: c("46"),
    prodIn: c("No", 3) - 8,
    sumAt: c("crash"),
    neither: c("Neither"),
  };
  // which lines are shown, and when
  const shown: { i: number; t: number }[] = [
    { i: 0, t: at.head },
    { i: 1, t: at.json - 4 },
    { i: 2, t: at.json },
    { i: 3, t: at.json + 8 },
    { i: 4, t: at.jsonGet },
    { i: 5, t: at.proto },
    { i: 6, t: at.p1 },
    { i: 7, t: at.p2 },
    { i: 8, t: at.ok - 4 },
    { i: 9, t: at.avro },
    { i: 10, t: at.aFail - 30 },
    { i: 11, t: at.aFail },
    { i: 12, t: at.aFail + 8 },
    { i: 13, t: at.a46 - 4 },
  ];
  const sumOp = interpolate(frame, [at.sumAt - 12, at.sumAt], [0, 1], cl);
  const termOp = 1 - sumOp;
  // hero phases
  const diffOp = interpolate(frame, [at.head, at.head + 10, at.json - 10, at.json], [0, 1, 1, 0], cl);
  const renameOp = interpolate(frame, [at.rename, at.rename + 10, at.mistake - 10, at.mistake], [0, 1, 1, 0], cl);
  const protoOp = interpolate(frame, [at.mistake, at.mistake + 12, at.avro - 6, at.avro + 6], [0, 1, 1, 0], cl);
  const avroOp = interpolate(frame, [at.aBut - 6, at.aBut + 8, at.prodIn - 6, at.prodIn + 4], [0, 1, 1, 0], cl);
  const prodOp = interpolate(frame, [at.prodIn, at.prodIn + 8, at.sumAt - 14, at.sumAt - 4], [0, 1, 1, 0], cl);
  // Protobuf: the notes box is set aside when tip reads zero
  const aside = ease(interpolate(frame, [at.pZero - 6, at.pZero + 22], [0, 1], cl));
  const readerIn = ease(interpolate(frame, [at.num - 10, at.num + 14], [0, 1], cl));
  // Avro: the wrong schema drops in, the 46 box rises into tip
  const wrongIn = ease(interpolate(frame, [at.wrong - 10, at.wrong + 14], [0, 1], cl));
  const rise = ease(interpolate(frame, [at.a46 - 18, at.a46 + 6], [0, 1], cl));

  return (
    <Scene id="09">
      <Title text="The schema change" at={0} until={at.sumAt - 12} />
      {/* terminal, left */}
      <div style={{ position: "absolute", inset: 0, opacity: termOp }}>
        <div style={{ position: "absolute", top: 104, right: 120, textAlign: "right", fontFamily: MONO, fontSize: 34, color: MUTED }}>results-schema-local-2026-11-22.txt</div>
        <Card style={{ position: "absolute", left: 100, top: 270, width: 1250, height: 1060, padding: "26px 30px", overflow: "hidden" }}>
          {shown.map(({ i, t }) => {
            const o = interpolate(frame, [t, t + 8], [0, 1], cl);
            const l = S[i];
            const isHead = !l.startsWith(" ");
            const short = SHORT[i] ?? l.trim();
            const silent = i === 8 || i === 13;
            const badge = silent ? interpolate(frame, [i === 8 ? at.ok : at.a46, (i === 8 ? at.ok : at.a46) + 8], [0, 1], cl) : 0;
            return (
              <div key={i} style={{ opacity: o, fontFamily: MONO, fontSize: isHead ? 46 : 38, lineHeight: isHead ? 1.75 : 1.6, color: isHead ? (i === 0 ? MUTED : FG) : lineColor(l), fontWeight: isHead || silent ? 800 : 400, whiteSpace: "pre", marginLeft: isHead ? 0 : 20, display: "flex", alignItems: "center" }}>
                {short}
                {silent ? (
                  <span style={{ marginLeft: 22, padding: "2px 16px", borderRadius: 10, background: RED, color: BG, fontFamily: SANS, fontWeight: 800, fontSize: 36, letterSpacing: 3, opacity: badge, transform: `scale(${1.2 - 0.2 * badge})` }}>SILENT</span>
                ) : null}
              </div>
            );
          })}
        </Card>
      </div>

      {/* hero panel, right: schema diff */}
      <div style={{ position: "absolute", inset: 0, opacity: diffOp }}>
        <Card style={{ position: "absolute", left: HX + 60, top: 330, width: 900 }}>
          <Muted size={40}>Order schema, v1 → v2</Muted>
          {["order_id", "status", "total", "address", "notes", "tip"].map((f, i) => {
            const isNotes = f === "notes";
            const isTip = f === "tip";
            const t = isNotes ? c("notes") : isTip ? c("tip") : at.head;
            const o = interpolate(frame, [t, t + 8], [0, 1], cl);
            return (
              <div key={f} style={{ fontFamily: MONO, fontSize: 56, lineHeight: 1.55, color: isNotes ? RED : isTip ? GREEN : FG, textDecoration: isNotes && o > 0.5 ? "line-through" : "none", opacity: isTip ? o : 1 }}>
                {isTip ? "+ " : isNotes ? "− " : "  "}
                {f}
              </div>
            );
          })}
        </Card>
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: renameOp }}>
        <Card color={GREEN} style={{ position: "absolute", left: HX + 60, top: 400, width: 900 }}>
          <Tag size={56}>rename in Protobuf</Tag>
          <div style={{ fontFamily: MONO, fontSize: 52, marginTop: 20, color: FG }}>
            <span style={{ color: AMBER }}>price</span> → <span style={{ color: AMBER }}>totalPrice</span> = 7
          </div>
          <Muted size={44} style={{ marginTop: 16 }}>only the number 7 travels</Muted>
          <Tag size={60} color={GREEN} style={{ marginTop: 18 }}>safe</Tag>
        </Card>
      </div>

      {/* hero 3D: Protobuf */}
      <div style={{ position: "absolute", inset: 0, opacity: protoOp }}>
        <Stage pos={HCAM.pos} look={HCAM.look} fov={HCAM.fov} width={HW} height={HH} style={{ left: HX, top: 300 }}>
          {BOXX.map((x, i) => {
            const isNotes = i === 3;
            const dz = isNotes ? 2.0 * aside : 0;
            const dx = isNotes ? 0.6 * aside : 0;
            return <Block key={i} p={[x + dx, 0.35, dz]} s={[BOXW[i] * 0.92, 0.6, 1.2]} color={isNotes ? LIGHT : GREEN} glow={0.14} opacity={isNotes ? 1 - 0.55 * aside : 1} />;
          })}
          {/* the reader's schema: frames above the slots */}
          {BOXX.map((x, i) => (
            <Block key={`r${i}`} p={[x, 2.2 + 1.2 * (1 - readerIn), 0]} s={[BOXW[i] * 0.92, 0.08, 1.2]} color={i === 3 ? RED : GRAY} glow={0.2} opacity={readerIn} />
          ))}
        </Stage>
        {["1", "5", "7", "8", "9"].map((n, i) => {
          const s = hp(BOXX[i], 0.75, 0.6);
          return (
            <div key={n} style={{ position: "absolute", left: s.x, top: s.y - 40, transform: "translateX(-50%)", fontFamily: MONO, fontWeight: 800, fontSize: 44, color: i === 3 ? AMBER : BG, opacity: i === 3 ? 1 - aside : 1 }}>
              {n}
            </div>
          );
        })}
        {(() => {
          const s = hp(BOXX[3], 0, 1.4);
          return (
            <div style={{ position: "absolute", left: s.x, top: s.y + 30, transform: "translateX(-50%)", textAlign: "center", opacity: 1 - aside }}>
              <Muted size={38}>8 = notes (text)</Muted>
            </div>
          );
        })()}
        {(() => {
          const s = hp(BOXX[3], 2.3, 0);
          return (
            <div style={{ position: "absolute", left: s.x, top: s.y - 90, transform: "translateX(-50%)", textAlign: "center", opacity: readerIn }}>
              <Tag mono size={44} color={RED}>8 = tip (int64)</Tag>
            </div>
          );
        })()}
        <Muted size={40} style={{ position: "absolute", left: HX + 60, top: 330 }}>old order · new reader, field 8 reused</Muted>
        <Appear at={at.pZero} style={{ left: HX + 60, top: 1030 }}>
          <Tag size={68}>
            tip = <span style={{ fontFamily: MONO, fontWeight: 800, color: RED }}>0</span>
          </Tag>
        </Appear>
        <Appear at={at.notes} style={{ left: HX + 420, top: 1046 }}>
          <Muted size={48}>notes: never seen</Muted>
        </Appear>
      </div>

      {/* hero 3D: Avro */}
      <div style={{ position: "absolute", inset: 0, opacity: avroOp }}>
        <Stage pos={HCAM.pos} look={HCAM.look} fov={HCAM.fov} width={HW} height={HH} style={{ left: HX, top: 300 }}>
          {BOXX.map((x, i) => {
            const isLen = i === 3;
            const y = isLen ? 0.35 + 1.75 * rise : 0.35;
            return <Block key={i} p={[x, y, 0]} s={[BOXW[i] * 0.92, 0.6, 1.2]} color={isLen ? (rise > 0.5 ? RED : LIGHT) : GRAY} glow={isLen ? 0.25 : 0.1} />;
          })}
          {BOXX.map((x, i) => (
            <Block key={`w${i}`} p={[x, 2.2 + 1.2 * (1 - wrongIn), 0]} s={[BOXW[i] * 0.92, 0.08, 1.2]} color={i === 3 ? RED : GRAY} glow={0.2} opacity={wrongIn} />
          ))}
        </Stage>
        <Muted size={40} style={{ position: "absolute", left: HX + 60, top: 330 }}>old order · read with the wrong schema</Muted>
        {(() => {
          const s = hp(BOXX[3], 0.4, 1.4);
          return (
            <div style={{ position: "absolute", left: s.x, top: s.y + 20, transform: "translateX(-50%)", textAlign: "center", opacity: 1 - rise }}>
              <Tag mono size={42} color={LIGHT}>0x{data.avro_prefix_hex}</Tag>
              <Muted size={34}>length of notes</Muted>
            </div>
          );
        })()}
        {(() => {
          const s = hp(BOXX[4], 0.4, 1.4);
          return (
            <div style={{ position: "absolute", left: s.x, top: s.y + 20, transform: "translateX(-50%)", textAlign: "center" }}>
              <Muted size={34}>"Please call on arrival…"</Muted>
            </div>
          );
        })()}
        {(() => {
          const s = hp(BOXX[3], 2.3, 0);
          return (
            <div style={{ position: "absolute", left: s.x, top: s.y - 90, transform: "translateX(-50%)", textAlign: "center", opacity: wrongIn }}>
              <Tag mono size={44} color={RED}>tip (long)</Tag>
            </div>
          );
        })()}
        <Appear at={at.noTip} style={{ left: HX + 60, top: 1030 }}>
          <Muted size={48}>this order has no tip</Muted>
        </Appear>
        <Appear at={at.a46} style={{ left: HX + 60, top: 1110 }}>
          <Tag size={68}>
            tip = <span style={{ fontFamily: MONO, fontWeight: 800, color: RED }}>{data.avro_tip_wrong}</span>
            <span style={{ fontSize: 44, color: MUTED }}> = the notes' length</span>
          </Tag>
        </Appear>
      </div>

      {/* Production */}
      <div style={{ position: "absolute", inset: 0, opacity: prodOp }}>
        <div style={{ position: "absolute", left: HX + 120, top: 380 }}>
          <ProductionFace mood="deadpan" size={400} />
        </div>
        <div style={{ position: "absolute", left: HX + 560, top: 420, width: 460, padding: "26px 32px", borderRadius: 28, background: "#262a30", border: `4px solid ${LIGHT}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 50, color: FG, lineHeight: 1.3 }}>No error. No log. My favourite kind.</div>
        </div>
      </div>

      {/* the three outcomes */}
      <div style={{ position: "absolute", inset: 0, opacity: sumOp }}>
        <Title text="Loud vs silent" at={at.sumAt - 12} />
        {[
          { f: "JSON", out: "KeyError", label: "CRASH", solid: false, note: "found in minutes" },
          { f: "Protobuf", out: "tip = 0", label: "SILENT", solid: true, note: "months in your data" },
          { f: "Avro", out: "tip = 46", label: "SILENT", solid: true, note: "months in your data" },
        ].map((r, i) => (
          <div key={r.f} style={{ position: "absolute", left: 120, top: 330 + i * 200, display: "flex", alignItems: "center" }}>
            <div style={{ width: 420, fontFamily: SANS, fontWeight: 800, fontSize: 72, color: FG }}>{r.f}</div>
            <div style={{ width: 520, fontFamily: MONO, fontWeight: 800, fontSize: 68, color: RED }}>{r.out}</div>
            <div style={{ width: 380, position: "relative", height: 90 }}>
              <Stamp at={at.sumAt + i * 6} label={r.label} color={RED} solid={r.solid} size={56} style={{ left: 0, top: 4 }} />
            </div>
            <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 52, color: MUTED, opacity: interpolate(frame, [i === 0 ? c("minutes") : c("months"), (i === 0 ? c("minutes") : c("months")) + 10], [0, 1], cl) }}>{r.note}</div>
          </div>
        ))}
        <Appear at={at.neither} style={{ left: 120, top: 1000 }}>
          <Card color={LIGHT} style={{ width: 1700 }}>
            <Tag size={60}>Not a format bug: a broken rule</Tag>
            <Muted size={44} style={{ marginTop: 10 }}>a reused field number · a reader without the writer's schema</Muted>
          </Card>
        </Appear>
      </div>

      <Sfx name="type" from={at.json} volume={0.3} />
      <Sfx name="buzz" from={at.json} volume={0.3} />
      <Sfx name="type" from={at.proto} volume={0.3} />
      <Sfx name="stamp" from={at.ok} volume={0.5} />
      <Sfx name="type" from={at.avro} volume={0.3} />
      <Sfx name="stamp" from={at.a46} volume={0.5} />
      <Sfx name="cricket" from={c("favorite") + 20} volume={0.35} />
    </Scene>
  );
};
