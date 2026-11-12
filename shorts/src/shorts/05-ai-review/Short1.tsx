// Week 5 Short "One deleted comment": the promo bug (b03) and the AI reviewer, with the rule written in money.py and
// without it. Every number and quote comes from data.json (05-ai-review README, prs.py, rules.py, the grade files and
// the review text). Labels only, no sentences; the real code, receipt, review comment and CI panel on screen.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Mark, Pop, Stamp, useSpring } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { FG, GOLD, GRAY, GREEN, GREEN_BG, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { Canvas, Rack } from "../03-uuid-keys/Short1";
import data from "./data.json";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (t: number) => 1 - (1 - t) ** 3;
const fade = (frame: number, at: number, len = 10) => interpolate(frame, [at, at + len], [0, 1], clamp);
const CARD = "#15171a";
const EDGE = "#3a3f47";
const RED_BG = "#3a2022";
const gbp = (p: number) => `£${(p / 100).toFixed(2)}`;

const Header: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => {
  const line = useSpring(4);
  return (
    <div style={{ position: "absolute", top: 200, left: 70, right: 70 }}>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 72, color: FG, lineHeight: 1.05 }}>{text}</div>
      <div style={{ marginTop: 18, width: 140 * line, height: 8, borderRadius: 4, background: GOLD }} />
      {sub ? <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 32, color: MUTED }}>{sub}</div> : null}
    </div>
  );
};

// A file card: name on top, code lines below. `strike` 0 -> 1 crosses out and dims the lines in `hit`.
const CodeCard: React.FC<{ file: string; lines: string[]; hit?: number[]; strike?: number; lit?: number; litColor?: string; top: number; size?: number }> = ({
  file,
  lines,
  hit = [],
  strike = 0,
  lit = 0,
  litColor = GREEN,
  top,
  size = 34,
}) => (
  <div style={{ position: "absolute", left: 70, top, width: 940, borderRadius: 22, background: CARD, border: `3px solid ${EDGE}`, overflow: "hidden" }}>
    <div style={{ padding: "12px 28px", fontFamily: MONO, fontSize: 26, color: MUTED, borderBottom: `2px solid ${EDGE}` }}>{file}</div>
    <div style={{ padding: "16px 28px 20px", fontFamily: MONO, fontSize: size, lineHeight: 1.45 }}>
      {lines.map((l, i) => {
        const on = hit.includes(i);
        return (
          <div key={i} style={{ position: "relative", whiteSpace: "pre", color: on ? FG : LIGHT, opacity: on ? 1 - 0.6 * strike : 1 }}>
            {on ? <div style={{ position: "absolute", inset: "-2px -10px", borderRadius: 8, background: litColor, opacity: 0.18 * lit }} /> : null}
            <span style={{ position: "relative" }}>{l || " "}</span>
            {on ? <div style={{ position: "absolute", left: 0, top: "52%", height: 5, borderRadius: 3, background: RED, width: `${100 * strike}%` }} /> : null}
          </div>
        );
      })}
    </div>
  </div>
);

// ---- 1. Hook: one comment deleted; blocked 3 of 3, then missed 3 of 3 -------------------------------------------------

// Calm by design (week 4 lesson): one thing changes at a time, each result lands on its own spoken word.
const RunRow: React.FC<{ label: string; at: number; result: number; ok: boolean; top: number }> = ({ label, at, result, ok, top }) => {
  const frame = useCurrentFrame();
  const color = ok ? GREEN : RED;
  return (
    <div style={{ position: "absolute", left: 70, top, width: 860, opacity: fade(frame, at - 6) }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: FG }}>{label}</div>
      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 22 }}>
        {[0, 1, 2].map((i) => {
          const t = result + i * 9;
          return (
            <div key={i} style={{ width: 96, height: 96, borderRadius: 18, border: `4px solid ${frame >= t ? color : GRAY}`, background: frame >= t ? (ok ? GREEN_BG : RED) : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ opacity: fade(frame, t, 6) }}>
                <Mark ok={ok} color={ok ? GREEN : FG} size={56} />
              </div>
              <Sfx name="reveal" at={t} volume={0.25} />
            </div>
          );
        })}
        <div style={{ marginLeft: 18, fontFamily: MONO, fontWeight: 800, fontSize: 64, color, opacity: fade(frame, result + 18) }}>
          {ok ? "blocked" : "missed"} {ok ? data.written.caught : data.written.runs - data.unwritten.caught}/{data.written.runs}
        </div>
      </div>
    </div>
  );
};

