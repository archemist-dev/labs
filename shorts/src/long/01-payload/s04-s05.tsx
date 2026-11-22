// Scene 4: lab scene 1. The real EC2 log (logs.json, parsed from results-ec2-t3micro-2026-10-12.txt, run 1 of the
// typical block) types in on the spoken sizes; then the real JSON bytes with the field names lit (data.json from
// 01-payload-encoding/video_data.py; cropped before "items", so no product names show), the schema both sides hold,
// names vs values bars; then back to the log with the encode and decode columns lit.
// Scene 5: the fine print. Protobuf's encode plus the dict-to-proto build against JSON; Avro's speed is fastavro.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FG, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "../../shorts/01-payload-encoding/data.json";
import logs from "./logs.json";
import { AMBER, Appear, Card, cl, cue, HBar, Muted, Scene, Sfx, Stamp, Tag, Title } from "./common";

const fmtN = (s: string) => (/^\d{4,}$/.test(s) ? Number(s).toLocaleString("en-US") : s);
const row = (i: number) => logs.size[i].trim().split(/\s{2,}/); // JSON | 1076 | 516 | 100% | 12.7 | 12.2
const COLS = ["format", "bytes", "gzip", "vs JSON", "encode µs", "decode µs"];
const CW = [380, 230, 210, 250, 300, 300];

/** The log as a table: real tokens from the run, one row per format. `lit` = column indexes to light. */
const LogTable: React.FC<{ rows: { at: number; color: string }[]; lit?: number[]; litColor?: (r: number) => string; extra?: React.ReactNode }> = ({ rows, lit = [], litColor, extra }) => {
  const frame = useCurrentFrame();
  return (
    <Card style={{ position: "absolute", left: 120, top: 300, width: 1820, padding: "34px 44px" }}>
      <div style={{ display: "flex", fontFamily: MONO, fontSize: 38, color: MUTED, marginBottom: 14 }}>
        {COLS.map((c, i) => (
          <div key={c} style={{ width: CW[i], textAlign: i ? "right" : "left", color: lit.includes(i) ? FG : MUTED }}>{c}</div>
        ))}
      </div>
      {rows.map((r, ri) => {
        const o = interpolate(frame, [r.at, r.at + 10], [0, 1], cl);
        const t = row(ri);
        return (
          <div key={ri} style={{ display: "flex", fontFamily: MONO, fontSize: 64, lineHeight: 1.5, opacity: o }}>
            {t.map((tok, i) => (
              <div
                key={i}
                style={{
                  width: CW[i],
                  textAlign: i ? "right" : "left",
                  fontWeight: i === 1 || lit.includes(i) ? 800 : 400,
                  color: lit.length ? (lit.includes(i) ? (litColor ? litColor(ri) : r.color) : GRAY) : i === 1 ? r.color : LIGHT,
                }}
              >
                {i ? fmtN(tok) : tok}
              </div>
            ))}
          </div>
        );
      })}
      {extra}
    </Card>
  );
};

// the JSON bytes up to "items", names marked from data.json's json_names mask
const CUT = data.json.indexOf('"items"');
const JTEXT = data.json.slice(0, CUT);
const JMASK = data.json_names.slice(0, CUT);
const runs = (() => {
  const out: { t: string; name: boolean }[] = [];
  for (let i = 0; i < JTEXT.length; i++) {
    const n = JMASK[i] === "1";
    if (out.length && out[out.length - 1].name === n) out[out.length - 1].t += JTEXT[i];
    else out.push({ t: JTEXT[i], name: n });
  }
  return out;
})();

const SCHEMA = [
  "message Order {",
  "  int64  order_id    = 1;",
  "  string status      = 5;",
  "  string currency    = 6;",
  "  int64  total       = 7;",
  "  string notes       = 8;",
  "  Address address    = 9;",
  "  …",
  "}",
];

