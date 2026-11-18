// Prototype C for "The checklist fix" opening (Javlon, 2026-11-18: "use the real code in those boxes", so "can you
// spot the bug" is a real question). The review's real comment headings float as cards in depth (CSS 3D, cards face
// the camera so text never sits at an angle), and the camera drifts in. Every heading is verbatim from the default
// reviewer's run 1 (05-ai-review/video_data.py asserts each one against the review file). Far cards without text
// stand for the rest of the 106 comments.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Pop } from "../../components/parts";
import { Sfx, useCue } from "../../components/Shell";
import { Canvas, Rack } from "../03-uuid-keys/Short1";
import { Header } from "../04-response-time/Short1";
import short1 from "./data.json";
import { FG, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import data from "./data2.json";
import { HookText, NoiseText } from "./Short2";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const sine = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const ease = (t: number) => 1 - (1 - t) ** 3;
const fade = (frame: number, at: number, len = 10) => interpolate(frame, [at, at + len], [0, 1], clamp);
type Kind = "bug" | "block" | "nit" | "blank";
type C = { pr: string; text: string; kind: Kind; path?: string; code?: string; title?: string };
const CARDS = data.cards as C[];
const rule = short1.rule; // the promo rule from orders/money.py (05-ai-review rules.py)

const PERSP = 1100;
const OX = 540;
const OY = 960;

// Screen slots per depth layer: [x, y] where the card's centre lands at the start; z in px (negative = further).
const LAYERS: { z: number; w: number; slots: [number, number][] }[] = [
  { z: 0, w: 470, slots: [[295, 760], [785, 840], [295, 1080], [785, 1160]] },
  { z: -650, w: 470, slots: [[540, 650], [180, 930], [900, 990], [540, 1240], [180, 1250], [900, 700]] },
  { z: -1500, w: 470, slots: Array.from({ length: 12 }, (_, i) => [160 + (i % 4) * 253, 640 + Math.floor(i / 4) * 300] as [number, number]) },
];

// Which card goes where: bugs spread across the two readable layers, with blocking noise right next to them.
const PICK: Record<number, string[]> = {
  0: ["c02:No tests", "b03", "b08", "c04:Day"],
  1: ["b02", "c05:Magic", "b05", "c09:No tests", "b09", "c05:The logs"],
  2: ["b07", "b06", "b10", "b04:Bug", "b01:Blocking", "c07:No tests", "c02:Worst", "b02:Backoff", "c08:Leftover", "b04:Tests"],
};
const find = (key: string): C | undefined => {
  const [pr, start] = key.split(":");
  return CARDS.find((c) => c.pr.startsWith(pr) && (start ? c.text.startsWith(start) : c.kind === "bug"));
};
const PLACED: { card: C; x: number; y: number; z: number; w: number }[] = (() => {
  const used = new Set<C>();
  const out: { card: C; x: number; y: number; z: number; w: number }[] = [];
  LAYERS.forEach((L, li) => {
    const picks = (PICK[li] ?? []).map(find).filter((c): c is C => !!c && !used.has(c));
    const rest = li === 2 ? CARDS.filter((c) => !used.has(c) && !picks.includes(c)) : [];
    const cards = [...picks, ...rest];
    L.slots.forEach(([sx, sy], i) => {
      const s = PERSP / (PERSP - L.z);
      const card = cards[i] ?? { pr: "", text: "", kind: "blank" as Kind };
      if (cards[i]) used.add(cards[i]);
      out.push({ card, x: OX + (sx - OX) / s, y: OY + (sy - OY) / s, z: L.z, w: L.w });
    });
  });
  return out.sort((a, b) => a.z - b.z); // far first, so near cards paint on top
})();

// Renders `code` spans in mono, like the review itself.
const Rich: React.FC<{ text: string }> = ({ text }) => (
  <>
    {text.split("`").map((part, i) =>
      i % 2 ? (
        <span key={i} style={{ fontFamily: MONO, fontWeight: 700, fontSize: "0.88em", background: "#2f343b", borderRadius: 6, padding: "0 6px" }}>
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      ),
    )}
  </>
);

// A review comment as code-review sites show it (generic, no brand): the file, the changed line of the real diff,
// the bot reviewer, its comment. `red` marks the bug, `hi` outlines a blocking comment that isn't the bug.
const Card: React.FC<{ c: C; w: number; red: number; dim: number; hi: number }> = ({ c, w, red, dim, hi }) => {
  const border = red > 0 ? RED : hi > 0 ? FG : "#3a3f47";
  const blank = c.kind === "blank";
  return (
    <div style={{ width: w, borderRadius: 14, overflow: "hidden", background: red > 0 ? `rgba(90,24,27,${0.6 + 0.4 * red})` : "#16191d", border: `3px solid ${border}`, opacity: 1 - dim * 0.65, boxShadow: "0 18px 40px rgba(0,0,0,0.55)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", background: "#22262c", borderBottom: "2px solid #30353c" }}>
        <div style={{ width: 16, height: 20, borderRadius: 3, border: `2px solid ${MUTED}` }} />
        <div style={{ fontFamily: MONO, fontSize: 21, color: LIGHT, whiteSpace: "nowrap" }}>{blank ? "orders/…" : c.path}</div>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "6px 16px", background: "rgba(52,199,123,0.13)", fontFamily: MONO, fontSize: 20, color: FG, whiteSpace: "nowrap", overflow: "hidden" }}>
        <span style={{ color: GREEN, fontWeight: 800 }}>+</span>
        {blank ? <span style={{ width: "70%", height: 12, marginTop: 6, borderRadius: 6, background: "#2f5a43" }} /> : <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.code}</span>}
      </div>
      <div style={{ padding: "12px 16px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: red > 0 ? RED : "#4b5563", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <div style={{ width: 5, height: 5, borderRadius: 3, background: FG }} />
            <div style={{ width: 5, height: 5, borderRadius: 3, background: FG }} />
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 23, color: FG }}>ai-reviewer</div>
          <div style={{ fontFamily: MONO, fontSize: 17, color: MUTED, border: `2px solid ${GRAY}`, borderRadius: 10, padding: "0 8px" }}>bot</div>
        </div>
        {blank ? (
          <>
            <div style={{ height: 14, width: "85%", borderRadius: 7, background: "#3a3f47", marginBottom: 10 }} />
            <div style={{ height: 14, width: "60%", borderRadius: 7, background: "#3a3f47" }} />
          </>
        ) : (
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 30, lineHeight: 1.2, color: FG }}>
            <Rich text={c.text} />
          </div>
        )}
      </div>
    </div>
  );
};

