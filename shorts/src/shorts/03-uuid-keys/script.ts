import type { Beat } from "../../lib/track";

// Visual prototype: the first ~15 s of week 3 Short "The 14x cliff" (remade 2026-11-04 to Brand/Lessons.md rule 7:
// the turn is the second sentence, the numbers land by about 5 s). Silent, estimated pace, until the voice is recorded.
// The same beats drive both versions: protoA (2D upgraded) and protoB (3D).
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