export const LabSize: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1, o = 0) => cue("04", w, n, o);
  const rowsAt = [c("1"), c("Protobuf", 1), c("Avro", 1)];
  const whyAt = c("Why") - 6;
  const namesAt = c("461");
  const schemaAt = c("Protobuf", 2);
  const travelAt = c("values");
  const speedAt = c("speed") - 8;
  const A = interpolate(frame, [whyAt, whyAt + 10], [1, 0], cl) + interpolate(frame, [speedAt, speedAt + 10], [0, 1], cl);
  const B = interpolate(frame, [whyAt, whyAt + 10, schemaAt - 6, schemaAt + 4], [0, 1, 1, 0], cl);
  const C = interpolate(frame, [schemaAt - 6, schemaAt + 4, speedAt, speedAt + 10], [0, 1, 1, 0], cl);
  const encAt = c("13");
  const underAt = c("under");
  const decAt = c("12");
  const lit = frame < speedAt ? [] : frame < decAt ? [4] : [4, 5];
  return (
    <Scene id="04">
      <Title text="The real log" at={0} />
      <div style={{ position: "absolute", top: 104, right: 120, textAlign: "right", fontFamily: MONO, fontSize: 36, color: MUTED, lineHeight: 1.45 }}>
        <div>results-ec2-t3micro-2026-10-12.txt · run 1</div>
        <div>{logs.machine}</div>
      </div>

      {/* A: the log, sizes then speed */}
      <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, A) }}>
        <LogTable
          rows={[
            { at: rowsAt[0], color: FG },
            { at: rowsAt[1], color: GREEN },
            { at: rowsAt[2], color: FG },
          ]}
          lit={lit}
          litColor={(r) => (r === 1 ? GREEN : r === 2 ? LIGHT : FG)}
        />
        {/* bars beside the table, bytes per format */}
        <div style={{ position: "absolute", left: 2010, top: 420, opacity: frame < speedAt ? 1 : 0.25 }}>
          {[1076, 470, 417].map((b, i) => {
            const p = interpolate(frame, [rowsAt[i], rowsAt[i] + 16], [0, 1], cl);
            return <div key={i} style={{ width: (b / 1076) * 420 * p, height: 52, borderRadius: 8, marginBottom: 44, background: i === 1 ? GREEN : LIGHT }} />;
          })}
        </div>
        {frame >= speedAt ? (
          <>
            <Appear at={encAt} style={{ left: 140, top: 980 }}>
              <Tag size={60}>
                encode: <span style={{ fontFamily: MONO, fontWeight: 800 }}>12.7</span> vs <span style={{ fontFamily: MONO, fontWeight: 800, color: GREEN }}>0.9</span> µs
                <span style={{ color: GREEN, marginLeft: 30, opacity: interpolate(frame, [underAt, underAt + 10], [0, 1], cl) }}>
                  <span style={{ fontFamily: MONO, fontWeight: 800 }}>14x</span>
                </span>
              </Tag>
            </Appear>
            <Appear at={decAt} style={{ left: 140, top: 1100 }}>
              <Tag size={60}>
                decode: <span style={{ fontFamily: MONO, fontWeight: 800 }}>12.2</span> vs <span style={{ fontFamily: MONO, fontWeight: 800, color: GREEN }}>1.4</span> µs
                <span style={{ fontFamily: MONO, fontWeight: 800, color: GREEN, marginLeft: 30 }}>9x</span>
              </Tag>
            </Appear>
          </>
        ) : null}
      </div>

      {/* B: the real JSON bytes, names lit */}
      <div style={{ position: "absolute", inset: 0, opacity: B }}>
        <Card style={{ position: "absolute", left: 120, top: 300, width: 2240, padding: "40px 48px" }}>
          <Muted size={38}>json.dumps(order) · first {JTEXT.length} of 1,076 bytes</Muted>
          <div style={{ marginTop: 20, fontFamily: MONO, fontSize: 50, lineHeight: 1.6, wordBreak: "break-all" }}>
            {runs.map((r, i) => (
              <span key={i} style={{ color: r.name ? (frame >= namesAt ? AMBER : FG) : frame >= namesAt ? GRAY : FG, fontWeight: r.name && frame >= namesAt ? 800 : 400 }}>
                {r.t}
              </span>
            ))}
            <span style={{ color: MUTED }}> …</span>
          </div>
        </Card>
        <Appear at={namesAt} style={{ left: 120, top: 1110 }}>
          <Tag size={72}>
            <span style={{ fontFamily: MONO, fontWeight: 800, color: AMBER }}>461</span>
            <span style={{ color: MUTED }}> of </span>
            <span style={{ fontFamily: MONO, fontWeight: 800 }}>1,076</span> bytes are field names
            <span style={{ fontFamily: MONO, fontWeight: 800, color: AMBER, marginLeft: 30 }}>43%</span>
          </Tag>
        </Appear>
        <Appear at={c("every")} style={{ left: 120, top: 1230 }}>
          <Muted size={52}>the same names, in every message</Muted>
        </Appear>
      </div>

      {/* C: the schema both sides hold; only values travel */}
      <div style={{ position: "absolute", inset: 0, opacity: C }}>
        {[0, 1].map((side) => (
          <Appear key={side} at={schemaAt + side * 8} style={{ left: side ? 1720 : 120, top: 300 }}>
            <Card style={{ width: 720, padding: "30px 36px" }}>
              <Muted size={38}>{side ? "reader" : "writer"} · order.proto</Muted>
              <div style={{ fontFamily: MONO, fontSize: 40, lineHeight: 1.5, color: FG, marginTop: 10, whiteSpace: "pre" }}>
                {SCHEMA.map((l, i) => (
                  <div key={i}>
                    {l.replace(/(\w+)(\s+= \d+;)/, "$1$2").split(/(\b[a-z_]+(?=\s+= ))/).map((p, j) => (
                      <span key={j} style={{ color: /^[a-z_]+$/.test(p) && l.includes("=") ? AMBER : FG }}>{p}</span>
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          </Appear>
        ))}
        <Appear at={schemaAt + 20} style={{ left: 900, top: 520 }}>
          <div style={{ width: 760, textAlign: "center" }}>
            <Tag size={52} color={GREEN} style={{ whiteSpace: "normal" }}>values only</Tag>
            <div style={{ marginTop: 18, height: 10, borderRadius: 5, background: GREEN, width: interpolate(frame, [travelAt, travelAt + 24], [0, 760], cl) }} />
            <div style={{ fontFamily: MONO, fontSize: 40, color: MUTED, marginTop: 14 }}>08 81 db fe 16 12 24 …</div>
          </div>
        </Appear>
        <div style={{ position: "absolute", left: 120, top: 1000 }}>
          <div style={{ display: "flex", alignItems: "center", height: 100, opacity: interpolate(frame, [travelAt, travelAt + 10], [0, 1], cl) }}>
            <div style={{ width: 340, fontFamily: SANS, fontWeight: 700, fontSize: 52, color: FG }}>JSON</div>
            <div style={{ width: (461 / 1076) * 1500, height: 64, background: AMBER, borderRadius: "10px 0 0 10px" }} />
            <div style={{ width: (615 / 1076) * 1500, height: 64, background: LIGHT, borderRadius: "0 10px 10px 0" }} />
            <div style={{ marginLeft: 24, fontFamily: MONO, fontWeight: 800, fontSize: 56, color: FG }}>1,076</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", height: 100, opacity: interpolate(frame, [travelAt + 8, travelAt + 18], [0, 1], cl) }}>
            <div style={{ width: 340, fontFamily: SANS, fontWeight: 700, fontSize: 52, color: GREEN }}>Protobuf</div>
            <div style={{ width: (470 / 1076) * 1500, height: 64, background: GREEN, borderRadius: 10 }} />
            <div style={{ marginLeft: 24, fontFamily: MONO, fontWeight: 800, fontSize: 56, color: GREEN }}>470</div>
          </div>
          <div style={{ display: "flex", gap: 40, marginLeft: 340, marginTop: 8, fontFamily: SANS, fontWeight: 700, fontSize: 40, opacity: interpolate(frame, [travelAt, travelAt + 10], [0, 1], cl) }}>
            <span style={{ color: AMBER }}>■ names</span>
            <span style={{ color: LIGHT }}>■ values</span>
          </div>
        </div>
      </div>
      {rowsAt.map((t, i) => (
        <Sfx key={i} name="type" from={t} volume={0.35} />
      ))}
      <Sfx name="reveal" from={namesAt} volume={0.4} />
    </Scene>
  );
};

// ---- Scene 5 ---------------------------------------------------------------------------------------------------

export const FinePrint: React.FC = () => {
  const frame = useCurrentFrame();
  const c = (w: string, n = 1) => cue("05", w, n);
  const buildAt = c("building");
  const goneAt = c("gone");
  const goAt = c("Go");
  const avroAt = c("Avro") - 6;
  const libAt = c("library");
  const javaAt = c("Java", 2);
  const sumAt = c("compare");
  const A = interpolate(frame, [avroAt, avroAt + 10], [1, 0], cl);
  const buildW = interpolate(frame, [buildAt, buildAt + 20], [0, 1], cl);
  const MAX = 28;
  const PX = 1500;
  return (
    <Scene id="05">
      <Title text="The fine print" at={0} />
      <div style={{ position: "absolute", inset: 0, opacity: A }}>
        <Muted size={44} style={{ position: "absolute", left: 120, top: 300 }}>encode, µs per order · Python</Muted>
        <div style={{ position: "absolute", left: 120, top: 380 }}>
          <HBar at={c("fast")} label="JSON" value={12.7} max={MAX} width={PX} color={LIGHT} fmt={(n) => n.toFixed(1)} />
          <div style={{ display: "flex", alignItems: "center", height: 90 }}>
            <div style={{ width: 360, fontFamily: SANS, fontWeight: 700, fontSize: 52, color: GREEN }}>Protobuf</div>
            <div style={{ width: (0.9 / MAX) * PX, height: 64, background: GREEN, borderRadius: 8, opacity: interpolate(frame, [c("fast"), c("fast") + 10], [0, 1], cl) }} />
            <div style={{ width: (13.1 / MAX) * PX * buildW, height: 64, background: AMBER, borderRadius: "0 10px 10px 0", opacity: buildW > 0 ? 1 : 0 }} />
            <div style={{ marginLeft: 24, fontFamily: MONO, fontWeight: 800, fontSize: 56, color: buildW > 0.9 ? FG : GREEN }}>{buildW > 0.9 ? "14.0" : "0.9"}</div>
          </div>
          <div style={{ display: "flex", gap: 40, marginLeft: 360, marginTop: 10, fontFamily: SANS, fontWeight: 700, fontSize: 42 }}>
            <span style={{ color: GREEN }}>■ encode 0.9</span>
            <span style={{ color: AMBER, opacity: buildW }}>■ dict → proto object 13.1</span>
          </div>
        </div>
        <Stamp at={goneAt} label="SPEED WIN GONE" color={RED} size={60} style={{ left: 1500, top: 760 }} />
        <Appear at={goAt} style={{ left: 120, top: 960 }}>
          <Card color={GRAY} style={{ width: 1500 }}>
            <Tag size={54}>Go · Java: you build the struct anyway</Tag>
            <Muted size={44} style={{ marginTop: 8 }}>the 13.1 µs is a Python cost</Muted>
          </Card>
        </Appear>
      </div>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - A }}>
        <Muted size={44} style={{ position: "absolute", left: 120, top: 300 }}>size and encode, typical order</Muted>
        <div style={{ position: "absolute", left: 120, top: 380 }}>
          <HBar at={avroAt + 6} label="Avro bytes" value={417} max={1076} width={1100} color={GREEN} labelW={480} />
          <HBar at={c("slowest")} label="Avro encode" value={26.6} max={MAX} width={1100} color={LIGHT} unit=" µs" fmt={(n) => n.toFixed(1)} labelW={480} />
        </div>
        <Appear at={libAt} style={{ left: 120, top: 640 }}>
          <Card color={LIGHT} style={{ width: 1300 }}>
            <Tag size={54}>fastavro 1.13 · Python</Tag>
            <Muted size={44} style={{ marginTop: 8 }}>the library, not the format</Muted>
          </Card>
        </Appear>
        <Appear at={javaAt} style={{ left: 1520, top: 640 }}>
          <Card color={GRAY} style={{ width: 900 }}>
            <Tag size={54} color={LIGHT}>Java · Go</Tag>
            <Muted size={44} style={{ marginTop: 8 }}>not tested</Muted>
          </Card>
        </Appear>
        <Appear at={sumAt} style={{ left: 120, top: 1000 }}>
          <Tag size={64}>
            <span style={{ color: GREEN }}>✓ compare sizes</span>
            <span style={{ color: MUTED, margin: "0 30px" }}>·</span>
            <span style={{ color: LIGHT }}>timings = Python, one machine</span>
          </Tag>
        </Appear>
      </div>
      <Sfx name="stamp" from={goneAt} volume={0.45} />
    </Scene>
  );
};