// Depth of field: the front layer is sharp, the middle soft, the back a blur. On the reveal the focus racks to the
// bugs: every bug card sharpens wherever it sits, everything else blurs and dims.
const LAYER_BLUR: Record<number, number> = { 0: 0, [-650]: 3.5, [-1500]: 8 };
const LAYER_FADE: Record<number, number> = { 0: 1, [-650]: 0.6, [-1500]: 0.3 };

const Field: React.FC<{ red: number; dimRest: number; hiBlock: number; push: number; drift: number; drop?: number }> = ({ red, dimRest, hiBlock, push, drift, drop = 0 }) => (
  <div style={{ position: "absolute", inset: 0, perspective: PERSP, perspectiveOrigin: `${OX}px ${OY}px`, overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transform: `translate3d(${drift}px, 0, ${push}px)` }}>
      {PLACED.map(({ card, x, y, z, w }, i) => {
        const bug = card.kind === "bug";
        const block = card.kind === "block";
        const lit = bug ? red : block ? hiBlock : 0; // racked into focus
        const blur = LAYER_BLUR[z] * (1 - lit) + (bug || lit > 0 ? 0 : 2.5 * dimRest);
        const d = bug ? 0 : ease(Math.max(0, Math.min(1, drop * 1.6 - (i % 7) * 0.09))); // staggered fall
        const fade = (LAYER_FADE[z] + (1 - LAYER_FADE[z]) * lit) * (1 - d);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y + d * 700, transform: `translate3d(-50%, -50%, ${z}px)`, opacity: fade, filter: blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : "none" }}>
            <Card c={card} w={w} red={bug ? red : 0} hi={block ? hiBlock : 0} dim={bug ? 0 : block ? dimRest * (1 - hiBlock) : dimRest} />
          </div>
        );
      })}
    </div>
  </div>
);

// Soft vignette: the edges fall off so the eye stays on the middle.
const Vignette: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 75% 55% at 50% 58%, rgba(27,29,33,0) 55%, rgba(27,29,33,0.85) 100%)" }} />
);

// Dark band behind the top text, so the cards drifting under it never fight the header.
const TopShade: React.FC = () => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 700, background: "linear-gradient(#1b1d21 0%, #1b1d21 80%, rgba(27,29,33,0) 100%)" }} />
);

