import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Mark, Pop, Stamp, Title, useDraw, useSpring } from "../../components/parts";
import { ProductionFace } from "../../components/Production";
import { NEVER, Sfx, useCue } from "../../components/Shell";
import { BG, FG, GRAY, GREEN, GREEN_BG, GRID, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data.json";

// Every number is from 01-payload-encoding/README.md (AWS t3.micro, 2026-10-12, typical 3-item order).
// data.json comes from video_data.py: the real JSON bytes with field names marked, and the real Protobuf bytes.

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

// ---------- 1. The JSON itself, field names lighting up ----------

const LINES = data.json_pretty.split("\n").map((line) => {
  const m = line.match(/^(\s*)("[^"]+": )(.*)$/);
  return m ? { indent: m[1], key: m[2], rest: m[3] } : { indent: "", key: "", rest: line };
});
const NAME_BYTES = [...data.json_names].filter((c) => c === "1").length; // 461
const KEY_LINES = LINES.map((l, i) => (l.key ? i : -1)).filter((i) => i >= 0);

const Json: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const half = useCue("half", 30);
  const LH = 38;
  const scroll = interpolate(frame, [0, durationInFrames], [0, LINES.length * LH - 900]);
  // Keys light up in reading order, ahead of the scroll, all of them by the end of the scene.
  const lit = interpolate(frame, [4, durationInFrames - 8], [0, KEY_LINES.length], clamp);
  const share = (Math.min(lit, KEY_LINES.length) / KEY_LINES.length) * (NAME_BYTES / data.json.length) * 100;
  return (
    <>
      <div style={{ position: "absolute", left: 60, top: 230, width: 960, height: 1060, overflow: "hidden", borderRadius: 18, background: "#202328", border: `3px solid ${GRID}` }}>
        <div style={{ position: "absolute", left: 36, top: 30 - scroll, fontFamily: MONO, fontSize: 30, lineHeight: `${LH}px`, whiteSpace: "pre", color: LIGHT }}>
          {LINES.map((l, i) => {
            const k = KEY_LINES.indexOf(i);
            const on = k >= 0 && k < lit;
            return (
              <div key={i}>
                {l.indent}
                {l.key ? (
                  <span style={{ color: on ? FG : LIGHT, background: on ? "rgba(229,72,77,.55)" : "transparent", borderRadius: 4 }}>{l.key}</span>
                ) : null}
                <span style={{ color: MUTED }}>{l.rest}</span>
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${BG}00 75%, #202328)` }} />
      </div>
      <Pop at={half} sfx="reveal" style={{ right: 90, top: 260 }}>
        <div style={{ padding: "18px 28px", background: BG, border: `5px solid ${RED}`, borderRadius: 16, textAlign: "right" }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 96, color: RED, lineHeight: 1 }}>{Math.round(share)}%</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: FG, marginTop: 8 }}>field names</div>
        </div>
      </Pop>
    </>
  );
};

// ---------- 2. The order: what the 1,076 bytes carry ----------

const ORDER = JSON.parse(data.json) as {
  order_id: number;
  total: number;
  address: { street: string; postcode: string; house: string; city: string };
  items: { name: string; qty: number; unit_price: number; modifiers: string[] }[];
  status_history: { status: string }[];
};
const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`;

const Order: React.FC = () => {
  const items = useCue("items");
  const addr = useCue("addr", items + 20);
  const status = useCue("status", addr + 20);
  const total = useSpring(items + 30);
  return (
    <>
      <Title text={`Order #${ORDER.order_id}`} sub="a typical order · 3 items" />
      {ORDER.items.map((it, i) => (
        <Pop key={i} at={items + i * 5} sfx={i === 0 ? "reveal" : undefined} style={{ left: 80, top: 450 + i * 120, width: 920 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: `3px solid ${GRID}`, paddingBottom: 14 }}>
            <div>
              <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: MUTED }}>{it.qty}× </span>
              <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 42, color: FG }}>{it.name}</span>
              <div style={{ fontFamily: MONO, fontSize: 26, color: MUTED, marginTop: 4 }}>{it.modifiers.join(" · ")}</div>
            </div>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: FG }}>{gbp(it.qty * it.unit_price)}</div>
          </div>
        </Pop>
      ))}
      <div style={{ position: "absolute", left: 80, top: 815, width: 920, display: "flex", justifyContent: "space-between", opacity: total }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: MUTED }}>total</div>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 48, color: FG }}>{gbp(ORDER.total)}</div>
      </div>
      <Pop at={addr} sfx="reveal" style={{ left: 80, top: 900 }}>
        <div style={{ fontFamily: MONO, fontSize: 32, color: LIGHT }}>
          {ORDER.address.house}
          <br />
          {ORDER.address.street} · {ORDER.address.postcode} · {ORDER.address.city}
        </div>
      </Pop>
      <StatusLine at={status} />
    </>
  );
};

