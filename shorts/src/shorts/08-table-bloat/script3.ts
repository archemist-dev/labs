import type { Beat } from "../../lib/track";

// Week 7 Short "The search that made the database read-only" (Your Table Grows While Nobody Inserts; lab 08-table-bloat), v2 2026-11-25.
// hook: story (the result first, the turn second, rule 7). No real metrics from the story: the one number is the lab's
// (1.8 million dead rows in an hour, data.json). No punchline. Ends on the follow line.
// EN only. Text follows the ElevenLabs take (v4, Javlon's voice, 1.0x).
export const short3: Record<"en", Beat[]> = {
  en: [
    { scene: "hook", text: "An admin {search}search once made a database {readonly}read-only. It only read data, and it stopped every {write}write.", hold: 2.2 },
    { scene: "search", text: "The search filtered on columns with no {index}index, so it ran for {minutes}minutes.", hold: 2.0 },
    {
      scene: "updates",
      text: "Meanwhile, orders kept {changing}changing. Each update leaves a dead {row}row, and cleanup can't delete it while that search is still {running}running.",
      hold: 2.2,
    },
    { scene: "grow", text: "So the tables {grew}grew, and the disk {filled}filled.", hold: 2.0 },
    {
      scene: "alter",
      text: "Then a schema change needed room to {copy}copy a table. There was {none}none, so the managed database went {readonly}read-only.",
      hold: 2.4,
    },
    { scene: "test", text: "In my test, one slow read left {n}1.8 million dead rows in an {hour}hour.", hold: 2.4 },
    { scene: "fix", text: "The fix: {index}index the columns your filters use, and limit how long a search may {run}run.", hold: 2.6 },
    { scene: "follow", text: "Follow for one tested architecture decision a week." },
  ],
};
