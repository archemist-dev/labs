import React from "react";
import { Composition, Still } from "remotion";
import { Shell, type ShortProps } from "./components/Shell";
import { loadShort } from "./lib/load";
import type { Beat } from "./lib/track";
import { FPS, H, W } from "./theme";
import { short1 as payloadShort1 } from "./shorts/01-payload-encoding/script";
import { SCENES as payloadScenes1 } from "./shorts/01-payload-encoding/Short1";
import { Thumbnail as payloadThumb1 } from "./shorts/01-payload-encoding/Thumbnail";
import { short2 as payloadShort2 } from "./shorts/01-payload-encoding/script2";
import { SCENES2 as payloadScenes2 } from "./shorts/01-payload-encoding/Short2";
import { Thumbnail2 as payloadThumb2 } from "./shorts/01-payload-encoding/Thumbnail2";
import { short1 as extractShort1 } from "./shorts/02-extract-first/script";
import { SCENES as extractScenes1 } from "./shorts/02-extract-first/Short1";
import { Thumbnail as extractThumb1 } from "./shorts/02-extract-first/Thumbnail";
import { opening as uuidOpening, short1 as uuidShort1, short2 as uuidShort2 } from "./shorts/03-uuid-keys/script";
import { SCENES2 as uuidScenes2 } from "./shorts/03-uuid-keys/Short2";
import { SCENES1 as uuidScenes1 } from "./shorts/03-uuid-keys/Short1";
import { Thumbnail as uuidThumb1 } from "./shorts/03-uuid-keys/Thumbnail";
import { Thumbnail2 as uuidThumb2 } from "./shorts/03-uuid-keys/Thumbnail2";
import { SCENES_A as uuidProtoA } from "./shorts/03-uuid-keys/ProtoA";
import { SCENES_B as uuidProtoB } from "./shorts/03-uuid-keys/ProtoB";
import { short1 as rtShort1 } from "./shorts/04-response-time/script";
import { SCENES1 as rtScenes1 } from "./shorts/04-response-time/Short1";
import { Thumbnail as rtThumb1 } from "./shorts/04-response-time/Thumbnail";
import { short2 as rtShort2 } from "./shorts/04-response-time/script2";
import { SCENES2 as rtScenes2 } from "./shorts/04-response-time/Short2";
import { Thumbnail2 as rtThumb2 } from "./shorts/04-response-time/Thumbnail2";
import { short1 as aiShort1 } from "./shorts/05-ai-review/script";
import { SCENES1 as aiScenes1 } from "./shorts/05-ai-review/Short1";
import { Thumbnail as aiThumb1 } from "./shorts/05-ai-review/Thumbnail";

import { HOOK_FRAMES, LH, LongHook, LW } from "./long/03-uuid-keys/Hook";
import { LongThumb, TH, TW } from "./long/03-uuid-keys/Thumb";
import { G1_COMPS } from "./long/03-uuid-keys/g1";
import { G2_COMPS } from "./long/03-uuid-keys/g2";
import { G3_COMPS } from "./long/03-uuid-keys/g3";

// One entry per Short; each language becomes its own composition, e.g. "02-short1-uz".
const LIST: { id: string; scripts: Record<string, Beat[]>; scenes: Record<string, React.FC> }[] = [
  { id: "01-short1", scripts: payloadShort1, scenes: payloadScenes1 },
  { id: "01-short2", scripts: payloadShort2, scenes: payloadScenes2 },
  { id: "02-short1", scripts: extractShort1, scenes: extractScenes1 },
  { id: "03-short1", scripts: uuidShort1, scenes: uuidScenes1 },
  { id: "03-short2", scripts: uuidShort2, scenes: uuidScenes2 },
  { id: "04-short1", scripts: rtShort1, scenes: rtScenes1 },
  { id: "04-short2", scripts: rtShort2, scenes: rtScenes2 },
  { id: "05-short1", scripts: aiShort1, scenes: aiScenes1 },
  // Visual prototypes for week 3 "The 14x cliff" opening: A = 2D upgraded, B = 3D.
  { id: "03-protoA", scripts: uuidOpening, scenes: uuidProtoA },
  { id: "03-protoB", scripts: uuidOpening, scenes: uuidProtoB },
];
const SHORTS = LIST.map((s) => ({ ...s, component: (props: ShortProps) => <Shell {...props} scenes={s.scenes} /> }));

export const Root: React.FC = () => (
  <>
    {SHORTS.flatMap(({ id, scripts, component }) =>
      Object.keys(scripts).map((lang) => (
        <Composition
          key={`${id}-${lang}`}
          id={`${id}-${lang}`}
          component={component}
          width={W}
          height={H}
          fps={FPS}
          durationInFrames={FPS * 60}
          defaultProps={{ id, lang, track: null, audio: null, sfx: {} } as ShortProps}
          calculateMetadata={({ props }) => loadShort(props, scripts[lang])}
        />
      )),
    )}
    {/* Long-form trial (16:9, 2560x1440): the UUIDv7 long video's cold hook. */}
    <Composition id="long-03-hook" component={LongHook} width={LW} height={LH} fps={FPS} durationInFrames={HOOK_FRAMES} />
    {[...G1_COMPS, ...G2_COMPS, ...G3_COMPS].map((c) => (
      <Composition key={c.id} id={c.id} component={c.component} width={LW} height={LH} fps={FPS} durationInFrames={c.frames} />
    ))}
    <Still id="long-03-thumb" component={LongThumb} width={TW} height={TH} />
    <Still id="01-short1-thumb" component={payloadThumb1} width={W} height={H} />
    <Still id="01-short2-thumb" component={payloadThumb2} width={W} height={H} />
    <Still id="02-short1-thumb" component={extractThumb1} width={W} height={H} />
    <Still id="03-short1-thumb" component={uuidThumb1} width={W} height={H} />
    <Still id="03-short2-thumb" component={uuidThumb2} width={W} height={H} />
    <Still id="04-short1-thumb" component={rtThumb1} width={W} height={H} />
    <Still id="04-short2-thumb" component={rtThumb2} width={W} height={H} />
    <Still id="05-short1-thumb" component={aiThumb1} width={W} height={H} />
  </>
);