const StatusLine: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const steps = ORDER.status_history.map((s) => s.status);
  const x = (i: number) => 120 + i * 168;
  return (
    <>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={x(0)} y1={1105} x2={x(0) + (x(5) - x(0)) * useDraw(at, 24)} y2={1105} stroke={GRAY} strokeWidth={6} />
        {steps.map((s, i) => {
          const on = frame >= at + i * 4;
          const last = i === steps.length - 1;
          return <circle key={s} cx={x(i)} cy={1105} r={on ? 20 : 0} fill={last ? GREEN : FG} />;
        })}
      </svg>
      {steps.map((s, i) => (
        <Pop key={s} at={at + i * 4} style={{ left: x(i) - 80, top: 1140, width: 160, textAlign: "center" }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 21, color: i === steps.length - 1 ? GREEN : LIGHT }}>{s}</div>
        </Pop>
      ))}
      <Sfx name="reveal" at={at + 20} volume={0.3} />
    </>
  );
};

// ---------- 3. Every byte: 1,076 cells, names in red, then the Protobuf bytes ----------

const COLS = 36;
const PITCH = 25;
const CELL = 21;
const GX = 90;
const GY = 480;
const NAMES = [...data.json_names].map((c) => c === "1");
const VALUE_INDEX: number[] = []; // position of each non-name byte among the non-name bytes
let v = 0;
for (const isName of NAMES) VALUE_INDEX.push(isName ? -1 : v++);
const PROTO = [...data.proto_kinds]; // t = tag, l = length, v = value
const HEX = data.proto_hex.match(/../g)!;
const SCHEMA: [string, number][] = [
  ["order_id", 1], ["order_uuid", 2], ["customer_id", 3], ["created_at", 4], ["status", 5], ["currency", 6],
  ["total", 7], ["notes", 8], ["address", 9], ["items", 10], ["status_history", 11],
];

