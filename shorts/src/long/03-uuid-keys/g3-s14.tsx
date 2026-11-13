// Scene 14 (73 s): the decision path, the trade-off balance (3D), the status page from the story, the principle.
import React from "react";
import { Chip, FG, GOLD, GREEN, GRAYC, LIGHT, MONO, MUTED, RED, SANS, Scene, Show, Stage, Title, clamp, lerp, ramp, useSec } from "./g3-kit";
import { warp14 } from "./g3-s14-warp";
import { interpolate } from "remotion";

// ---- Part 1: the decision path ------------------------------------------------------------------------------------

const CARD_TOPS = [300, 570, 840, 1110];

const Card: React.FC<{ t: number; at: number; n: number; top: number; dashed?: boolean; children: React.ReactNode }> = ({ t, at, n, top, dashed, children }) => (
  <Show t={t} at={at} until={41.8} style={{ left: 120, top, width: 2320, height: 230 }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: "#23272d", border: `${dashed ? 4 : 4}px ${dashed ? "dashed" : "solid"} ${GRAYC}` }} />
    <div style={{ position: "absolute", left: 40, top: 66, width: 96, height: 96, borderRadius: 48, background: "#2c3036", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO, fontWeight: 800, fontSize: 56, color: FG }}>{n}</div>
    {children}
  </Show>
);