const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const comment = useCue("comment", 30);
  const withC = useCue("with", 110);
  const without = useCue("without", 170);
  const missed = useCue("missed", 190);
  const strike = interpolate(frame, [comment, comment + 18], [0, 1], { ...clamp, easing: ease });
  return (
    <>
      <CodeCard
        file="orders/money.py"
        top={200}
        size={32}
        hit={[2, 3, 4]}
        lit={fade(frame, comment - 10, 8)}
        litColor={GOLD}
        strike={strike}
        lines={['"""Money is integer pence everywhere.', "", "Promo terms: a percentage promo applies", "to the item subtotal only, never to", 'delivery or surge fees."""']}
      />
      <Sfx name="type" at={comment} volume={0.3} />
      <RunRow label="Rule written" at={withC} result={withC + 12} ok top={660} />
      <RunRow label="Comment deleted" at={without} result={missed} ok={false} top={920} />
    </>
  );
};

// ---- 2. The order: 10% promo, also off delivery; terms say items only -------------------------------------------------

const Line: React.FC<{ name: string; value: string; color?: string; bold?: boolean }> = ({ name, value, color = FG, bold }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontFamily: bold ? SANS : SANS, fontWeight: bold ? 800 : 600, fontSize: 44, color, padding: "10px 0" }}>
    <span>{name}</span>
    <span style={{ fontFamily: MONO, fontWeight: 700 }}>{value}</span>
  </div>
);

const Order: React.FC = () => {
  const frame = useCurrentFrame();
  const promo = useCue("promo", 40);
  const delivery = useCue("delivery", 70);
  const terms = useCue("terms", 100);
  const bug = fade(frame, delivery - 4, 12);
  const ok = fade(frame, terms, 12);
  return (
    <>
      <Header text="The order" />
      <Pop at={2} style={{ left: 70, top: 390, width: 620 }}>
        <div style={{ padding: "22px 34px", borderRadius: 22, background: "#22262c", border: `3px solid ${EDGE}` }}>
          <Line name={data.item.name} value={gbp(data.item.pence)} />
          <Line name="Delivery" value={gbp(data.delivery_pence)} color={bug > 0.5 ? RED : FG} />
          <div style={{ height: 3, background: EDGE, margin: "10px 0" }} />
          <div style={{ opacity: fade(frame, promo - 4) }}>
            <Line name={`Promo ${data.percent}%`} value="TENOFF" color={GOLD} bold />
          </div>
        </div>
      </Pop>
      <Sfx name="reveal" at={promo} volume={0.3} />
      {/* bug bracket: the promo spans item and delivery */}
      <div style={{ position: "absolute", left: 712, top: 410, width: 40, height: 150, borderTop: `6px solid ${RED}`, borderRight: `6px solid ${RED}`, borderBottom: `6px solid ${RED}`, borderRadius: "0 12px 12px 0", opacity: bug }} />
      <div style={{ position: "absolute", left: 772, top: 440, width: 240, fontFamily: SANS, fontWeight: 800, fontSize: 38, color: RED, opacity: bug, lineHeight: 1.15 }}>
        PR: items + delivery
      </div>
      <Sfx name="buzz" at={delivery} volume={0.25} />
      {/* terms: items only */}
      <Pop at={terms} sfx="reveal" style={{ left: 70, top: 830, width: 860 }}>
        <div style={{ padding: "22px 30px", borderRadius: 22, border: `4px solid ${GREEN}`, background: GREEN_BG, opacity: ok }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: GREEN }}>Promo terms: items only</div>
          <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 32, color: LIGHT }}>never delivery or surge fees</div>
        </div>
      </Pop>
    </>
  );
};

// ---- 3. Production ----------------------------------------------------------------------------------------------------

const ProductionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, 60], [13, 12], clamp);
  return (
    <>
      <Canvas pos={[0.6, 2.4, z]} look={[0.85, 1.2, 0]}>
        <pointLight position={[0.5, 2.2, 4]} intensity={18} distance={12} color="#ffffff" />
        <group scale={interpolate(frame, [0, 8], [0.6, 1], { ...clamp, easing: ease })}>
          <Rack frame={frame} />
        </group>
      </Canvas>
      <div style={{ position: "absolute", left: 90, width: 460, top: 480, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 36, color: LIGHT }}>PRODUCTION</div>
      <Pop at={3} sfx="reveal" style={{ left: 560, top: 330 }}>
        <div style={{ position: "relative", width: 430, padding: "26px 30px", borderRadius: 26, background: "#262a30", border: `4px solid ${LIGHT}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 46, color: FG }}>Tests are green. I'm fine.</div>
          <div style={{ position: "absolute", left: -2, bottom: -40, width: 0, height: 0, borderTop: `40px solid ${LIGHT}`, borderRight: "40px solid transparent" }} />
        </div>
      </Pop>
    </>
  );
};

// ---- 4. The loss: 169p off instead of 119p, no error, "a business decision" -------------------------------------------

const Loss: React.FC = () => {
  const frame = useCurrentFrame();
  const lost = useCue("lost", 10);
  const error = useCue("error", 50);
  const quote = useCue("quote", 90);
  const p = interpolate(frame, [2, 26], [0, 1], { ...clamp, easing: ease });
  const max = data.off_bug;
  const bars = [
    { label: "Terms", value: data.off_right, color: GREEN },
    { label: "PR", value: data.off_bug, color: RED },
  ];
  return (
    <>
      <Header text="Discount per order" />
      {bars.map((b, i) => (
        <div key={b.label} style={{ position: "absolute", left: 70, top: 380 + i * 120, width: 940, display: "flex", alignItems: "center" }}>
          <div style={{ width: 150, fontFamily: SANS, fontWeight: 700, fontSize: 40, color: FG }}>{b.label}</div>
          <div style={{ width: 560 * (b.value / max) * p, height: 70, borderRadius: 10, background: b.color }} />
          <div style={{ marginLeft: 20, fontFamily: MONO, fontWeight: 800, fontSize: 52, color: b.color, opacity: p >= 1 ? 1 : 0 }}>{b.value}p</div>
        </div>
      ))}
      <Stamp at={lost} label={`−${data.off_bug - data.off_right}p every promo order`} color={RED} solid style={{ left: 70, top: 640 }} />
      <Pop at={error} sfx="reveal" style={{ left: 70, top: 790 }}>
        <div style={{ display: "flex", gap: 20, fontFamily: MONO, fontSize: 34, color: GREEN }}>
          <div style={{ padding: "10px 20px", borderRadius: 14, border: `3px solid ${GREEN}` }}>tests ✓</div>
          <div style={{ padding: "10px 20px", borderRadius: 14, border: `3px solid ${GREEN}` }}>200 OK</div>
          <div style={{ padding: "10px 20px", borderRadius: 14, border: `3px solid ${GRAY}`, color: LIGHT }}>0 errors</div>
        </div>
      </Pop>
      {/* the reviewer's own words, from the review text (rules not written) */}
      <Pop at={quote} sfx="stamp" style={{ left: 70, top: 920, width: 860 }}>
        <div style={{ padding: "20px 28px", borderRadius: 20, background: "#22262c", border: `3px solid ${EDGE}` }}>
          <div style={{ fontFamily: MONO, fontSize: 26, color: MUTED }}>AI reviewer · rule not written</div>
          <div style={{ marginTop: 8, fontFamily: SANS, fontWeight: 800, fontSize: 40, color: FG, lineHeight: 1.2 }}>“Business decision”</div>
          <div style={{ marginTop: 10, display: "flex", gap: 24, fontFamily: MONO, fontSize: 32 }}>
            <span style={{ color: LIGHT }}>{data.quote_verdict}</span>
            <span style={{ color: GREEN }}>✓ {data.quote_merge}</span>
          </div>
        </div>
      </Pop>
    </>
  );
};

// ---- 5. The human version: courier chains read from a lagging copy ----------------------------------------------------

// Lab bug 01 (the story): the order moved from courier_7 to courier_9; the copy still said courier_7.
const Store: React.FC<{ title: string; sub: string; value: string; color: string; left: number; dim?: number }> = ({ title, sub, value, color, left, dim = 1 }) => (
  <div style={{ position: "absolute", left, top: 400, width: 430, padding: "22px 26px", borderRadius: 22, background: CARD, border: `3px solid ${color}`, opacity: dim }}>
    <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 42, color: FG }}>{title}</div>
    <div style={{ fontFamily: MONO, fontSize: 28, color: MUTED }}>{sub}</div>
    <div style={{ marginTop: 16, fontFamily: MONO, fontWeight: 700, fontSize: 36, color }}>{value}</div>
  </div>
);

const Stale: React.FC = () => {
  const frame = useCurrentFrame();
  const copy = useCue("copy", 40);
  const behind = useCue("behind", 70);
  const wrong = useCue("wrong", 100);
  const rule = useCue("rule", 140);
  const nowhere = useCue("nowhere", 170);
  const read = fade(frame, copy, 12);
  return (
    <>
      <Header text="Human review, same miss" />
      <Store title="Store" sub="primary" value="→ courier_9" color={GREEN} left={70} />
      <Store title="Copy" sub="for screens" value="→ courier_7" color={frame >= behind ? RED : GRAY} left={580} />
      <div style={{ position: "absolute", left: 580, top: 620, fontFamily: MONO, fontWeight: 700, fontSize: 32, color: RED, opacity: fade(frame, behind) }}>seconds behind</div>
      {/* chaining reads the copy */}
      <div style={{ position: "absolute", left: 580, top: 700, width: 430, opacity: read }}>
        <div style={{ margin: "0 auto", width: 6, height: 70 * read, background: RED }} />
        <div style={{ padding: "18px 24px", borderRadius: 20, border: `3px solid ${frame >= wrong ? RED : GRAY}`, background: frame >= wrong ? RED_BG : "transparent", textAlign: "center" }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 38, color: FG }}>Chain new order</div>
          <div style={{ fontFamily: MONO, fontSize: 32, color: frame >= wrong ? RED : LIGHT }}>{frame >= wrong ? "courier_7 ✗" : "…"}</div>
        </div>
      </div>
      <Sfx name="buzz" at={wrong} volume={0.25} />
      {/* the rule that lived only in heads */}
      <Pop at={rule} style={{ left: 70, top: 700, width: 440 }}>
        <div style={{ padding: "20px 24px", borderRadius: 20, border: `4px dashed ${GRAY}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 36, color: FG }}>“Copy is for screens”</div>
          <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 32, color: RED, opacity: fade(frame, nowhere) }}>written: nowhere</div>
        </div>
      </Pop>
    </>
  );
};