const Bytes: React.FC = () => {
  const frame = useCurrentFrame();
  const bytes = useCue("bytes");
  const names = useCue("names", bytes + 30);
  const every = useCue("every", names + 30);
  const proto = useCue("proto", every + 60);
  const b470 = useCue("b470", proto + 70);
  // EN shows the schema card on "know", before Protobuf; UZ and RU on "schema", after it. It stays until the next step.
  const schema = Math.min(useCue("know", NEVER), useCue("schema", NEVER));
  const schemaOut = schema < proto ? proto : b470;
  const card = schemaOut - schema >= 20;
  const values = Math.max(useCue("values", proto + 40), card ? schemaOut + 6 : 0);
  const reflow = interpolate(frame, [proto + 10, proto + 34], [0, 1], clamp);
  // While the schema card is up, the grid shrinks to the left half.
  const shrink = card ? interpolate(frame, [schema, schema + 12, schemaOut, schemaOut + 12], [1, 0.6, 0.6, 1], clamp) : 1;
  const ghostsOut = Math.min(schema, proto);
  const ghosts = interpolate(frame, [every, every + 10, ghostsOut, ghostsOut + 8], [0, 1, 1, 0], clamp);
  const count = frame < proto ? interpolate(frame, [bytes, bytes + 22], [0, 1076], clamp) : interpolate(frame, [proto + 10, proto + 34], [1076, 470], clamp);
  const pos = (i: number) => [GX + (i % COLS) * PITCH * shrink, GY + Math.floor(i / COLS) * PITCH * shrink];
  const size = CELL * shrink;
  const cells: React.ReactNode[] = [];
  NAMES.forEach((isName, i) => {
    const shown = frame >= bytes + (i / 1076) * 22;
    if (!shown) return;
    let [x, y] = pos(i);
    let fill = isName && frame >= names + (i / 1076) * 14 ? RED : LIGHT;
    let opacity = 1;
    if (frame >= proto) {
      if (isName) {
        // Names fall out of the message.
        const drop = interpolate(frame, [proto + (i % 7), proto + 14 + (i % 7)], [0, 1], clamp);
        y += 260 * drop * drop;
        opacity = 1 - drop;
      } else {
        // The rest slides into the 470 Protobuf positions; bytes past 470 (quotes, braces, commas) fade.
        const j = VALUE_INDEX[i];
        const [tx, ty] = pos(Math.min(j, 469));
        x += (tx - x) * reflow;
        y += (ty - y) * reflow;
        if (j >= 470) opacity = 1 - reflow;
        else if (reflow >= 1) fill = PROTO[j] === "v" ? LIGHT : PROTO[j] === "t" ? GREEN : MUTED;
      }
    }
    if (opacity > 0.01) cells.push(<rect key={i} x={x} y={y} width={size} height={size} rx={3} fill={fill} opacity={opacity} />);
  });
  const rows = (n: number) => Math.ceil(n / COLS) * PITCH;
  return (
    <>
      <Title text={frame < proto ? "JSON, byte by byte" : "Protobuf, byte by byte"} />
      <div style={{ position: "absolute", left: 90, top: 370, display: "flex", gap: 48, alignItems: "baseline" }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 60, color: FG }}>
          {fmt(count)} <span style={{ fontSize: 30, color: MUTED }}>bytes</span>
        </div>
        {frame >= names && frame < proto + 10 ? (
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 60, color: RED }}>
            {fmt(interpolate(frame, [names, names + 14], [0, 461], clamp))} <span style={{ fontSize: 30 }}>names</span>
          </div>
        ) : null}
        {reflow >= 1 ? (
          <Pop at={proto + 34} style={{ position: "relative" }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: GREEN }}>53 tags</div>
          </Pop>
        ) : null}
      </div>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {[2, 1].map((g) => (
          <rect key={g} x={GX + g * 22} y={GY + g * 22} width={COLS * PITCH} height={rows(1076)} rx={10} fill="none" stroke={RED} strokeWidth={3} opacity={ghosts * (0.6 - g * 0.2)} />
        ))}
        {cells}
      </svg>
      <Pop at={every} style={{ left: 300, top: 800, opacity: ghosts }}>
        <div style={{ padding: "16px 28px", background: BG, border: `4px solid ${RED}`, borderRadius: 14, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: RED }}>× every message</div>
      </Pop>
      {card ? <SchemaCard at={schema} out={schemaOut} /> : null}
      <Sfx name="whoosh" at={proto} volume={0.4} />
      <Pop at={values} style={{ left: 90, top: GY + rows(470) + 20 }}>
        <Hex />
      </Pop>
      <SizeBars at={b470} top={GY + rows(470) + 170} />
    </>
  );
};

