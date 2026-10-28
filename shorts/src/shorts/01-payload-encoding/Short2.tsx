import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Mark, Pop, Stamp, Title, useDraw, useSpring } from "../../components/parts";
import { ProductionFace } from "../../components/Production";
import { Sfx, useCue } from "../../components/Shell";
import { BG, FG, GRAY, GREEN, GREEN_BG, GRID, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";

// Short 2: the real problem is schema change. One change (notes out, tip in) across the three formats from Short 1.
// Results from 01-payload-encoding/README.md: strict JSON reader -> KeyError; Protobuf with tip reusing notes'
// number 8 -> tip = 0, no error; Avro read with the wrong writer schema -> tip = 46, no error. video_data.py proves
// 46 is the notes length prefix (0x5c) read as the tip.

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ORDER = JSON.parse(data.json) as { items: { name: string; qty: number; unit_price: number }[]; total: number };
const ITEM = ORDER.items[0]; // Pizza Margherita 0, 1 × £11.99
const LOSS = ITEM.unit_price - data.avro_tip_wrong; // pence lost per order if unit_price were read like tip
const PROTO_TIP = 0; // README: Protobuf, tip reusing number 8 -> tip = 0
const gbp = (p: number) => `£${(p / 100).toFixed(2)}`;
const SCREEN = "#15171a";

const Card: React.FC<{ style?: React.CSSProperties; children: React.ReactNode }> = ({ style, children }) => (
  <div style={{ position: "absolute", background: "#202328", border: `3px solid ${GRID}`, borderRadius: 18, padding: "20px 30px", fontFamily: MONO, fontSize: 38, lineHeight: "54px", color: LIGHT, whiteSpace: "pre", ...style }}>
    {children}
  </div>
);

// A phone running the food-delivery app: the order screen, the price it read, or the crash dialog.
const AppPhone: React.FC<{ w?: number; version: string; state: "ok" | "missing" | "crash" }> = ({ w = 160, version, state }) => {
  const s = w / 160;
  const border = state === "crash" ? RED : state === "ok" ? LIGHT : FG;
  return (
    <div style={{ position: "relative", width: w, height: 300 * s, borderRadius: 26 * s, border: `${5 * s}px solid ${border}`, background: SCREEN, overflow: "hidden" }}>
      <div style={{ margin: `${8 * s}px auto 0`, width: 50 * s, height: 8 * s, borderRadius: 4 * s, background: GRID }} />
      <div style={{ padding: `${10 * s}px ${12 * s}px`, fontFamily: SANS, fontWeight: 800, fontSize: 17 * s, color: MUTED }}>app {version}</div>
      <div style={{ margin: `0 ${10 * s}px`, padding: 10 * s, borderRadius: 10 * s, background: "#22262c" }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 16 * s, color: LIGHT }}>Margherita</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 24 * s, color: state === "ok" ? FG : RED, marginTop: 4 * s }}>
          {state === "ok" ? gbp(ITEM.unit_price) : "£ ?"}
        </div>
      </div>
      <div style={{ margin: `${12 * s}px ${10 * s}px 0`, height: 34 * s, borderRadius: 10 * s, background: state === "ok" ? GREEN : GRAY, opacity: 0.8 }} />
      {state === "crash" ? (
        <div style={{ position: "absolute", inset: 0, background: "rgba(10,10,12,.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "82%", padding: 10 * s, borderRadius: 10 * s, background: "#2a2d33", border: `${3 * s}px solid ${RED}` }}>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 17 * s, color: RED }}>App stopped</div>
            <div style={{ fontFamily: MONO, fontSize: 12 * s, color: LIGHT, marginTop: 4 * s }}>price: missing</div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

// ---------- 1. The story: a rename, old phones crash ----------

const VERSIONS = ["v1", "v2", "v1", "v2", "v1"];

const Story: React.FC = () => {
  const frame = useCurrentFrame();
  const releases = useCue("releases", 30);
  const price = useCue("price", releases + 30);
  const total = useCue("total", price + 15);
  const old = useCue("old", total + 20);
  const crash = useCue("crash", old + 40);
  const typed = Math.round(interpolate(frame, [total, total + 14], [0, "totalPrice".length], clamp));
  const strike = useDraw(total - 4, 8);
  const redFlash = frame < crash ? 0 : interpolate(frame, [crash, crash + 10], [0.28, 0], clamp);
  return (
    <>
      <Title text="A field was renamed" sub="API response · by accident" />
      <Pop at={releases} sfx="reveal" style={{ left: 80, top: 405 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22, fontFamily: MONO, fontWeight: 800, fontSize: 36 }}>
          <span style={{ padding: "6px 20px", border: `4px solid ${LIGHT}`, borderRadius: 30, color: LIGHT }}>release v1</span>
          <span style={{ color: MUTED }}>→</span>
          <span style={{ padding: "6px 20px", border: `4px solid ${FG}`, borderRadius: 30, color: FG }}>release v2</span>
        </div>
      </Pop>
      <Card style={{ left: 80, top: 490, width: 860 }}>
        <span style={{ background: frame >= price ? "rgba(229,72,77,.35)" : "transparent", borderRadius: 6 }}>
          {'"'}
          <span style={{ position: "relative", color: frame >= price ? FG : LIGHT }}>
            price
            <span style={{ position: "absolute", left: 0, top: 28, height: 5, width: `${strike * 100}%`, background: RED }} />
          </span>
          {`": ${ITEM.unit_price},\n`}
        </span>
        <span style={{ color: FG, opacity: typed ? 1 : 0 }}>
          {'"'}
          {"totalPrice".slice(0, typed)}
          {typed < 10 && frame % 10 < 5 ? "▌" : ""}
          {`": ${ITEM.unit_price},`}
        </span>
      </Card>
      <Sfx name="type" at={total} volume={0.45} />
      {VERSIONS.map((v, i) => {
        const isOld = v === "v1";
        const state = !isOld ? "ok" : frame >= crash ? "crash" : frame >= old + 12 ? "missing" : "ok";
        const shake = isOld && frame >= crash && frame < crash + 12 ? Math.sin(frame * 3 + i) * 9 : 0;
        return (
          <Pop key={i} at={old + i * 3} style={{ left: 80 + i * 186, top: 690 }}>
            <div style={{ transform: `translateX(${shake}px)` }}>
              <AppPhone w={150} version={v} state={state} />
            </div>
          </Pop>
        );
      })}
      <Pop at={old + 14} style={{ left: 80, top: 1000 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 38, color: LIGHT }}>
          v1 asks for <span style={{ color: RED }}>"price"</span> → <span style={{ color: RED }}>missing</span>
        </div>
      </Pop>
      <Stamp at={crash} label="CRASH" color={RED} sfx="buzz" style={{ left: 700, top: 1080 }} />
      <div style={{ position: "absolute", inset: 0, background: RED, opacity: redFlash, pointerEvents: "none" }} />
    </>
  );
};

// ---------- 2. A crash is a fire alarm ----------

const FireAlarm: React.FC<{ ringing: boolean; size?: number }> = ({ ringing, size = 380 }) => {
  const frame = useCurrentFrame();
  const beacon = ringing && frame % 12 < 6;
  const hammer = ringing ? Math.sin(frame * 1.6) * 16 : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 380 380">
      {ringing
        ? [0, 1, 2].map((k) => {
            const r = 150 + ((frame * 3 + k * 30) % 90);
            return <circle key={k} cx={190} cy={210} r={r} fill="none" stroke={RED} strokeWidth={5} opacity={(1 - (r - 150) / 90) * 0.8} />;
          })
        : null}
      <rect x={160} y={20} width={60} height={40} rx={12} fill={beacon ? "#ff6b6b" : "#7a2a2d"} />
      {beacon ? <circle cx={190} cy={40} r={60} fill="#ff6b6b" opacity={0.25} /> : null}
      <circle cx={190} cy={210} r={135} fill="#3a1416" stroke={RED} strokeWidth={8} />
      <circle cx={190} cy={210} r={95} fill={RED} />
      <circle cx={190} cy={210} r={60} fill="#c93a3f" />
      <rect x={182} y={130} width={16} height={60} rx={6} fill={FG} transform={`rotate(${hammer} 190 210)`} />
      <circle cx={190} cy={210} r={14} fill={FG} />
    </svg>
  );
};

const PATH = ["crash report", "alert", "fix", "release"];

const Alarm: React.FC = () => {
  const frame = useCurrentFrame();
  const lucky = useCue("lucky", 12);
  const alarm = useCue("alarm", lucky + 25);
  const loud = useCue("loud", alarm + 20);
  const saves = useCue("saves", loud + 15);
  const ringing = frame >= alarm;
  const pulse = ringing && frame < saves ? 0.12 + 0.1 * Math.sin(frame * 0.8) : 0;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, boxShadow: `inset 0 0 220px rgba(229,72,77,${pulse * 3})`, pointerEvents: "none" }} />
      <Title text="A crash is a fire alarm" sub="the lucky case" />
      <Pop at={lucky} style={{ left: 350, top: 410 }}>
        <FireAlarm ringing={ringing} />
      </Pop>
      <Sfx name="alarm" at={alarm} volume={0.5} />
      <Pop at={loud} sfx="slap" style={{ left: 120, top: 830 }}>
        <div style={{ width: 380, textAlign: "center", padding: "16px 0", border: `5px solid ${RED}`, borderRadius: 16, fontFamily: SANS, fontWeight: 800, fontSize: 46, color: RED }}>loud</div>
      </Pop>
      <Pop at={saves} sfx="stamp" style={{ left: 580, top: 830 }}>
        <div style={{ width: 380, textAlign: "center", padding: "16px 0", border: `5px solid ${GREEN}`, borderRadius: 16, background: GREEN_BG, fontFamily: SANS, fontWeight: 800, fontSize: 46, color: GREEN }}>saves you</div>
      </Pop>
      <div style={{ position: "absolute", left: 80, top: 990, display: "flex", alignItems: "center", gap: 12 }}>
        {PATH.map((p, i) => {
          const at = alarm + 16 + i * 7;
          const done = i === PATH.length - 1;
          return (
            <React.Fragment key={p}>
              {i ? <span style={{ fontFamily: MONO, fontSize: 32, color: MUTED, opacity: frame >= at ? 1 : 0 }}>→</span> : null}
              <Pop at={at} style={{ position: "relative" }}>
                <div style={{ padding: "12px 16px", borderRadius: 12, border: `4px solid ${done ? GREEN : GRAY}`, background: done ? GREEN_BG : "transparent", fontFamily: SANS, fontWeight: 800, fontSize: 32, color: done ? FG : LIGHT, whiteSpace: "nowrap" }}>{p}</div>
              </Pop>
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};

// ---------- 3. The test setup: one change, the three formats from Short 1 ----------

const FORMATS: [string, number][] = [
  ["JSON", 1076],
  ["Protobuf", 470],
  ["Avro", 417],
];

const Change: React.FC = () => {
  const frame = useCurrentFrame();
  const formats = useCue("formats", 15);
  const out = useCue("out", formats + 40);
  const inn = useCue("in", out + 25);
  const strike = useDraw(out, 8);
  return (
    <>
      <Title text="One change" sub="the three formats from my last video" />
      <div style={{ position: "absolute", left: 80, top: 400, display: "flex", gap: 25 }}>
        {FORMATS.map(([name, bytes], i) => (
          <Pop key={name} at={formats + i * 5} sfx={i === 0 ? "reveal" : undefined} style={{ position: "relative" }}>
            <div style={{ width: 290, padding: "14px 0", textAlign: "center", border: `4px solid ${LIGHT}`, borderRadius: 16 }}>
              <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>{name}</div>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: MUTED }}>{bytes.toLocaleString("en-US")} B</div>
            </div>
          </Pop>
        ))}
      </div>
      <div style={{ position: "absolute", left: 80, top: 600, display: "flex", gap: 40 }}>
        {["v1 (old data)", "v2 (new reader)"].map((label, col) => (
          <div key={label} style={{ width: 440, border: `3px solid ${GRID}`, borderRadius: 18, padding: "18px 24px", background: "#202328" }}>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 36, color: col ? FG : LIGHT, marginBottom: 6 }}>{label}</div>
            {["order_id", "…", "status_history"].map((f) => (
              <div key={f} style={{ fontFamily: MONO, fontSize: 30, lineHeight: "44px", color: MUTED }}>{f}</div>
            ))}
            {col === 0 ? (
              <div style={{ position: "relative", fontFamily: MONO, fontWeight: 800, fontSize: 32, lineHeight: "48px", color: frame >= out ? RED : FG }}>
                notes: string
                <div style={{ position: "absolute", left: 0, top: 24, height: 5, width: `${strike * 100}%`, background: RED }} />
              </div>
            ) : (
              <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 32, lineHeight: "48px", color: FG, opacity: frame >= inn ? 1 : 0 }}>tip: long</div>
            )}
          </div>
        ))}
      </div>
      <Pop at={out} sfx="slap" style={{ left: 80, top: 920 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: RED }}>− notes <span style={{ color: MUTED, fontSize: 28, fontWeight: 700 }}>"{data.avro_notes.slice(0, 22)}…"</span></div>
      </Pop>
      <Pop at={inn} sfx="reveal" style={{ left: 80, top: 990 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: FG }}>+ tip</div>
      </Pop>
      <Pop at={inn + 12} style={{ left: 80, top: 1070 }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, color: LIGHT }}>new code reads old data: what comes back?</div>
      </Pop>
    </>
  );
};

