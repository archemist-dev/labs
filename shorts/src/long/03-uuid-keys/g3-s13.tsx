// Scene 13 (50 s): the switch (old v4 keys, new v7 cluster), MySQL InnoDB scattering whole rows, other ID schemes.
// 3D for the first two parts, 2D cards for the third. The v4/v7 mix is not tested; the scene says so.
import React from "react";
import { Chip, FG, GREEN, GRAYC, LIGHT, MONO, MUTED, RED, SANS, Scene, Show, Stage, Title, easeIO, lerp, ramp, rng, useSec } from "./g3-kit";

// ---- Part A: old v4 mass and the new v7 cluster -------------------------------------------------------------------

const OLD = (() => {
  const r = rng(11);
  return Array.from({ length: 78 }, () => ({ x: -6.6 + r() * 5.6, z: -2.6 + r() * 5.2, s: 0.22 + r() * 0.16, at: 0.3 + r() * 1.9 }));
})();
const NNEW = 28;
const NEW_AT = (i: number) => 5.0 + i * 0.55;
const newPos = (i: number): [number, number, number] => {
  const col = i % 7;
  const row = Math.floor(i / 7) % 2;
  const layer = Math.floor(i / 14);
  return [1.8 + col * 0.4, 0.17 + layer * 0.34, -0.3 + row * 0.4];
};

