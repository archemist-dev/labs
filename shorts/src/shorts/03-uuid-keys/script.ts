import type { Beat } from "../../lib/track";

// Week 3 Short "The 14x cliff", remade 2026-11-04 to Brand/Lessons.md rules 7-8 (the turn is the second sentence,
// the numbers land by about 5 s, one punchline). EN only (UZ and RU paused). Text follows the recorded take:
// Javlon's cloned voice on ElevenLabs eleven_v4 (work-w3/s1.txt), Production's line (Brian) before the cheap fixes.
// Rendered in 3D (Short1.tsx); the shared motion and data live in sim.ts and data.json.
export const short1: Record<"en", Beat[]> = {
  en: [
    { scene: "race", text: "Your UUID primary key works fine {today}today. Until the table {grows}grows." },
    {
      scene: "race",
      text: "In my test, at {ten}10 million rows, a random UUID inserted {slow}6,600 rows a second. A time-ordered one, {fast}93,000. {x14}14 times faster.",
      hold: 1.6,
    },
    { scene: "ids", text: "{same}Same rows, same {pg}Postgres. Only the {id}ID changed.", hold: 1.6 },
    { scene: "curve", text: "At {m1}1 million rows, you'd never notice. It hides until the {index}index outgrows {memory}memory.", hold: 1.6 },
    { scene: "production", text: "It was fine {yesterday}yesterday.", hold: 1.0 },
    { scene: "fixes", text: "And the {cheap}cheap fixes? {room}Room on each page? No {nohelp}help. A separate random {public}public ID? The same {cliff}cliff.", hold: 1.6 },
    { scene: "take", text: "So here's my take. IDs made {outside}outside the database? Use {v7}UUID v7, not v4. Only the {only}database makes IDs? A plain {bigint}big int counter.", hold: 1.8 },
    { scene: "end", text: "Same {size}size, same uniqueness. So why is one so {slow2}slow? That's the {next}next video.", hold: 1.5 },
  ],
};

// Visual prototype of the opening (kept for comparison: protoA 2D, protoB 3D).
export const opening: Record<"en", Beat[]> = {
  en: [
    { scene: "race", text: "Your UUID primary key works fine {today}today. Until the table {grows}grows." },
    {
      scene: "race",
      text: "In my test, at {ten}ten million rows, a random UUID inserted {slow}6,600 rows a second. A time-ordered one, {fast}93,000. Fourteen times {x14}faster.",
      hold: 1.8,
    },
    { scene: "index", text: "{same}Same rows, same Postgres. Only the {id}ID changed.", hold: 3 },
  ],
};