// ---------- 4. Same change, three results ----------

const ResultRow: React.FC<{ at: number; y: number; name: string; children: React.ReactNode }> = ({ at, y, name, children }) => (
  <Pop at={at} sfx="reveal" style={{ left: 80, top: y, width: 920 }}>
    <div style={{ height: 196, border: `3px solid ${GRID}`, borderRadius: 18, padding: "16px 26px", background: "#202328", position: "relative" }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>{name}</div>
      {children}
    </div>
  </Pop>
);

const Grid: React.FC = () => {
  const frame = useCurrentFrame();
  const json = useCue("json", 10);
  const fine = useCue("fine", json + 20);
  const proto = useCue("proto", fine + 15);
  const slot = useCue("slot", proto + 30);
  const zero = useCue("zero", slot + 20);
  const avro = useCue("avro", zero + 20);
  const schema = useCue("schema", avro + 15);
  const f46 = useCue("f46", schema + 25);
  const line = (at: number, text: React.ReactNode, color = LIGHT) => (
    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, lineHeight: "44px", color, opacity: frame >= at ? 1 : 0 }}>{text}</div>
  );
  return (
    <>
      <Title text="Three results" sub="same change · new reader, old data" />
      <ResultRow at={json} y={400} name="JSON">
        {line(json, <>d["notes"] → <span style={{ color: RED }}>KeyError</span></>)}
        {line(fine, <span style={{ color: GREEN }}>loud = fine: you see it, you fix it</span>)}
        <Stamp at={json + 8} label="CRASH" color={RED} sfx="buzz" style={{ right: 30, top: 24 }} />
      </ResultRow>
      <ResultRow at={proto} y={620} name="Protobuf">
        {line(proto, "no error")}
        {line(slot, <>tip took notes' slot <span style={{ color: FG }}>#8</span></>)}
        <Pop at={zero} sfx="stamp" style={{ right: 30, top: 18 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 64, color: FG }}>
              tip = <span style={{ color: RED }}>{PROTO_TIP}</span>
            </div>
            <div style={{ display: "inline-block", marginTop: 6, padding: "6px 18px", background: RED, borderRadius: 8, fontFamily: MONO, fontWeight: 800, fontSize: 30, color: FG }}>SILENT</div>
          </div>
        </Pop>
      </ResultRow>
      <ResultRow at={avro} y={840} name="Avro">
        {line(schema, "read with the wrong schema")}
        {line(f46 + 10, <>46 = length of notes (0x{data.avro_prefix_hex})</>, MUTED)}
        <Pop at={f46} sfx="stamp" style={{ right: 30, top: 18 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 64, color: FG }}>
              tip = <span style={{ color: RED }}>{data.avro_tip_wrong}</span>
            </div>
            <div style={{ display: "inline-block", marginTop: 6, padding: "6px 18px", background: RED, borderRadius: 8, fontFamily: MONO, fontWeight: 800, fontSize: 30, color: FG }}>SILENT</div>
          </div>
        </Pop>
      </ResultRow>
      <Pop at={f46 + 16} style={{ left: 80, top: 1065 }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: LIGHT }}>no error · no log · wrong number</div>
      </Pop>
    </>
  );
};