const SchemaCard: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const frame = useCurrentFrame();
  const p = useSpring(at);
  const gone = interpolate(frame, [out, out + 8], [1, 0], clamp);
  if (frame < at || gone <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 660, top: GY - 10, width: 340, opacity: p * gone, transform: `translateX(${(1 - p) * 80}px)` }}>
      <Sfx name="reveal" at={at} volume={0.35} />
      <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 30, color: GREEN, marginBottom: 14 }}>schema</div>
      <div style={{ border: `4px solid ${GREEN}`, borderRadius: 14, padding: "18px 22px", background: GREEN_BG }}>
        {SCHEMA.map(([name, n], i) => (
          <div key={name} style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 26, lineHeight: "38px", color: FG, opacity: frame >= at + i * 2 ? 1 : 0 }}>
            <span>{name}</span>
            <span style={{ color: GREEN, fontWeight: 800 }}>{n}</span>
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: -570, top: 560, width: 910, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {["sender", "receiver"].map((who, i) => (
          <div key={who} style={{ order: i * 2, width: 280, padding: "18px 0", border: `4px solid ${FG}`, borderRadius: 14, textAlign: "center", background: BG }}>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: FG }}>{who}</div>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, color: GREEN, marginTop: 4 }}>has schema</div>
          </div>
        ))}
        <div style={{ order: 1, display: "flex", gap: 8 }}>
          {Array.from({ length: 7 }, (_, k) => (
            <div key={k} style={{ width: 22, height: 22, borderRadius: 4, background: LIGHT, opacity: ((frame - at) / 4 + k) % 7 < 4 ? 1 : 0.25 }} />
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", left: -570, top: 720, width: 910, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 30, color: LIGHT }}>values only</div>
    </div>
  );
};

// The first bytes of the real message: tags in green, lengths gray, values light.
const Hex: React.FC = () => (
  <div style={{ fontFamily: MONO, fontSize: 31, lineHeight: "44px", fontWeight: 700 }}>
    {[0, 1, 2].map((row) => (
      <div key={row}>
        {HEX.slice(row * 16, row * 16 + 16).map((h, k) => {
          const kind = PROTO[row * 16 + k];
          return (
            <span key={k} style={{ color: kind === "t" ? GREEN : kind === "l" ? MUTED : LIGHT, marginRight: 13 }}>
              {h}
            </span>
          );
        })}
      </div>
    ))}
  </div>
);

const SIZES: [string, number, string][] = [
  ["JSON", 1076, GRAY],
  ["JSON + gzip", 516, GRAY],
  ["Protobuf", 470, GREEN],
  ["Avro", 417, LIGHT],
];

const SizeBars: React.FC<{ at: number; top: number }> = ({ at, top }) => (
  <>
    {SIZES.map(([label, n, color], i) => (
      <SizeRow key={label} at={at + i * 4} y={top + i * 68} label={label} n={n} color={color} />
    ))}
    <Sfx name="reveal" at={at} volume={0.35} />
  </>
);

const SizeRow: React.FC<{ at: number; y: number; label: string; n: number; color: string }> = ({ at, y, label, n, color }) => {
  const p = useSpring(at, 120);
  return (
    <div style={{ position: "absolute", left: 90, top: y, display: "flex", alignItems: "center", opacity: Math.min(1, p * 2) }}>
      <div style={{ width: 290, fontFamily: SANS, fontWeight: 700, fontSize: 38, color: FG }}>{label}</div>
      <div style={{ width: (n / 1076) * 520 * p, height: 46, background: color, borderRadius: 10 }} />
      <div style={{ marginLeft: 20, fontFamily: MONO, fontWeight: 800, fontSize: 40, color: FG }}>{fmt(n * Math.min(1, p))}</div>
    </div>
  );
};

// ---------- 4. Speed: µs per order, with the catch ----------

const SpeedRow: React.FC<{ at: number; y: number; label: string; us: number; color: string; extra?: { at: number; us: number } }> = ({ at, y, label, us, color, extra }) => {
  const p = useSpring(at, 110);
  const e = useSpring(extra?.at ?? NEVER, 110);
  const scale = 780 / 15;
  return (
    <div style={{ position: "absolute", left: 80, top: y, opacity: Math.min(1, p * 2) }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: LIGHT }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
        <div style={{ width: us * scale * p, height: 64, background: color, borderRadius: extra ? "12px 0 0 12px" : 12 }} />
        {extra ? <div style={{ width: extra.us * scale * e, height: 64, background: RED, borderRadius: "0 12px 12px 0" }} /> : null}
        <div style={{ marginLeft: 22, fontFamily: MONO, fontWeight: 800, fontSize: 46, color: FG }}>{(us * Math.min(1, p) + (extra ? extra.us * Math.min(1, e) : 0)).toFixed(1)}</div>
      </div>
    </div>
  );
};

const Speed: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  const fast = useCue("fast", 10);
  const catchAt = Math.max(fast + 26, durationInFrames - 30);
  return (
    <>
      <Title text="Encode, decode" sub="µs per order · t3.micro · Python" />
      <div style={{ position: "absolute", left: 80, top: 440, fontFamily: MONO, fontWeight: 800, fontSize: 34, color: MUTED }}>encode</div>
      <SpeedRow at={0} y={500} label="JSON" us={12.7} color={GRAY} />
      <SpeedRow at={fast} y={640} label="Protobuf" us={0.9} color={GREEN} extra={{ at: catchAt, us: 13.1 }} />
      <Stamp at={fast + 6} label="14x faster" color={GREEN} style={{ left: 640, top: 620 }} />
      <Pop at={catchAt} sfx="buzz" style={{ left: 80, top: 790 }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, color: RED }}>+ 13.1 build from a dict</div>
      </Pop>
      <div style={{ position: "absolute", left: 80, top: 890, fontFamily: MONO, fontWeight: 800, fontSize: 34, color: MUTED }}>decode</div>
      <SpeedRow at={8} y={950} label="JSON" us={12.2} color={GRAY} />
      <SpeedRow at={fast + 10} y={1090} label="Protobuf" us={1.4} color={GREEN} />
      <Pop at={fast + 16} style={{ left: 700, top: 1080 }}>
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 40, color: GREEN }}>9x faster</div>
      </Pop>
    </>
  );
};

