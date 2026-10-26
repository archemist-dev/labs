import React from "react";
import { Composition, Still } from "remotion";
import { Shell, type ShortProps } from "./components/Shell";
import { loadShort } from "./lib/load";
import type { Beat } from "./lib/track";
import { FPS, H, W } from "./theme";
import { short1 as payloadShort1 } from "./shorts/01-payload-encoding/script";
import { SCENES as payloadScenes1 } from "./shorts/01-payload-encoding/Short1";
import { Thumbnail as payloadThumb1 } from "./shorts/01-payload-encoding/Thumbnail";
import { short1 as extractShort1 } from "./shorts/02-extract-first/script";
import { SCENES as extractScenes1 } from "./shorts/02-extract-first/Short1";

// One entry per Short; each language becomes its own composition, e.g. "02-short1-uz".
const LIST: { id: string; scripts: Record<string, Beat[]>; scenes: Record<string, React.FC> }[] = [
  { id: "01-short1", scripts: payloadShort1, scenes: payloadScenes1 },
  { id: "02-short1", scripts: extractShort1, scenes: extractScenes1 },
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
    <Still id="01-short1-thumb" component={payloadThumb1} width={W} height={H} />
  </>
);