// ---------- 5. Production, pleased ----------

const ProductionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const fav = useCue("fav", 40);
  const bob = Math.sin(frame * 0.12) * 6;
  const lines: [string, number][] = [
    ["error", 6],
    ["log", 20],
  ];
  return (
    <>
      <Pop at={0} style={{ left: 140, top: 520 }}>
        <div style={{ transform: `translateY(${bob}px)` }}>
          <ProductionFace mood={frame >= fav ? "pleased" : "deadpan"} size={360} />
        </div>
      </Pop>
      <div style={{ position: "absolute", left: 140, width: 360, top: 950, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 36, color: LIGHT }}>PRODUCTION</div>
      <Pop at={6} sfx="reveal" style={{ left: 540, top: 330 }}>
        <div style={{ position: "relative", width: 460, padding: "26px 30px", borderRadius: 26, background: "#262a30", border: `4px solid ${LIGHT}` }}>
          {lines.map(([k, at]) => (
            <div key={k} style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, lineHeight: "60px", color: frame >= at ? FG : "transparent" }}>
              {k}: <span style={{ color: frame >= at ? MUTED : "transparent" }}>none</span>
            </div>
          ))}
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 42, color: frame >= fav ? FG : "transparent", marginTop: 8 }}>my favourite kind.</div>
          <div style={{ position: "absolute", left: -2, bottom: -40, width: 0, height: 0, borderTop: `40px solid ${LIGHT}`, borderRight: "40px solid transparent" }} />
        </div>
      </Pop>
      <Sfx name="cricket" at={fav + 20} volume={0.5} />
    </>
  );
};

