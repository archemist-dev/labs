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
    { scene: "production", text: "It was fine {yesterday}yesterday.", hold: 0.4, minScene: 0 },
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

// Week 3 Short "Where the next row lands", remade 2026-11-06 (master note): opens on Short 1's closing question,
// the 14x in the second sentence; story turn "the index outgrew memory"; Production (Brian) before the numbers;
// page fill 70% vs 90%, then index 29% bigger. Text follows the take (work-w3s2/s2.txt, eleven_v4). EN only.
export const short2: Record<"en", Beat[]> = {
  en: [
    { scene: "question", text: "Same {size}size. Same {unique}uniqueness. So why does a random UUID insert {x14}14 times slower?", hold: 1.4 },
    { scene: "lands", text: "It's not the {id}ID. It's where it {lands}lands.", hold: 1.2 },
    { scene: "story", text: "A food-delivery platform picked random {uuids}UUIDs for its orders. The {right}right call, at first." },
    { scene: "story", text: "Then the {index}index outgrew {memory}memory.", hold: 1.0 },
    { scene: "production", text: "Every query was {green}green. Inserts still slowed down.", hold: 0.6, minScene: 0 },
    {
      scene: "fill",
      text: "In my test, random {v4fill}pages ended 70% full. Time-ordered, {v7fill}90%. Same {bytes}16 bytes, a {big}29% bigger index.",
      hold: 1.8,
    },
    {
      scene: "split",
      text: "Keys are kept {sorted}sorted, in pages. A random key belongs {anywhere}anywhere, so full pages {split}split to fit it. Less of the index fits in {mem}memory, and inserts wait on the {disk}disk.",
      hold: 1.4,
    },
    { scene: "v7", text: "UUID v7 puts the {time}time first, so every new ID lands on the {last}last page, already in {inmem}memory.", hold: 1.6 },
    { scene: "end", text: "A primary key is a write {pattern}pattern, not just a name.", hold: 1.8 },
  ],
};
