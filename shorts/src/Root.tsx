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
import { opening2 as aiOpening2 } from "./shorts/05-ai-review/script2";
import { SCENES_A as aiProtoA, SCENES_B as aiProtoB } from "./shorts/05-ai-review/Short2";
import { SCENES_C as aiProtoC, SCENES2 as aiScenes2 } from "./shorts/05-ai-review/ShortC";
import { short2 as aiShort2 } from "./shorts/05-ai-review/script2";
import { Thumbnail2 as aiThumb2 } from "./shorts/05-ai-review/Thumbnail2";
import { short1 as sagaShort1 } from "./shorts/06-saga-compensation/script";
import { SCENES1 as sagaScenes1 } from "./shorts/06-saga-compensation/Short1";
import { Thumbnail as sagaThumb1 } from "./shorts/06-saga-compensation/Thumbnail";
import { short2 as sagaShort2 } from "./shorts/06-saga-compensation/script2";
import { SCENES2 as sagaScenes2 } from "./shorts/06-saga-compensation/Short2";
import { Thumbnail2 as sagaThumb2 } from "./shorts/06-saga-compensation/Thumbnail2";
import { short3 as sagaShort3 } from "./shorts/06-saga-compensation/script3";
import { SCENES3 as sagaScenes3 } from "./shorts/06-saga-compensation/Short3";
import { Thumbnail3 as sagaThumb3 } from "./shorts/06-saga-compensation/Thumbnail3";
import { short1 as bloatShort1 } from "./shorts/08-table-bloat/script";
import { SCENES1 as bloatScenes1 } from "./shorts/08-table-bloat/Short1";
import { Thumbnail as bloatThumb1 } from "./shorts/08-table-bloat/Thumbnail";
import { short2 as bloatShort2 } from "./shorts/08-table-bloat/script2";
import { SCENES2 as bloatScenes2 } from "./shorts/08-table-bloat/Short2";
import { Thumbnail2 as bloatThumb2 } from "./shorts/08-table-bloat/Thumbnail2";

import { Follow } from "./components/Follow";
import { HOOK_FRAMES, LH, LongHook, LW } from "./long/03-uuid-keys/Hook";
import { LongThumb, TH, TW } from "./long/03-uuid-keys/Thumb";
import { TH3, ThumbA, ThumbB, TW3 } from "./long/03-uuid-keys/Thumb3D";
import { TH2, ThumbC, ThumbD, TW2 } from "./long/03-uuid-keys/Thumb2D";
import { G1_COMPS } from "./long/03-uuid-keys/g1";
import { G2_COMPS } from "./long/03-uuid-keys/g2";
import { G3_COMPS } from "./long/03-uuid-keys/g3";
import { L01_SCENES, L01_TOTAL, LongFull as L01Full } from "./long/01-payload";
import { Thumb as L01Thumb, TH as L01TH, TW as L01TW } from "./long/01-payload/Thumb";

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
  { id: "05-short2", scripts: aiShort2, scenes: aiScenes2 },
  { id: "06-short1", scripts: sagaShort1, scenes: sagaScenes1 },
  { id: "06-short2", scripts: sagaShort2, scenes: sagaScenes2 },
  { id: "06-short3", scripts: sagaShort3, scenes: sagaScenes3 },
  { id: "07-short1", scripts: bloatShort1, scenes: bloatScenes1 },
  { id: "07-short2", scripts: bloatShort2, scenes: bloatScenes2 },
  // Visual prototypes for week 3 "The 14x cliff" opening: A = 2D upgraded, B = 3D.
  { id: "03-protoA", scripts: uuidOpening, scenes: uuidProtoA },
  { id: "03-protoB", scripts: uuidOpening, scenes: uuidProtoB },
  // Week 5 "The checklist fix" opening (Lessons rule 14): A = PR stacks, B = review feed.
  { id: "05-protoA", scripts: aiOpening2, scenes: aiProtoA },
  { id: "05-protoB", scripts: aiOpening2, scenes: aiProtoB },
  { id: "05-protoC", scripts: aiOpening2, scenes: aiProtoC },
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
    {/* The closing follow scene on its own, for checking it. */}
    <Composition id="follow-card" component={Follow} width={W} height={H} fps={FPS} durationInFrames={90} />
    {/* Long-form trial (16:9, 2560x1440): the UUIDv7 long video's cold hook. */}
    <Composition id="long-03-hook" component={LongHook} width={LW} height={LH} fps={FPS} durationInFrames={HOOK_FRAMES} />
    {[...G1_COMPS, ...G2_COMPS, ...G3_COMPS].map((c) => (
      <Composition key={c.id} id={c.id} component={c.component} width={LW} height={LH} fps={FPS} durationInFrames={c.frames} />
    ))}
    {L01_SCENES.map((c) => (
      <Composition key={c.id} id={c.id} component={c.component} width={LW} height={LH} fps={FPS} durationInFrames={c.frames} />
    ))}
    <Still id="long-01-thumb" component={L01Thumb} width={L01TW} height={L01TH} />
    <Composition id="long-01-full" component={L01Full} width={LW} height={LH} fps={FPS} durationInFrames={L01_TOTAL} />
    <Still id="long-03-thumb" component={LongThumb} width={TW} height={TH} />
    <Composition id="long-03-thumbA" component={ThumbA} width={TW3} height={TH3} fps={FPS} durationInFrames={300} />
    <Composition id="long-03-thumbB" component={ThumbB} width={TW3} height={TH3} fps={FPS} durationInFrames={300} />
    <Still id="long-03-thumbC" component={ThumbC} width={TW2} height={TH2} />
    <Still id="long-03-thumbD" component={ThumbD} width={TW2} height={TH2} />
    <Still id="01-short1-thumb" component={payloadThumb1} width={W} height={H} />
    <Still id="01-short2-thumb" component={payloadThumb2} width={W} height={H} />
    <Still id="02-short1-thumb" component={extractThumb1} width={W} height={H} />
    <Still id="03-short1-thumb" component={uuidThumb1} width={W} height={H} />
    <Still id="03-short2-thumb" component={uuidThumb2} width={W} height={H} />
    <Still id="04-short1-thumb" component={rtThumb1} width={W} height={H} />
    <Still id="04-short2-thumb" component={rtThumb2} width={W} height={H} />
    <Still id="05-short1-thumb" component={aiThumb1} width={W} height={H} />
    <Still id="05-short2-thumb" component={aiThumb2} width={W} height={H} />
    <Still id="06-short1-thumb" component={sagaThumb1} width={W} height={H} />
    <Still id="06-short2-thumb" component={sagaThumb2} width={W} height={H} />
    <Still id="06-short3-thumb" component={sagaThumb3} width={W} height={H} />
    <Still id="07-short1-thumb" component={bloatThumb1} width={W} height={H} />
    <Still id="07-short2-thumb" component={bloatThumb2} width={W} height={H} />
  </>
);