const Switch: React.FC<{ t: number; vis: number }> = ({ t, vis }) => {
  const newest = Math.max(-1, Math.min(NNEW - 1, Math.floor((t - 5.0) / 0.55)));
  return (
    <group scale={[vis + 0.001, vis + 0.001, vis + 0.001]}>
      {OLD.map((o, i) => {
        const a = ramp(t, o.at, 0.5);
        return (
          <mesh key={i} position={[o.x, 0.15 + (1 - a) * 1.5, o.z]} scale={[a + 0.001, a + 0.001, a + 0.001]}>
            <boxGeometry args={[o.s, o.s, o.s]} />
            <meshStandardMaterial color={LIGHT} emissive={LIGHT} emissiveIntensity={0.1} roughness={0.5} />
          </mesh>
        );
      })}
      {Array.from({ length: NNEW }, (_, i) => {
        const k = Math.min(1, Math.max(0, (t - NEW_AT(i)) / 0.6));
        if (k <= 0) return null;
        const [x, y, z] = newPos(i);
        const hot = i === newest && t > 13.6 ? 1 : 0;
        return (
          <mesh key={i} position={[x, y + (1 - easeIO(k)) * 3.2, z]}>
            <boxGeometry args={[0.34, 0.3, 0.34]} />
            <meshStandardMaterial color={GREEN} emissive={GREEN} emissiveIntensity={0.25 + 0.7 * hot} roughness={0.35} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---- Part B: MySQL, rows stored in key order ---------------------------------------------------------------------

const NSLAB = 11;
const PITCH = 0.78;
// random keys land at these positions (slab index to insert before) at these times
const INS = [
  { at: 28.1, pos: 3 },
  { at: 28.9, pos: 8 },
  { at: 29.7, pos: 6 },
];

const Mysql: React.FC<{ t: number; vis: number }> = ({ t, vis }) => {
  // slot of the i-th original slab: shifted right by one for each insert placed before it
  const shift = (i: number) => INS.reduce((n, k) => n + (i >= k.pos ? ramp(t, k.at + 0.35, 0.5) : 0), 0);
  const total = NSLAB + INS.reduce((n, k) => n + ramp(t, k.at + 0.35, 0.5), 0);
  const x0 = -(total / 2) * PITCH;
  return (
    <group scale={[vis + 0.001, vis + 0.001, vis + 0.001]}>
      {Array.from({ length: NSLAB }, (_, i) => {
        const a = ramp(t, 22.6 + i * 0.05, 0.5);
        const x = x0 + (i + shift(i)) * PITCH;
        return (
          <group key={i} position={[x, 0, 0]} scale={[a + 0.001, a + 0.001, a + 0.001]}>
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[0.66, 0.32, 1.8]} />
              <meshStandardMaterial color="#6b7280" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.72, 0]}>
              <boxGeometry args={[0.26, 0.26, 0.26]} />
              <meshStandardMaterial color={LIGHT} emissive={LIGHT} emissiveIntensity={0.1} />
            </mesh>
          </group>
        );
      })}
      {INS.map((k, n) => {
        const d = Math.min(1, Math.max(0, (t - k.at) / 0.6));
        if (d <= 0) return null;
        // slot of the new slab: right before original slab k.pos
        const slot = k.pos + INS.reduce((c, o, m) => c + (m !== n && o.pos <= k.pos ? ramp(t, o.at + 0.35, 0.5) : 0), 0);
        const x = x0 + slot * PITCH;
        const y = 0.2 + (1 - easeIO(d)) * 3.4;
        return (
          <group key={n} position={[x, y, 0]}>
            <mesh>
              <boxGeometry args={[0.66, 0.32, 1.8]} />
              <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={0.35} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.52, 0]}>
              <boxGeometry args={[0.26, 0.26, 0.26]} />
              <meshStandardMaterial color={RED} emissive={RED} emissiveIntensity={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---- Part C: three ID-scheme cards ------------------------------------------------------------------------------

const CardBox: React.FC<{ left: number; children: React.ReactNode }> = ({ left, children }) => (
  <div style={{ position: "absolute", left, top: 340, width: 740, height: 620, borderRadius: 28, background: "#23272d", border: `4px solid ${GRAYC}`, padding: "36px 36px" }}>{children}</div>
);

const Cards: React.FC<{ t: number }> = ({ t }) => {
  const ULID = "01ARZ3NDEKTSV4RRFFQ69G5FAV";
  return (
    <>
      <Show t={t} at={32.2} style={{ left: 0, top: 0 }}>
        <CardBox left={120}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 68, color: FG }}>ULID · KSUID</div>
          <div style={{ marginTop: 40, fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: 0, whiteSpace: "nowrap" }}>
            <span style={{ color: GREEN }}>{ULID.slice(0, 10)}</span>
            <span style={{ color: MUTED }}>{ULID.slice(10)}</span>
          </div>
          <div style={{ marginTop: 16, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: GREEN }}>time first</div>
          <div style={{ marginTop: 10, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: MUTED, opacity: ramp(t, 34.2, 0.5) }}>the same idea as UUIDv7</div>
          <div style={{ marginTop: 60, opacity: ramp(t, 35.7, 0.5) }}>
            <Chip text="without the standard" color={LIGHT} size={52} />
          </div>
        </CardBox>
      </Show>
      <Show t={t} at={37.1} style={{ left: 0, top: 0 }}>
        <CardBox left={900}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 68, color: FG }}>Snowflake-style</div>
          <div style={{ marginTop: 56, display: "flex", gap: 6, opacity: ramp(t, 38.2, 0.5) }}>
            {[
              { l: "time", w: 330, c: GREEN, d: true },
              { l: "worker", w: 160, c: RED, d: false },
              { l: "counter", w: 190, c: GRAYC, d: false },
            ].map((s) => (
              <div key={s.l} style={{ width: s.w, height: 100, borderRadius: 12, background: s.c, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 800, fontSize: 36, color: s.d ? "#1b1d21" : FG, boxShadow: s.l === "worker" && t > 42.1 ? `0 0 40px ${RED}` : undefined }}>
                {s.l}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28, fontFamily: MONO, fontWeight: 800, fontSize: 64, color: FG, opacity: ramp(t, 40.9, 0.5) }}>
            8 bytes <span style={{ fontFamily: SANS, fontSize: 44, color: MUTED, fontWeight: 700 }}>(64 bits)</span>
          </div>
          <div style={{ marginTop: 40, opacity: ramp(t, 42.1, 0.5) }}>
            <Chip text="own worker ID per generator" color={RED} size={40} />
          </div>
        </CardBox>
      </Show>
      <Show t={t} at={44.3} style={{ left: 0, top: 0 }}>
        <CardBox left={1680}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 68, color: FG }}>hi-lo</div>
          <div style={{ marginTop: 44, display: "flex", alignItems: "center", gap: 24, opacity: ramp(t, 45.2, 0.5) }}>
            <div style={{ width: 200, height: 150, borderRadius: 24, border: `6px solid ${LIGHT}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 800, fontSize: 44, color: FG, textAlign: "center", lineHeight: 1.1 }}>counter</div>
            <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 70, color: MUTED }}>→</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 52px)", gap: 8 }}>
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} style={{ width: 52, height: 52, borderRadius: 8, background: GREEN, opacity: ramp(t, 45.6 + i * 0.08, 0.3) }} />
              ))}
            </div>
          </div>
          <div style={{ marginTop: 30, fontFamily: SANS, fontWeight: 700, fontSize: 44, color: GREEN, opacity: ramp(t, 45.7, 0.5) }}>blocks of IDs from a counter</div>
          <div style={{ marginTop: 40, opacity: ramp(t, 47.7, 0.5) }}>
            <Chip text="database asked once per block" color={LIGHT} size={38} />
          </div>
        </CardBox>
      </Show>
    </>
  );
};

// ---- the scene --------------------------------------------------------------------------------------------------

export const Scene13: React.FC = () => {
  const t = useSec();
  const aVis = 1 - ramp(t, 21.1, 0.4);
  const bVis = ramp(t, 21.5, 0.5) * (1 - ramp(t, 31.0, 0.5));
  return (
    <Scene id="13">
      {/* 3D first, so the text lies on top of the floor */}
      {t < 21.6 ? (
        <Stage pos={[0.9, 7.2, 11.4]} look={[-1.2, 0.2, 0.2]} fov={36}>
          <Switch t={t} vis={aVis} />
        </Stage>
      ) : null}
      {t >= 21.3 && t < 31.6 ? (
        <Stage pos={[0.5, 6.0, 11.0]} look={[0, 0.4, 0]} fov={36}>
          <Mysql t={t} vis={bVis} />
        </Stage>
      ) : null}

      {/* part A */}
      <Title t={t} text="The switch" at={0.2} until={21.0} />
      <Show t={t} at={2.3} until={21.0} style={{ left: 120, top: 1130 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: LIGHT }}>old orders</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 48, color: LIGHT }}>UUIDv4 keys, kept as they are</div>
      </Show>
      <Show t={t} at={5.9} until={21.0} style={{ left: 1580, top: 1130 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: GREEN }}>new rows</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 48, color: GREEN }}>UUIDv7</div>
      </Show>
      <Show t={t} at={8.2} until={21.0} style={{ left: 1580, top: 330 }}>
        <Chip text="steadier inserts" color={GREEN} size={52} />
      </Show>
      <Show t={t} at={9.7} until={21.0} style={{ left: 1580, top: 460 }}>
        <Chip text="sorting by ID works again" color={GREEN} size={52} />
      </Show>
      <Show t={t} at={11.6} until={13.5} style={{ left: 1580, top: 600 }}>
        <Chip text="the mix: not tested" color={MUTED} size={52} />
      </Show>
      <Show t={t} at={14.4} until={21.0} style={{ left: 1580, top: 600 }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 48, color: GREEN, maxWidth: 800, lineHeight: 1.2 }}>every new ID sorts next to the last one: new inserts land in one small part of the index</div>
      </Show>

      {/* part B */}
      <Title t={t} text="MySQL (InnoDB)" at={21.5} until={31.0} />
      <Show t={t} at={23.0} until={31.0} style={{ left: 120, top: 330 }}>
        <Chip text="it's worse" color={RED} size={60} />
      </Show>
      <Show t={t} at={24.5} until={31.0} style={{ left: 120, top: 1130 }}>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: LIGHT }}>the rows themselves are kept in primary key order</div>
      </Show>
      <Show t={t} at={28.0} until={31.0} style={{ left: 120, top: 1230 }}>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: RED }}>a random key scatters the table</span>
        <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 56, color: MUTED, opacity: ramp(t, 30.0, 0.4) }}> too, not only the index</span>
      </Show>
      <Show t={t} at={25.2} until={31.0} style={{ left: 120, top: 460 }}>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 44, color: LIGHT }}>
          ▬ row
          <span style={{ color: MUTED }}> · </span>
          ■ index entry
        </div>
      </Show>

      {/* part C */}
      <Title t={t} text="Other ID schemes" at={31.6} />
      <Cards t={t} />
    </Scene>
  );
};
export const S13_FRAMES = 1531;
void lerp;
