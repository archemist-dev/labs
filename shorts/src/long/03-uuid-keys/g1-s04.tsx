// Scene 4: why not a counter. A phone, a queue and an empty database (the ID is needed before the insert), then a
// counter that hands out numbers only on write, then services minting their own random UUIDs.
// The 3D world uses one fixed camera: screen x is about 1280 + 154 * x at z = 0 (see Stage in g1-common).
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { FG, GOLD, GRAY, GREEN, LIGHT, MONO, MUTED, RED, SANS } from "../../theme";
import { Mark } from "../../components/parts";
import { Appear, Card, cl, cue, Muted, Scene, Sfx, Stage, Tag, useT } from "./g1-common";

const id = "04";
const C = {
  instant: cue(id, "instant"),
  accepted: cue(id, "accepted"),
  queue: cue(id, "queue"),
  customer: cue(id, "customer"),
  loading: cue(id, "loading"),
  server: cue(id, "server"),
  needs: cue(id, "needs"),
  isnt: cue(id, "isnt"),
  made: cue(id, "made"),
  counter: cue(id, "counter"),
  hands: cue(id, "hands"),
  written: cue(id, "written"),
  other: cue(id, "other"),
  url: cue(id, "url"),
  many: cue(id, "many"),
  tables: cue(id, "tables"),
  collided: cue(id, "collided"),
  random: cue(id, "random"),
  fixed: cue(id, "fixed"),
  make: cue(id, "make"),
  coordination: cue(id, "coordination"),
  years: cue(id, "years"),
};
const SPLIT = C.counter - 12; // the phone world ends, the counter world starts

// ---- the phone (HTML) -------------------------------------------------------------------------------------------