// ---------- 5. Cost: 606 bytes saved, priced at cross-AZ rates ----------

const Packets: React.FC<{ rps: number }> = ({ rps }) => {
  const frame = useCurrentFrame();
  const fast = interpolate(frame, [rps, rps + 20], [1, 4], clamp);
  const n = frame >= rps ? 14 : 5;
  return (
    <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: n }, (_, i) => {
        const t = ((frame * 0.012 * fast + i / n) % 1 + 1) % 1;
        return <rect key={i} x={330 + t * 400} y={545 + (i % 3) * 30} width={28} height={18} rx={4} fill={LIGHT} opacity={0.4 + 0.6 * Math.sin(t * Math.PI)} />;
      })}
    </svg>
  );
};

const Line: React.FC<{ at: number; y: number; left: string; right?: string; big?: boolean; color?: string }> = ({ at, y, left, right, big, color = FG }) => (
  <Pop at={at} sfx="reveal" style={{ left: 80, top: y, width: 920 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: big ? 92 : 46, color }}>{left}</span>
      {right ? <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: MUTED }}>{right}</span> : null}
    </div>
  </Pop>
);

const Cost: React.FC = () => {
  const frame = useCurrentFrame();
  const count = useCue("count", 20);
  const rps = useCue("rps", count + 25);
  const usd = useCue("usd", rps + 40);
  const dollars = interpolate(frame, [usd, usd + 24], [0, 377], clamp);
  return (
    <>
      <Title text="Let's count" sub="every call crosses an AZ · $0.01/GB each side" />
      <div style={{ position: "absolute", left: 80, top: 470, width: 400, height: 220, border: `4px dashed ${GRAY}`, borderRadius: 16 }} />
      <div style={{ position: "absolute", left: 600, top: 470, width: 400, height: 220, border: `4px dashed ${GRAY}`, borderRadius: 16 }} />
      <div style={{ position: "absolute", left: 104, top: 486, fontFamily: MONO, fontSize: 28, color: MUTED }}>AZ a</div>
      <div style={{ position: "absolute", left: 624, top: 486, fontFamily: MONO, fontSize: 28, color: MUTED }}>AZ b</div>
      {[120, 760].map((x, i) => (
        <div key={x} style={{ position: "absolute", left: x, top: 560, width: 200, height: 90, border: `4px solid ${FG}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 700, fontSize: 34, color: FG }}>
          service {i ? "B" : "A"}
        </div>
      ))}
      <Packets rps={rps} />
      <Line at={count} y={760} left="1,076 − 470 = 606 B" right="saved / call" />
      <Line at={rps} y={860} left="× 1,000 RPS" right="52 GB / day" />
      <Line at={rps + 18} y={960} left="× $0.02 / GB" right="cross-AZ" />
      {frame >= usd ? (
        <div style={{ position: "absolute", left: 80, top: 1080 }}>
          <Sfx name="stamp" at={usd} volume={0.5} />
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 110, color: FG }}>${fmt(dollars)}</span>
          <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, color: MUTED }}> / year</span>
        </div>
      ) : null}
    </>
  );
};

// ---------- 6. Production, deadpan ----------

const Production: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const keep = useCue("keep", 10);
  const night = useCue("night", keep + 40);
  const strike = useDraw(keep + 8, 8);
  const away = interpolate(frame, [night - 8, night + 4], [0, 1], clamp);
  const pulse = frame >= night ? ((frame - night) % 24) / 24 : 0;
  return (
    <>
      <Pop at={0} style={{ left: 330, top: 300 }}>
        <ProductionFace />
      </Pop>
      <div style={{ position: "absolute", left: 0, right: 0, top: 800, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 40, color: LIGHT }}>PRODUCTION</div>
      <Pop at={keep} style={{ left: 110, top: 960 }}>
        <div style={{ position: "relative", transform: `translateX(${-400 * away * away}px) rotate(${-20 * away}deg)`, opacity: 1 - away }}>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 90, color: MUTED }}>$377</span>
          <div style={{ position: "absolute", left: -10, top: 52, height: 10, width: 260 * strike, background: RED, borderRadius: 5 }} />
        </div>
      </Pop>
      <Pop at={night} sfx="buzz" style={{ left: 560, top: 950 }}>
        <div style={{ position: "relative", padding: "10px 30px", border: `5px solid ${RED}`, borderRadius: 18 }}>
          <div style={{ position: "absolute", inset: -10 - pulse * 40, border: `4px solid ${RED}`, borderRadius: 24 + pulse * 30, opacity: 1 - pulse }} />
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 90, color: RED }}>03:00</span>
        </div>
      </Pop>
      <Sfx name="cricket" at={durationInFrames - 24} volume={0.5} />
    </>
  );
};

// ---------- 7. The take: new vs existing ----------

const Node: React.FC<{ at: number; x: number; y: number; w: number; label: string; sub?: string; color?: string; fill?: string }> = ({ at, x, y, w, label, sub, color = FG, fill }) => (
  <Pop at={at} sfx="reveal" style={{ left: x, top: y, width: w }}>
    <div style={{ border: `4px solid ${color}`, background: fill ?? BG, borderRadius: 16, padding: "22px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color }}>{label}</div>
      {sub ? <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 28, color: MUTED, marginTop: 6 }}>{sub}</div> : null}
    </div>
  </Pop>
);

const Edge: React.FC<{ at: number; d: string; label?: string; lx?: number; ly?: number; dashed?: boolean; color?: string }> = ({ at, d, label, lx = 0, ly = 0, dashed, color = GRAY }) => {
  const p = useDraw(at, 10);
  return (
    <>
      <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={5} strokeDasharray={dashed ? undefined : 1} strokeDashoffset={dashed ? undefined : 1 - p} opacity={dashed ? p * 0.7 : 1} style={dashed ? { strokeDasharray: "0.03 0.025" } : undefined} />
      {label ? (
        <text x={lx} y={ly} fontFamily={MONO} fontWeight={800} fontSize={32} fill={color} opacity={p}>
          {label}
        </text>
      ) : null}
    </>
  );
};

const Take: React.FC = () => {
  const neu = useCue("new", 10);
  const day1 = useCue("day1", neu + 20);
  const old = useCue("old", day1 + 20);
  const bottleneck = useCue("bottleneck", old + 20);
  const rush = useCue("rush", bottleneck + 20);
  return (
    <>
      <Title text="My take" sub="Protobuf: when?" />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <Edge at={neu - 4} d="M480,555 L290,680" label="new" lx={290} ly={610} color={GREEN} />
        <Edge at={old - 4} d="M600,555 L790,680" label="existing" lx={700} ly={610} color={LIGHT} />
        <Edge at={rush - 4} d="M790,830 L790,960" label="no" lx={810} ly={910} color={LIGHT} />
        <Edge at={bottleneck + 12} d="M640,770 L500,770" label="yes" lx={520} ly={750} color={GREEN} dashed />
      </svg>
      <Node at={0} x={340} y={430} w={400} label="your service" />
      <Node at={day1} x={80} y={680} w={420} label="Protobuf" sub="from day one" color={GREEN} fill={GREEN_BG} />
      <Node at={old} x={580} y={680} w={420} label="bottleneck?" color={LIGHT} />
      <Node at={rush} x={580} y={960} w={420} label="don't rush" sub="climb the levels ↓" color={LIGHT} />
    </>
  );
};

// ---------- 8. The levels, cheapest first ----------

const LEVELS: { label: string; n: number; at: "start" | "trim" | "compact" | "gzip" | "last"; tag?: string }[] = [
  { label: "untrimmed JSON", n: 2672, at: "start" },
  { label: "trim unused fields", n: 1076, at: "trim", tag: "−60%" },
  { label: "+ compact", n: 989, at: "compact", tag: "−63%" },
  { label: "+ gzip", n: 510, at: "gzip", tag: "−81%" },
  { label: "Protobuf", n: 470, at: "last", tag: "−82% · migration" },
];

const Levels: React.FC = () => {
  const trim = useCue("trim", 15);
  const sixty = useCue("sixty", trim + 30);
  const gzip = useCue("gzip", sixty + 30);
  const last = useCue("last", gzip + 20);
  const at = { start: 0, trim, compact: Math.min(trim + 24, gzip - 6), gzip, last };
  return (
    <>
      <Title text="Climb the levels" sub="typical order · bytes · vs untrimmed" />
      {LEVELS.map((l, i) => (
        <LevelRow key={l.label} at={at[l.at]} tagAt={l.at === "trim" ? sixty : at[l.at] + 8} y={450 + i * 160} label={l.label} n={l.n} tag={l.tag} migration={l.at === "last"} />
      ))}
    </>
  );
};

const LevelRow: React.FC<{ at: number; tagAt: number; y: number; label: string; n: number; tag?: string; migration?: boolean }> = ({ at, tagAt, y, label, n, tag, migration }) => {
  const p = useSpring(at, 110);
  const w = (n / 2672) * 700 * p;
  return (
    <div style={{ position: "absolute", left: 80, top: y, opacity: Math.min(1, p * 2) }}>
      <Sfx name="slap" at={at} volume={0.4} />
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: FG }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
        <div style={{ width: w, height: 66, borderRadius: 12, background: migration ? "transparent" : n === 2672 ? GRAY : LIGHT, border: migration ? `4px dashed ${MUTED}` : "none", boxSizing: "border-box" }} />
        <div style={{ marginLeft: 20, fontFamily: MONO, fontWeight: 800, fontSize: 46, color: FG }}>{fmt(n * Math.min(1, p))}</div>
        {tag ? (
          <Pop at={tagAt} style={{ position: "relative", marginLeft: 24 }}>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 36, color: migration ? MUTED : GREEN }}>{tag}</div>
          </Pop>
        ) : null}
      </div>
    </div>
  );
};

// ---------- 9. Teaser: the silent bug ----------

const Teaser: React.FC = () => {
  const frame = useCurrentFrame();
  const never = useCue("never", 10);
  const next = useCue("next", never + 40);
  const flow = useDraw(never, 14);
  const g = frame >= never + 16 && frame % 9 < 3 ? (frame % 2 ? 6 : -6) : 0;
  return (
    <>
      <Title text="Schema change" sub="Avro · v1 data · reader guesses v2" />
      <Pop at={0} style={{ left: 80, top: 450 }}>
        <div style={{ width: 360, padding: "22px 0", border: `4px solid ${LIGHT}`, borderRadius: 16, textAlign: "center" }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>writer v1</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, color: LIGHT, marginTop: 8 }}>notes</div>
        </div>
      </Pop>
      <Pop at={4} style={{ left: 640, top: 450 }}>
        <div style={{ width: 360, padding: "22px 0", border: `4px solid ${LIGHT}`, borderRadius: 16, textAlign: "center" }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>reader v2</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 32, color: LIGHT, marginTop: 8 }}>tip</div>
        </div>
      </Pop>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <rect key={i} x={460 + i * 26} y={530} width={20} height={20} rx={3} fill={LIGHT} opacity={flow > i / 6 ? 1 : 0} />
        ))}
      </svg>
      <Pop at={never + 14} sfx="reveal" style={{ left: 80, top: 720 }}>
        <div style={{ position: "relative", fontFamily: MONO, fontWeight: 800, fontSize: 150, color: FG, whiteSpace: "nowrap" }}>
          <span style={{ position: "absolute", left: g, color: RED, opacity: g ? 0.8 : 0 }}>tip = 46</span>
          <span style={{ position: "relative" }}>tip = 46</span>
        </div>
      </Pop>
      <Pop at={never + 24} style={{ left: 80, top: 920 }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 36, color: MUTED }}>no error · no log</div>
      </Pop>
      <Stamp at={never + 34} label="SILENT" color={RED} solid style={{ left: 640, top: 920 }} />
      <Pop at={next} sfx="whoosh" style={{ left: 80, top: 1080 }}>
        <div style={{ padding: "14px 30px", border: `4px solid ${FG}`, borderRadius: 40, fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>next video →</div>
      </Pop>
    </>
  );
};

export const SCENES = { json: Json, order: Order, bytes: Bytes, speed: Speed, cost: Cost, production: Production, take: Take, levels: Levels, teaser: Teaser };