// ---- 6. The fix: the rule next to the code, then a test CI runs ------------------------------------------------------

const Fix: React.FC = () => {
  const frame = useCurrentFrame();
  const code = useCue("code", 20);
  const test = useCue("test", 70);
  const ci = useCue("ci", 110);
  return (
    <>
      <Header text="Write it down" />
      <div style={{ opacity: fade(frame, code - 6, 8) }}>
        <Sfx name="type" at={code - 6} volume={0.35} />
        <CodeCard file="orders/money.py" top={380} size={30} hit={[0, 1]} lit={fade(frame, code)} lines={["# Promo: item subtotal only,", "# never delivery or surge fees."]} />
      </div>
      <div style={{ opacity: fade(frame, test - 6, 8) }}>
        <Sfx name="type" at={test - 6} volume={0.35} />
        <CodeCard
          file="tests/test_money.py"
          top={620}
          size={30}
          hit={[0]}
          lit={fade(frame, test)}
          lines={["def test_promo_skips_delivery():", `    order = place(${data.item.pence}, promo="TENOFF")`, `    assert order.discount_pence == ${data.off_right}`]}
        />
      </div>
      <Pop at={ci} sfx="stamp" style={{ left: 70, top: 960, width: 860 }}>
        <div style={{ padding: "20px 28px", borderRadius: 20, background: "#22262c", border: `3px solid ${GREEN}` }}>
          <div style={{ fontFamily: MONO, fontSize: 32, color: RED }}>✗ test_promo_skips_delivery</div>
          <div style={{ fontFamily: MONO, fontSize: 30, color: LIGHT }}>
            {data.off_bug} != {data.off_right}
          </div>
          <div style={{ marginTop: 8, fontFamily: SANS, fontWeight: 800, fontSize: 40, color: GREEN }}>Caught before merge</div>
        </div>
      </Pop>
    </>
  );
};

// ---- 7. End: the full test in the article -----------------------------------------------------------------------------

const End: React.FC = () => {
  const prs = 4;
  const article = useCue("article", 60);
  return (
    <>
      <Header text="The full test" />
      <Pop at={prs} sfx="reveal" style={{ left: 70, top: 400, width: 860 }}>
        <div style={{ display: "flex", gap: 24 }}>
          {[
            [String(data.prs), "pull requests"],
            [String(data.written.runs), "runs each"],
            ["2", "setups"],
          ].map(([n, l]) => (
            <div key={l} style={{ flex: 1, padding: "20px 22px", borderRadius: 20, border: `3px solid ${EDGE}`, background: CARD }}>
              <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 72, color: FG }}>{n}</div>
              <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 32, color: LIGHT }}>{l}</div>
            </div>
          ))}
        </div>
      </Pop>
      <Pop at={article} style={{ left: 70, top: 700 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 44, color: LIGHT }}>
          Full article: <span style={{ color: FG }}>link in profile</span>
        </div>
      </Pop>
    </>
  );
};

export const SCENES1: Record<string, React.FC> = { hook: Hook, order: Order, production: ProductionScene, loss: Loss, stale: Stale, fix: Fix, end: End };