const Phone: React.FC = () => {
  const frame = useCurrentFrame();
  const out = 1 - useT(SPLIT, SPLIT + 10);
  const status = frame >= C.customer;
  const tap = interpolate(frame, [C.accepted - 10, C.accepted - 6, C.accepted - 1], [0, 1, 0], cl);
  const load = ((frame - C.loading) / 55) % 1;
  const idShown = frame >= C.made;
  return (
    <Appear at={4} until={SPLIT} style={{ left: 130, top: 250, width: 460, height: 940, borderRadius: 64, border: `7px solid ${LIGHT}`, background: "#262a30", padding: "70px 34px", opacity: out }}>
      {!status ? (
        <>
          <Tag size={44} color={MUTED}>Your order</Tag>
          <div style={{ marginTop: 28, display: "flex", justifyContent: "space-between", fontFamily: SANS, fontWeight: 700, fontSize: 40, color: FG }}>
            <span>Margherita</span>
            <span style={{ fontFamily: MONO }}>£11.99</span>
          </div>
          <div style={{ marginTop: 14, fontFamily: SANS, fontSize: 34, color: MUTED }}>East Rd, Cambridge</div>
          <div
            style={{
              position: "absolute",
              left: 34,
              right: 34,
              bottom: 80,
              height: 110,
              borderRadius: 24,
              background: tap > 0.1 ? GREEN : "#3a4049",
              transform: `scale(${1 - 0.06 * tap})`,
              border: `4px solid ${tap > 0.1 ? GREEN : LIGHT}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 44,
              color: tap > 0.1 ? "#12301f" : FG,
            }}
          >
            Place order
          </div>
        </>
      ) : (
        <>
          <Tag size={44} color={MUTED}>Order placed</Tag>
          <div style={{ marginTop: 40, fontFamily: SANS, fontWeight: 800, fontSize: 52, color: FG }}>Preparing your order</div>
          {/* the loading state: an indeterminate bar */}
          <div style={{ marginTop: 34, height: 18, borderRadius: 9, background: "#3a4049", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, width: "38%", left: `${-38 + load * 138}%`, background: GREEN, borderRadius: 9 }} />
          </div>
          <div style={{ marginTop: 70, fontFamily: SANS, fontWeight: 700, fontSize: 34, color: MUTED }}>Order ID</div>
          <div style={{ marginTop: 8, fontFamily: MONO, fontWeight: 800, fontSize: 44, color: idShown ? FG : GRAY }}>{idShown ? "7c1e9b2a-4f3d…" : "?"}</div>
        </>
      )}
    </Appear>
  );
};

// ---- 3D: the queue, the database, the services -------------------------------------------------------------------

const Slab: React.FC<{ x: number; z?: number; color: string; s?: number }> = ({ x, z = 0, color, s = 1 }) => (
  <mesh position={[x, 0.26, z]} scale={[s, s, s]}>
    <boxGeometry args={[0.46, 0.3, 0.8]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} roughness={0.35} />
  </mesh>
);

const SERVICES = [
  { name: "Service A", z: -2.7 },
  { name: "Service B", z: 0 },
  { name: "Service C", z: 2.7 },
];
const SX = -2.4;
const DBX = 3.1;

const World: React.FC = () => {
  const frame = useCurrentFrame();
  const phoneWorld = 1 - useT(SPLIT, SPLIT + 10);
  const dbWorld = 1; // the database stays the whole scene
  const queueS = interpolate(frame, [C.queue, C.queue + 10], [0, 1], cl);
  // our order slab travels from the phone to the back of the queue
  const ourX = interpolate(frame, [C.accepted, C.accepted + 42], [-4.4, -1.1], cl);
  const ourOn = frame >= C.accepted;
  const sw = 0.55 + 0.45 * Math.sin(frame * 0.12);
  const countWorld = useT(SPLIT, SPLIT + 12);
  const phase4 = useT(C.random - 6, C.random + 8); // services become green and mint IDs
  const noDb = useT(C.coordination, C.coordination + 12);
  return (
    <Stage pos={[0, 6.8, 12.2]} look={[0, 0.5, 0]}>
      {/* the database: empty glass while the order waits, always at the right */}
      {[0.38, 1.0, 1.62].map((y, i) => (
        <mesh key={i} position={[DBX, y, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 0.52, 56]} />
          <meshStandardMaterial color="#4a515b" emissive={frame >= C.written ? GRAY : "#2c3036"} emissiveIntensity={0.35} transparent opacity={frame < SPLIT ? 0.55 : 0.95 - 0.5 * noDb} roughness={0.4} metalness={0.3} />
        </mesh>
      ))}
      {/* queue belt and slabs */}
      <group scale={[1, 1, 1]} visible={phoneWorld > 0.02}>
        <mesh position={[-0.7, 0.05, 0]}>
          <boxGeometry args={[4.6, 0.1, 1.0]} />
          <meshStandardMaterial color="#2a2e34" roughness={0.7} />
        </mesh>
        {[0.9, 0.4, -0.1, -0.6].map((x, i) => (
          <Slab key={i} x={x} color={LIGHT} s={queueS * phoneWorld} />
        ))}
        {ourOn ? <Slab x={ourX} color={frame >= C.made ? GREEN : FG} s={phoneWorld} /> : null}
      </group>
      {/* the services */}
      <group visible={countWorld > 0.02}>
        {SERVICES.map((s, i) => {
          const dx = DBX - SX;
          const dz = -s.z;
          const len = Math.hypot(dx, dz);
          const ang = Math.atan2(-dz, dx);
          const color = phase4 > 0.5 ? GREEN : LIGHT;
          const t = ((frame * 0.012 + i * 0.33) % 1);
          return (
            <group key={s.name} scale={[countWorld, countWorld, countWorld]}>
              <mesh position={[SX, 0.4, s.z]}>
                <boxGeometry args={[0.7, 0.7, 0.7]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2 + 0.2 * phase4} roughness={0.4} />
              </mesh>
              {/* the line to the counter: gray requests waiting for a number; it goes away when the services mint their own */}
              <group visible={noDb < 0.9}>
                <mesh position={[(SX + DBX) / 2, 0.06, s.z / 2]} rotation={[0, ang, 0]}>
                  <boxGeometry args={[len, 0.05, 0.05]} />
                  <meshStandardMaterial color={phase4 > 0.5 ? RED : GRAY} />
                </mesh>
                {phase4 < 0.5 ? (
                  <mesh position={[SX + dx * t, 0.25, s.z * (1 - t)]}>
                    <sphereGeometry args={[0.16, 16, 16]} />
                    <meshStandardMaterial color={LIGHT} emissive={LIGHT} emissiveIntensity={0.5} />
                  </mesh>
                ) : null}
              </group>
            </group>
          );
        })}
      </group>
      <pointLight position={[DBX, 3, 2]} intensity={4 * dbWorld} distance={8} color="#ffffff" />
      <pointLight position={[0, 4, 2]} intensity={1.5 * (0.5 + 0.5 * sw)} distance={9} color={GREEN} />
    </Stage>
  );
};

// ---- HTML labels and cards over the world --------------------------------------------------------------------------

const Labels: React.FC = () => {
  const frame = useCurrentFrame();
  const stamp = useT(C.made - 4, C.made + 8);
  return (
    <>
      <Appear at={C.queue} until={SPLIT} style={{ left: 880, top: 425 }}>
        <Tag size={46} color={MUTED} style={{ letterSpacing: 4 }}>QUEUE</Tag>
      </Appear>
      <Appear at={C.server - 20} style={{ left: 1610, top: 400 }}>
        <Tag size={46} color={MUTED} style={{ letterSpacing: 4 }}>{frame < SPLIT ? "SERVER" : "DATABASE"}</Tag>
      </Appear>
      <Appear at={C.isnt - 8} until={SPLIT} style={{ left: 1560, top: 870, width: 470 }}>
        <Tag mono size={48} color={RED}>row: not yet</Tag>
      </Appear>
      {/* the point of the first half */}
      {frame >= C.made - 4 && frame < SPLIT + 10 ? (
        <Appear at={C.made - 4} until={SPLIT} style={{ left: 1860, top: 170, transform: `scale(${0.8 + 0.2 * stamp})`, transformOrigin: "left top" }}>
          <Card color={GREEN}>
            <Tag mono size={58} color={GREEN}>ID</Tag>
            <Tag size={58} color={FG}>before INSERT</Tag>
          </Card>
        </Appear>
      ) : null}
      {/* the counter, on top of the database */}
      <Appear at={C.counter} until={C.random} style={{ left: 1590, top: 150 }}>
        <Card color={LIGHT} style={{ padding: "16px 26px" }}>
          <Muted size={32}>next ID</Muted>
          <Tag mono size={74} color={FG}>1042</Tag>
        </Card>
      </Appear>
      {SERVICES.map((s, i) => (
        <Appear key={s.name} at={C.counter + 6 + i * 6} style={{ left: 330, width: 380, top: [540, 702, 934][i], textAlign: "right" }}>
          <Tag size={52} color={frame >= C.random ? GREEN : LIGHT}>{s.name}</Tag>
        </Appear>
      ))}
      {/* the other two problems */}
      <Appear at={C.url - 6} style={{ left: 1900, top: 520, width: 600 }}>
        <Card color={frame >= C.fixed ? GREEN : RED}>
          <Muted size={36}>URL</Muted>
          <Tag mono size={46} color={FG}>/orders/1042</Tag>
          <Tag mono size={46} color={RED}>/orders/1043</Tag>
          <Muted size={34}>guess the next one</Muted>
        </Card>
      </Appear>
      <Appear at={C.tables - 4} style={{ left: 1900, top: 840, width: 600 }}>
        <Card color={frame >= C.fixed + 10 ? GREEN : RED}>
          <Muted size={36}>Service A table</Muted>
          <Tag mono size={42} color={FG}>order_id 1042</Tag>
          <Muted size={36} style={{ marginTop: 10 }}>Service B table</Muted>
          <Tag mono size={42} color={FG}>order_id 1042</Tag>
          <Tag size={40} color={RED} style={{ marginTop: 10, opacity: useT(C.collided, C.collided + 8) * (1 - useT(C.fixed + 10, C.fixed + 22)) }}>collided</Tag>
        </Card>
      </Appear>
      {/* the fix: random UUIDs */}
      {frame >= C.random - 4 ? (
        <>
          <Appear at={C.random - 4} style={{ left: 1900, top: 170, width: 600 }}>
            <Card color={GREEN}>
              <Tag size={56} color={GREEN}>UUID v4</Tag>
              <Muted size={36}>made by the service</Muted>
            </Card>
          </Appear>
          <Appear at={C.fixed} style={{ left: 2380, top: 540 }}>
            <Mark ok size={90} />
          </Appear>
          <Appear at={C.fixed + 10} style={{ left: 2380, top: 860 }}>
            <Mark ok size={90} />
          </Appear>
        </>
      ) : null}
      {/* IDs scrolling out of each service */}
      {SERVICES.map((s, si) => (
        <IdStream key={s.name} idx={si} top={[500, 662, 892][si]} />
      ))}
      <Appear at={C.coordination} style={{ left: 1560, top: 880 }}>
        <Tag size={46} color={RED} style={{ letterSpacing: 2 }}>no database</Tag>
      </Appear>
      <Appear at={C.years} style={{ left: 120, top: 120 }}>
        <Tag size={120} color={FG} style={{ fontWeight: 800 }}>years</Tag>
        <div style={{ marginTop: 10, width: 180, height: 10, borderRadius: 5, background: GOLD }} />
      </Appear>
      <Sfx name="whoosh" from={SPLIT} volume={0.4} />
      <Sfx name="stamp" from={C.made - 4} volume={0.5} />
      <Sfx name="buzz" from={C.collided} volume={0.3} />
      <Sfx name="reveal" from={C.random} volume={0.35} />
    </>
  );
};

const HEX = "0123456789abcdef";
const hexId = (seed: number) => {
  let a = (seed * 7919 + 17) | 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let out = "";
  for (let i = 0; i < 20; i++) {
    out += HEX[Math.floor(rnd() * 16)];
    if (i === 7 || i === 11 || i === 15) out += "-";
  }
  return out;
};

// IDs rise out of each service: a new random one every 24 frames, drifting up and fading, one line apart.
const IdStream: React.FC<{ idx: number; top: number }> = ({ idx, top }) => {
  const frame = useCurrentFrame();
  const start = C.make - 6;
  if (frame < start) return null;
  const n = Math.floor((frame - start) / 24);
  return (
    <>
      {[0, 1, 2].map((k) => {
        const i = n - k;
        if (i < 0) return null;
        const age = (frame - start - i * 24) / 72;
        return (
          <div key={i} style={{ position: "absolute", left: 1090 + age * 50, top: top + 40 - age * 130, opacity: interpolate(age, [0, 0.12, 0.75, 1], [0, 1, 1, 0], cl), fontFamily: MONO, fontWeight: 700, fontSize: 34, color: GREEN }}>
            {hexId(idx * 100 + i)}
          </div>
        );
      })}
    </>
  );
};

export const WhyNotCounter: React.FC = () => (
  <Scene id="04">
    <World />
    <Phone />
    <Labels />
  </Scene>
);