const HookC: React.FC = () => {
  const frame = useCurrentFrame();
  const ten = useCue("ten", 45);
  const comments = useCue("comments", 75);
  // The reveal waits for "110 comments", so viewers get about 4 s to hunt for the bugs themselves.
  const red = interpolate(frame, [comments - 8, comments + 4], [0, 1], clamp);
  const dim = interpolate(frame, [comments - 2, comments + 14], [0, 1], clamp);
  const t = sine(interpolate(frame, [0, 300], [0, 1], clamp));
  return (
    <>
      <Field red={red} dimRest={dim} hiBlock={0} push={t * 90} drift={Math.sin(frame / 90) * 18} />
      <Vignette />
      <TopShade />
      <HookText cues={{ ten, comments }} />
    </>
  );
};

const NoiseC: React.FC = () => {
  const frame = useCurrentFrame();
  const blocking = useCue("blocking", 170);
  const hi = interpolate(frame, [blocking - 2, blocking + 10], [0, 1], clamp);
  const t = sine(interpolate(frame, [0, 420], [0, 1], clamp));
  return (
    <>
      <Field red={1} dimRest={1} hiBlock={hi} push={90 + t * 40} drift={Math.sin((frame + 300) / 90) * 18} />
      <Vignette />
      <TopShade />
      <NoiseText />
    </>
  );
};

// ---- 3. Production: a hundred and ten comments, approved ------------------------------------------------------------

const ProductionC: React.FC = () => {
  const frame = useCurrentFrame();
  const approved = useCue("approved", 40);
  const z = interpolate(frame, [0, 60], [13, 12], clamp);
  return (
    <>
      <Field red={1} dimRest={1} hiBlock={0} push={130} drift={0} />
      <div style={{ position: "absolute", inset: 0, background: "rgba(27,29,33,0.72)" }} />
      <Canvas pos={[0.6, 2.4, z]} look={[0.85, 1.2, 0]}>
        <pointLight position={[0.5, 2.2, 4]} intensity={18} distance={12} color="#ffffff" />
        <group scale={interpolate(frame, [0, 8], [0.6, 1], { ...clamp, easing: ease })}>
          <Rack frame={frame} />
        </group>
      </Canvas>
      <div style={{ position: "absolute", left: 90, width: 460, top: 480, textAlign: "center", fontFamily: MONO, fontWeight: 800, fontSize: 36, color: LIGHT }}>PRODUCTION</div>
      <Pop at={3} sfx="reveal" style={{ left: 560, top: 300 }}>
        <div style={{ position: "relative", width: 430, padding: "26px 30px", borderRadius: 26, background: "#262a30", border: `4px solid ${LIGHT}` }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG }}>A hundred and ten comments.</div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: GREEN, opacity: fade(frame, approved - 2, 6) }}>Approved.</div>
          <div style={{ position: "absolute", left: -2, bottom: -40, width: 0, height: 0, borderTop: `40px solid ${LIGHT}`, borderRight: "40px solid transparent" }} />
        </div>
      </Pop>
      <Sfx name="stamp" at={approved} volume={0.3} />
    </>
  );
};

// ---- 4. The fix: one prompt; the noise falls away, the 10 bugs stay ----------------------------------------------------

const PromptLine: React.FC<{ at: number; text: string }> = ({ at, text }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "baseline", opacity: fade(frame, at - 4), transform: `translateX(${(1 - ease(fade(frame, at - 4, 12))) * -20}px)` }}>
      <span style={{ color: GREEN, fontWeight: 800 }}>✓</span>
      <span>{text}</span>
    </div>
  );
};

const FixC: React.FC = () => {
  const frame = useCurrentFrame();
  const prompt = useCue("prompt", 15);
  const silent = useCue("silent", 40);
  const callers = useCue("callers", 75);
  const blocking = useCue("blocking", 110);
  const drop = interpolate(frame, [blocking - 4, blocking + 40], [0, 1], clamp);
  return (
    <>
      <Field red={1} dimRest={1} hiBlock={0} push={130 + frame * 0.15} drift={0} drop={drop} />
      <Vignette />
      <TopShade />
      <Header text="The fix: one prompt" />
      <div style={{ position: "absolute", left: 70, top: 380, width: 900, padding: "22px 28px", borderRadius: 18, border: `3px solid ${GREEN}`, background: "#16191d", opacity: fade(frame, prompt - 4), fontFamily: MONO, fontSize: 34, color: FG, lineHeight: 1.55 }}>
        <div style={{ fontSize: 24, color: MUTED, marginBottom: 6 }}>review prompt</div>
        <PromptLine at={silent} text="only silent failures" />
        <PromptLine at={callers} text="read callers + config first" />
        <PromptLine at={blocking} text="post blocking comments only" />
      </div>
      <Sfx name="whoosh" at={blocking} volume={0.3} />
    </>
  );
};