// ---------- 6. A gas leak, then: imagine that's a price ----------

const Pipe: React.FC<{ leaking: number }> = ({ leaking }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={920} height={260} viewBox="0 0 920 260">
      <rect x={0} y={150} width={920} height={60} rx={10} fill="#2b2f36" stroke={GRAY} strokeWidth={4} />
      {[220, 700].map((x) => (
        <rect key={x} x={x} y={138} width={40} height={84} rx={6} fill="#353a42" stroke={GRAY} strokeWidth={4} />
      ))}
      <path d="M455 150 L465 165 L452 178 L466 192" fill="none" stroke={BG} strokeWidth={6} />
      {Array.from({ length: 16 }, (_, k) => {
        const life = ((frame * 0.9 + k * 13) % 120) / 120;
        const x = 460 + Math.sin(k * 2.1 + frame * 0.03) * 70 * life + (k % 2 ? 1 : -1) * 40 * life;
        const y = 150 - 120 * life;
        return <circle key={k} cx={x} cy={y} r={10 + 34 * life} fill={LIGHT} opacity={leaking * 0.22 * (1 - life)} />;
      })}
    </svg>
  );
};

const Receipt: React.FC<{ at: number; x: number; y: number; wrong: boolean; small?: boolean }> = ({ at, x, y, wrong, small }) => {
  const frame = useCurrentFrame();
  const print = interpolate(frame, [at, at + 12], [0, 1], clamp);
  const glitch = wrong && frame >= at + 14 && frame < at + 26 && frame % 4 < 2;
  const showWrong = wrong && frame >= at + 14;
  const total = showWrong ? ORDER.total - LOSS * ITEM.qty : ORDER.total;
  const f = small ? 0.62 : 1;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 440 * f, height: 330 * f * print, overflow: "hidden", opacity: frame >= at ? 1 : 0 }}>
      <div style={{ width: 440 * f, padding: `${22 * f}px ${26 * f}px`, background: "#ece7dd", borderRadius: 8, fontFamily: MONO, fontSize: 30 * f, lineHeight: `${46 * f}px`, color: "#2a2a2a" }}>
        <div style={{ fontWeight: 800, textAlign: "center" }}>ORDER #48213377</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 * f }}>
          <span>1× Margherita</span>
          <span style={{ color: showWrong ? "#c4262c" : "#2a2a2a", fontWeight: 800, transform: glitch ? "translateX(5px)" : undefined }}>{showWrong ? gbp(data.avro_tip_wrong) : gbp(ITEM.unit_price)}</span>
        </div>
        <div style={{ borderTop: "3px dashed #999", marginTop: 10 * f, paddingTop: 10 * f, display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
          <span>TOTAL</span>
          <span style={{ color: showWrong ? "#c4262c" : "#2a2a2a" }}>{gbp(total)}</span>
        </div>
        <div style={{ textAlign: "center", marginTop: 10 * f, color: "#777" }}>PAID ✓</div>
      </div>
    </div>
  );
};

