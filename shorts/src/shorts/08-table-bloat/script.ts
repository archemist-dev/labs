import type { Beat } from "../../lib/track";

// Week 7 Short "The read that grows your table" (Your Table Grows While Nobody Inserts; lab 08-table-bloat).
// hook: belief. The week's Shorts experiment (Brand/Lessons.md, Next experiment): repeat the opening that worked best,
// a moving 3D frame of one large object (the orders table) with a belief and its turn. Rule 7: 1.8 million dead rows
// against 1 million orders is the second sentence. No punchline. Ends on the follow line.
// EN only. Text follows the master note (v3, 2026-11-23) until a take is made; then the take wins.
// Numbers: data.json (08-table-bloat/video_data.py asserts them against the raw logs).
export const short1: Record<"en", Beat[]> = {
  en: [
    {
      scene: "hook",
      text: "A {report}report only reads, so it can't hurt your database. I ran a slow report for an {hour}hour. The table got {dead}1.8 million dead rows, more than its {live}1 million real orders.",
      hold: 2.2,
    },
    {
      scene: "updates",
      text: "Meanwhile, orders kept {changing}changing, {rate}500 a second. In Postgres, each update writes a new {copy}copy of the row. The old one is {old}dead, and {cleanup}cleanup deletes it.",
      hold: 2.8, // Javlon 2026-11-23: the switch to "blocked" came too fast; the cleanup sweep runs about 1.7 s after "cleanup"
    },
    {
      scene: "blocked",
      text: "But my report started at {six}six, and needs the table as it was {then}then. So cleanup ran {n}235 times, and deleted {nothing}nothing.",
      hold: 2.2,
    },
    { scene: "after", text: "The report {ended}ended, but the table didn't {shrink}shrink.", hold: 2.0 },
    {
      scene: "fix",
      text: "The {fix}fix: make Postgres stop any {query}query, or idle {idle}transaction, after sixty {sixty}seconds. In a ten-minute test, that kept dead rows at about {n}18,000, instead of {was}300,000.",
      hold: 2.6,
    },
    { scene: "follow", text: "Follow for one tested architecture decision a week." },
  ],
};