// ---- 5. Result: same 10 bugs, a tenth of the comments ------------------------------------------------------------------

const D = data.default.runs;
const K = data.checklist.runs;
const span = (xs: number[]) => (Math.min(...xs) === Math.max(...xs) ? `${xs[0]}` : `${Math.min(...xs)}–${Math.max(...xs)}`);
const D_COMMENTS = span(D.map((r) => r.comments)); // 106–113
const K_POSTED = span(K.map((r) => r.blocking)); // 10–11
const D_MAX = Math.max(...D.map((r) => r.comments));

const Row: React.FC<{ at: number; top: number; label: string; value: string; n: number; color: string; note: string }> = ({ at, top, label, value, n, color, note }) => {
  const frame = useCurrentFrame();
  const p = ease(interpolate(frame, [at, at + 24], [0, 1], clamp));
  return (
    <div style={{ position: "absolute", left: 70, top, width: 900, opacity: fade(frame, at - 4) }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 40, color: LIGHT }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 14 }}>
        <div style={{ height: 56, width: Math.max(14, (n / D_MAX) * 620 * p), borderRadius: 10, background: color }} />
        <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 58, color }}>{value}</div>
      </div>
      <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 30, color: MUTED }}>{note}</div>
    </div>
  );
};

const ResultC: React.FC = () => {
  const ten = useCue("ten", 10);
  const tenth = useCue("tenth", 40);
  const every = useCue("every", 70);
  return (
    <>
      <Header text="Same bugs, less noise" sub="20 PRs · 3 runs each" />
      <Row at={ten - 6} top={430} label="Default prompt" value={D_COMMENTS} n={D_MAX} color={GRAY} note="comments · 10 bugs caught" />
      <Row at={tenth - 4} top={690} label="Checklist, blocking only" value={K_POSTED} n={Math.max(...K.map((r) => r.blocking))} color={GREEN} note="comments · 10 bugs caught" />
      <Pop at={every} sfx="reveal" style={{ left: 70, top: 980 }}>
        <div style={{ padding: "18px 26px", borderRadius: 18, border: `4px solid ${GREEN}`, background: "#20352a", fontFamily: MONO, fontWeight: 800, fontSize: 40, color: GREEN }}>
          10 of {K_POSTED} comments are the bugs
        </div>
      </Pop>
      <Sfx name="reveal" at={tenth} volume={0.3} />
    </>
  );
};

// ---- 6. End: the bug card turns over to the rule it caught ---------------------------------------------------------------

const PROMO = CARDS.find((c) => c.pr.startsWith("b03"))!;

const EndC: React.FC = () => {
  const frame = useCurrentFrame();
  const comment = useCue("comment", 40);
  const article = useCue("article", 90);
  const flip = ease(interpolate(frame, [comment - 6, comment + 18], [0, 1], clamp));
  const back = flip > 0.5;
  return (
    <>
      <Header text="Every comment read" />
      <div style={{ position: "absolute", left: 90, top: 420, width: 900, perspective: 1600 }}>
        <div style={{ transform: `rotateY(${flip * 180}deg)`, transformStyle: "preserve-3d" }}>
          <div style={{ transform: back ? "rotateY(180deg)" : "none" }}>
            {back ? (
              <div style={{ padding: "28px 32px", borderRadius: 18, border: `4px solid ${GREEN}`, background: "#16191d" }}>
                <div style={{ fontFamily: MONO, fontSize: 26, color: MUTED, marginBottom: 12 }}>orders/money.py · the rule it caught</div>
                <div style={{ fontFamily: MONO, fontSize: 34, lineHeight: 1.4, color: FG }}>"{rule}"</div>
              </div>
            ) : (
              <Card c={PROMO} w={900} red={1} dim={0} hi={0} />
            )}
          </div>
        </div>
      </div>
      <Pop at={article} style={{ left: 90, top: 860 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 46, color: LIGHT }}>
          Full article: <span style={{ color: FG }}>link in profile</span>
        </div>
      </Pop>
    </>
  );
};

export const SCENES_C: Record<string, React.FC> = { hook: HookC, noise: NoiseC };
export const SCENES2: Record<string, React.FC> = { hook: HookC, noise: NoiseC, production: ProductionC, fix: FixC, result: ResultC, end: EndC };