const Price: React.FC = () => {
  const frame = useCurrentFrame();
  const gas = useCue("gas", 10);
  const imagine = useCue("imagine", gas + 40);
  const price = useCue("price", imagine + 15);
  const pipe = interpolate(frame, [gas - 6, gas + 8, imagine - 4, imagine + 6], [0, 1, 1, 0], clamp);
  const more = [price + 26, price + 34, price + 42];
  const lost = frame >= more[2] + 14 ? 4 : frame >= more[1] + 14 ? 3 : frame >= more[0] + 14 ? 2 : frame >= price + 14 ? 1 : 0;
  return (
    <>
      <Title text={frame < imagine ? "A silent bug is a gas leak" : "Now imagine…"} sub={frame < imagine ? "nothing alarms, the damage grows" : "the same bug, on the price"} />
      <div style={{ position: "absolute", left: 80, top: 520, opacity: pipe }}>
        <Pipe leaking={pipe} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 38, color: MUTED, marginTop: 20 }}>errors 0 · alerts 0 · crashes 0</div>
      </div>
      <Receipt at={imagine} x={80} y={420} wrong={false} />
      <div style={{ position: "absolute", left: 80, top: 760, fontFamily: MONO, fontWeight: 800, fontSize: 28, color: MUTED, opacity: frame >= imagine ? 1 : 0 }}>written</div>
      <Receipt at={price - 6} x={560} y={420} wrong />
      <div style={{ position: "absolute", left: 560, top: 760, fontFamily: MONO, fontWeight: 800, fontSize: 28, color: RED, opacity: frame >= price ? 1 : 0 }}>read with the wrong schema</div>
      <Sfx name="type" at={price - 6} volume={0.3} />
      {more.map((at, i) => (
        <Receipt key={i} at={at} x={560 + i * 40} y={820 + i * 30} wrong small />
      ))}
      <Pop at={price + 14} sfx="buzz" style={{ left: 80, top: 860 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 38, color: RED, lineHeight: "56px" }}>
          −{gbp(LOSS)}
          <br />
          per order
        </div>
      </Pop>
      <Pop at={price + 30} style={{ left: 80, top: 1010 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 34, color: LIGHT }}>
          {lost} orders: <span style={{ color: RED }}>−{gbp(LOSS * lost)}</span>
        </div>
      </Pop>
      <Stamp at={price + 20} label="SILENT" color={RED} solid style={{ left: 80, top: 1100 }} />
    </>
  );
};