const Decision: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Title t={t} text="How to pick" at={0.0} until={41.8} />

    <Card t={t} at={1.7} n={1} top={CARD_TOPS[0]}>
      <div style={{ position: "absolute", left: 180, top: 34, fontFamily: SANS, fontWeight: 800, fontSize: 62, color: FG }}>Start with a bigint counter</div>
      <div style={{ position: "absolute", left: 180, top: 130, fontFamily: SANS, fontWeight: 700, fontSize: 48, color: MUTED, opacity: ramp(t, 3.7, 0.4) }}>only the database creates IDs? stop there.</div>
      <div style={{ position: "absolute", right: 50, top: 40, opacity: ramp(t, 6.8, 0.5) }}>
        <Chip text="half the key size · fastest inserts" color={GREEN} size={46} />
      </div>
    </Card>

    <Card t={t} at={9.4} n={2} top={CARD_TOPS[1]}>
      <div style={{ position: "absolute", left: 180, top: 34, fontFamily: SANS, fontWeight: 800, fontSize: 62, color: FG }}>IDs made outside the database?</div>
      <div style={{ position: "absolute", left: 180, top: 128, display: "flex", gap: 24 }}>
        {[
          { l: "another service", at: 11.5 },
          { l: "the app, before the insert", at: 12.6 },
          { l: "an offline client", at: 13.9 },
        ].map((c) => (
          <div key={c.l} style={{ opacity: ramp(t, c.at, 0.4) }}>
            <Chip text={c.l} color={LIGHT} size={40} />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", right: 50, top: 56, opacity: ramp(t, 15.3, 0.5) }}>
        <Chip text="UUIDv7, not v4" mono color={GREEN} size={60} />
      </div>
    </Card>

    <Card t={t} at={18.3} n={3} top={CARD_TOPS[2]}>
      <div style={{ position: "absolute", left: 180, top: 34, fontFamily: SANS, fontWeight: 800, fontSize: 62, color: FG }}>Creation time must stay hidden?</div>
      <div style={{ position: "absolute", left: 180, top: 130, fontFamily: SANS, fontWeight: 700, fontSize: 48, color: MUTED, opacity: ramp(t, 23.8, 0.5) }}>its index pays the random cost, on that one column</div>
      <div style={{ position: "absolute", right: 50, top: 56, opacity: ramp(t, 20.9, 0.5) }}>
        <Chip text="a separate random public ID" color={LIGHT} size={52} />
      </div>
    </Card>

    <Card t={t} at={27.2} n={4} top={CARD_TOPS[3]} dashed>
      <div style={{ position: "absolute", left: 180, top: 34, fontFamily: SANS, fontWeight: 800, fontSize: 62, color: FG }}>Or: UUIDv7 inside, an encrypted ID outside</div>
      <div style={{ position: "absolute", left: 180, top: 134, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: MUTED, whiteSpace: "nowrap" }}>
        <span style={{ opacity: ramp(t, 33.3, 0.4) }}>looks random, no second index · </span>
        <span style={{ opacity: ramp(t, 36.0, 0.4) }}>you own a key, and changing it breaks every link</span>
      </div>
      <div style={{ position: "absolute", right: 50, top: 56, opacity: ramp(t, 40.6, 0.5) }}>
        <Chip text="not tested" color={RED} size={52} />
      </div>
    </Card>
  </>
);

// ---- Part 2: the trade-off balance (3D) ---------------------------------------------------------------------------

const GAINS = [42.5, 43.0];
const COSTS: { at: number; w: number }[] = [
  { at: 44.3, w: 0.5 },
  { at: 48.9, w: 0.45 },
  { at: 51.1, w: 0.45 },
  { at: 56.5, w: 0.45 },
];

const Balance: React.FC<{ t: number }> = ({ t }) => {
  const vis = ramp(t, 42.1, 0.6);
  const g = GAINS.reduce((s, a) => s + ramp(t, a, 0.5), 0);
  const c = COSTS.reduce((s, k) => s + k.w * ramp(t, k.at, 0.5), 0);
  const th = 0.1 * (g - c); // left (gains) heavy: positive angle lowers the left end
  const L = 2.4;
  const Y = 3.4;
  const lx = -L * Math.cos(th);
  const ly = Y - L * Math.sin(th);
  const rx = L * Math.cos(th);
  const ry = Y + L * Math.sin(th);
  const pan = (x: number, y: number, color: string, items: { at: number; size: number; dx: number }[]) => (
    <group>
      <mesh position={[x, y - 1.45, 0]}>
        <cylinderGeometry args={[1.0, 1.0, 0.12, 48]} />
        <meshStandardMaterial color="#454c56" roughness={0.5} metalness={0.3} />
      </mesh>
      {[-0.8, 0.8].map((d) => (
        <mesh key={d} position={[x + d * 0.7, y - 0.72, 0]}>
          <boxGeometry args={[0.05, 1.5, 0.05]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      ))}
      {items.map((it, i) => {
        const a = ramp(t, it.at, 0.6);
        return (
          <mesh key={i} position={[x + it.dx, y - 1.39 + it.size / 2 + (1 - a) * 2.4, 0]} scale={[a + 0.001, a + 0.001, a + 0.001]}>
            <boxGeometry args={[it.size, it.size, it.size]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
  return (
    <group scale={[vis + 0.001, vis + 0.001, vis + 0.001]}>
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[2.2, 0.2, 1.2]} />
        <meshStandardMaterial color="#454c56" roughness={0.6} />
      </mesh>
      <mesh position={[0, Y / 2, 0]}>
        <boxGeometry args={[0.2, Y, 0.2]} />
        <meshStandardMaterial color="#6b7280" roughness={0.5} />
      </mesh>
      <mesh position={[0, Y, 0]} rotation={[0, 0, th]}>
        <boxGeometry args={[L * 2 + 0.3, 0.14, 0.3]} />
        <meshStandardMaterial color="#9aa1ab" roughness={0.4} metalness={0.3} />
      </mesh>
      {pan(lx, ly, GREEN, [{ at: GAINS[0], size: 0.5, dx: -0.36 }, { at: GAINS[1], size: 0.5, dx: 0.36 }])}
      {pan(rx, ry, RED, [
        { at: COSTS[0].at, size: 0.36, dx: -0.6 },
        { at: COSTS[1].at, size: 0.36, dx: -0.2 },
        { at: COSTS[2].at, size: 0.36, dx: 0.2 },
        { at: COSTS[3].at, size: 0.36, dx: 0.6 },
      ])}
    </group>
  );
};

const Side: React.FC<{ t: number; at: number; top: number; left: number; color: string; children: React.ReactNode }> = ({ t, at, top, left, color, children }) => (
  <Show t={t} at={at} until={58.1} style={{ left, top, width: left > 1000 ? 540 : 600 }}>
    <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 48, color, lineHeight: 1.15 }}>{children}</div>
  </Show>
);

// ---- Part 3: the status page from the story ------------------------------------------------------------------------

const StatusPage: React.FC<{ t: number }> = ({ t }) => {
  const p = interpolate(t, [58.5, 62.0], [0.2, 0.72], clamp);
  return (
    <Show t={t} at={58.4} until={62.0} style={{ left: 0, top: 0, width: 2560, height: 1440 }}>
      <div style={{ position: "absolute", left: 960, top: 250, width: 640, height: 820, borderRadius: 72, background: "#23272d", border: `8px solid ${GRAYC}`, padding: "70px 50px" }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 58, color: FG }}>Your order</div>
        <div style={{ marginTop: 14, fontFamily: MONO, fontWeight: 700, fontSize: 36, color: MUTED }}>01a17e84-e100-71c4…</div>
        <div style={{ marginTop: 60, display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: GREEN, color: "#1b1d21", fontFamily: SANS, fontWeight: 800, fontSize: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 44, color: FG }}>ACCEPTED</div>
        </div>
        <div style={{ marginTop: 44 }}>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 44, color: LIGHT }}>PREPARING</div>
          <div style={{ marginTop: 20, width: 520, height: 22, borderRadius: 11, background: "#2c3036" }}>
            <div style={{ width: 520 * p, height: 22, borderRadius: 11, background: LIGHT }} />
          </div>
        </div>
        <div style={{ marginTop: 56, fontFamily: MONO, fontWeight: 800, fontSize: 44, color: GRAYC }}>DELIVERED</div>
      </div>
      <div style={{ position: "absolute", left: 140, top: 520, width: 740, fontFamily: SANS, fontWeight: 800, fontSize: 60, color: GREEN, textAlign: "right", lineHeight: 1.15 }}>the ID exists before the row</div>
      <div style={{ position: "absolute", left: 1680, top: 520, width: 740, fontFamily: SANS, fontWeight: 700, fontSize: 56, color: MUTED, lineHeight: 1.15 }}>a loading state, not a wait for the server</div>
    </Show>
  );
};

// ---- the scene --------------------------------------------------------------------------------------------------

export const Scene14: React.FC = () => {
  const t = warp14(useSec());
  return (
    <Scene id="14">
      {t >= 41.8 && t < 58.6 ? (
        <Stage pos={[0, 3.9, 14.5]} look={[0, 2.3, 0]} fov={36} opacity={ramp(t, 42.0, 0.5) * (1 - ramp(t, 58.0, 0.5))}>
          <Balance t={t} />
        </Stage>
      ) : null}

      <Decision t={t} />

      <Title t={t} text="The trade-off" at={42.0} until={58.1} />
      <Side t={t} at={42.5} top={330} left={120} color={GREEN}>gains: IDs made anywhere</Side>
      <Side t={t} at={43.0} top={470} left={120} color={GREEN}>inserts close to a counter</Side>
      <Side t={t} at={44.3} top={330} left={1900} color={RED}>16 bytes against 8, in every table and index that holds it</Side>
      <Side t={t} at={48.9} top={560} left={1900} color={RED}>shows when each record was created</Side>
      <Side t={t} at={51.1} top={750} left={1900} color={RED}>order across services is only as good as their clocks</Side>
      <Side t={t} at={56.5} top={990} left={1900} color={RED}>very high insert concurrency: the right edge is a hot spot</Side>

      <StatusPage t={t} />

      {/* the end card */}
      <Show t={t} at={62.3} style={{ left: 120, top: 330, width: 2320 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 130, color: FG, lineHeight: 1.12 }}>A primary key is a write pattern, not just a name.</div>
        <div style={{ marginTop: 36, width: 220, height: 12, borderRadius: 6, background: GOLD }} />
      </Show>
      <Show t={t} at={65.7} style={{ left: 120, top: 860 }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 54, color: MUTED }}>Code and results: github.com/archemist-dev/labs · 03-uuid-keys</div>
      </Show>
      <Show t={t} at={68.5} style={{ left: 120, top: 1030, width: 2320 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 76, color: FG, lineHeight: 1.15 }}>Which ID type do your primary keys use, and would you pick it again?</div>
      </Show>
      <Show t={t} at={72.2} style={{ left: 120, top: 1260 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 60, color: MUTED }}>Tell me in the comments.</div>
      </Show>
    </Scene>
  );
};
export const S14_FRAMES = 2222;
void lerp;