// ---------- 7. The verdict: pick the rules by who reads the data ----------

const VERDICT: { reader: string; note: string; format: string; rule: string; cues: [string, string, string] }[] = [
  { reader: "public API", note: "other people's code", format: "JSON", rule: "written contract", cues: ["api", "json", "contract"] },
  { reader: "your own services", note: "you deploy both sides", format: "Protobuf", rule: "reserved + buf breaking", cues: ["own", "proto", "slot"] },
  { reader: "Kafka · data lake", note: "data outlives the code", format: "Avro", rule: "schema registry", cues: ["kafka", "avro", "registry"] },
];

const VerdictRow: React.FC<{ y: number; row: (typeof VERDICT)[number]; at: [number, number, number] }> = ({ y, row, at }) => (
  <div style={{ position: "absolute", left: 80, top: y, width: 920 }}>
    <Pop at={at[0]} style={{ position: "relative" }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: FG }}>{row.reader}</div>
      <div style={{ fontFamily: MONO, fontSize: 26, color: MUTED }}>{row.note}</div>
    </Pop>
    <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 10 }}>
      <Pop at={at[1]} sfx="slap" style={{ position: "relative" }}>
        <div style={{ width: 300, padding: "10px 0", textAlign: "center", borderRadius: 14, border: `4px solid ${GREEN}`, background: GREEN_BG, fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>{row.format}</div>
      </Pop>
      <Pop at={at[2]} style={{ position: "relative" }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 32, color: LIGHT }}>+ {row.rule}</div>
      </Pop>
    </div>
  </div>
);

const Verdict: React.FC = () => {
  const reads = useCue("reads", 20);
  const at = VERDICT.map((r, i) => r.cues.map((c, k) => useCue(c, reads + 20 + i * 60 + k * 15)) as [number, number, number]);
  return (
    <>
      <Title text="Who reads your data?" sub="pick the format and its rule by reader" />
      {VERDICT.map((row, i) => (
        <VerdictRow key={row.format} y={410 + i * 230} row={row} at={at[i]} />
      ))}
    </>
  );
};

// ---------- 8. The principle ----------

const Final: React.FC = () => {
  const frame = useCurrentFrame();
  const who = useCue("who", 15);
  const lives = useCue("lives", who + 30);
  const a = useSpring(who);
  const b = useSpring(lives);
  const sand = interpolate(frame, [lives, lives + 60], [0, 1], clamp);
  return (
    <>
      <div style={{ position: "absolute", left: 80, top: 330, width: 430, height: 560, borderRadius: 20, border: `5px solid ${FG}`, opacity: a, transform: `scale(${0.9 + 0.1 * a})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
        <svg width={200} height={200} viewBox="0 0 200 200">
          <circle cx={70} cy={70} r={30} fill="none" stroke={FG} strokeWidth={10} />
          <path d="M20 170 C20 120 120 120 120 170" fill="none" stroke={FG} strokeWidth={10} />
          <circle cx={140} cy={80} r={24} fill="none" stroke={LIGHT} strokeWidth={8} />
          <path d="M100 170 C100 130 180 130 180 170" fill="none" stroke={LIGHT} strokeWidth={8} />
        </svg>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 50, color: FG, textAlign: "center", lineHeight: 1.1 }}>who reads it</div>
      </div>
      <div style={{ position: "absolute", left: 570, top: 330, width: 430, height: 560, borderRadius: 20, border: `5px solid ${FG}`, opacity: b, transform: `scale(${0.9 + 0.1 * b})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30 }}>
        <svg width={200} height={200} viewBox="0 0 200 200">
          <path d="M50 20 H150 M50 180 H150 M60 20 C60 80 140 120 140 180 M140 20 C140 80 60 120 60 180" fill="none" stroke={FG} strokeWidth={10} strokeLinecap="round" />
          <path d={`M${100 - 30 * (1 - sand)} ${60 + 30 * sand} L${100 + 30 * (1 - sand)} ${60 + 30 * sand} L100 95 Z`} fill="#f2c94c" />
          <path d={`M${100 - 34 * sand} 172 L${100 + 34 * sand} 172 L100 ${172 - 40 * sand} Z`} fill="#f2c94c" />
        </svg>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 50, color: FG, textAlign: "center", lineHeight: 1.1 }}>how long it lives</div>
      </div>
      <Pop at={lives + 14} sfx="whoosh" style={{ left: 0, right: 0, top: 960, textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "14px 34px", border: `4px solid ${FG}`, borderRadius: 40, fontFamily: SANS, fontWeight: 800, fontSize: 40, color: FG }}>full test · archemist.dev</div>
      </Pop>
    </>
  );
};

export const SCENES2 = { story: Story, alarm: Alarm, change: Change, grid: Grid, production: ProductionScene, price: Price, verdict: Verdict, final: Final };
